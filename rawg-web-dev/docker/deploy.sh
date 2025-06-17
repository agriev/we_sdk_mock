#!/usr/bin/env bash

set -e

port=$1
key_value_store=$2
nginx_container=$3
image=$4

blue_upstream=$5
blue_compose=$6
blue_check_url="http://${blue_compose}:${port}/welcome"

green_upstream=$7
green_compose=$8
green_check_url="http://${green_compose}:${port}/welcome"

echo 'Check the current state'
blue_is_run=$(docker exec ${image} echo 'yes' 2> /dev/null || echo 'no')

state='blue'
compose=${blue_compose}
new_state='green'
new_upstream=${green_upstream}
new_compose=${green_compose}
check_url=${green_check_url}
if [[ ${blue_is_run} == 'no' ]]
then
    state='green'
    compose=${green_compose}
    new_state='blue'
    new_upstream=${blue_upstream}
    new_compose=${blue_compose}
    check_url=${blue_check_url}
fi

echo "Create the ${image}:${new_state} image"
docker tag ${image}:new ${image}:${new_state}

echo "Update the ${new_state} container"
docker-compose up -d ${new_compose}
docker-compose run --rm --entrypoint bash ${new_compose} docker/wait-for-it.sh ${new_compose}:${port} --timeout=60

echo "Check the ${new_state} app"
status=$(docker-compose run --rm nginx curl ${check_url} -o /dev/null -Isw '%{http_code}')
if [[ ${status} != '200' ]]
then
    echo "ERROR! Bad HTTP response from the ${new_state} app: ${status}"
    bash docker/reset.sh ${key_value_store} ${image} ${state}
    exit 1
fi

echo 'Get static files from the new image'
id=$(docker create ${image}:new) && docker cp ${id}:/app/build/ . && docker rm -v ${id}

bash docker/activate.sh ${new_state} ${new_upstream} ${key_value_store} ${nginx_container} ${image} ${state}

echo "Set the ${new_state} image as ${state}"
docker tag ${image}:${new_state} ${image}:${state}

if [[ "$(docker images -q ${image}:latest 2> /dev/null)" != '' ]]
then
    echo 'Set the old image as previous'
    docker tag ${image}:latest ${image}:previous
fi

echo 'Set the new image as latest'
docker tag ${image}:new ${image}:latest

echo 'Update all containers'
docker-compose up -d

echo "Stop the ${state} container"
docker-compose stop ${compose}
