#!/usr/bin/env bash

set -e

state=$1
upstream=$2
compose=$3
key_value_store=$4
nginx_container=$5
image=$6
old_state=$7
current_state=$(docker-compose run --rm nginx curl ${key_value_store}?raw)

pid_was=$(docker exec ${nginx_container} pidof nginx 2> /dev/null || echo '-')
echo "Activate the ${state} container, old Nginx pids: ${pid_was}"

echo "Set the ${state} container as working"
docker-compose run --rm nginx curl -X PUT -d ${state} ${key_value_store} > /dev/null

if [[ ${pid_was} != '-' ]]
then
    echo 'Check that config was reload'
    count=0
    while [ 1 ]
    do
        lines=$(docker exec ${nginx_container} nginx -T | grep ${upstream} | wc -l | xargs)
        if [[ ${lines} == '0' ]]
        then
            count=$((count + 1))
            if [[ ${count} -eq 10 ]]
            then
                echo 'ERROR! Timeout'
                bash config/reset.sh ${key_value_store} ${image} ${old_state} ${compose}
                exit 1
            fi
            echo 'Wait for the new configuration'
            sleep 3
        else
            echo 'The new configuration was loaded'
            break
        fi
    done

    if [[ ${current_state} != ${state} ]]
    then
        echo 'Check that Nginx was reload'
        count=0
        while [ 1 ]
        do
            pid=$(docker exec ${nginx_container} pidof nginx)
            if [[ ${pid} == ${pid_was} ]]
            then
                count=$((count + 1))
                if [[ ${count} -eq 10 ]]
                then
                    echo 'ERROR! Timeout'
                    bash config/reset.sh ${key_value_store} ${image} ${old_state} ${compose}
                    exit 1
                fi
                echo "Wait for reloading, pids: ${pid}"
                sleep 3
            else
                echo "Nginx was reloaded, new pids: ${pid}"
                break
            fi
        done
    fi
fi
