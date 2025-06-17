#!/usr/bin/env bash

set -e

port=$1
key_value_store=$2
nginx_container=$3
image=$4

blue_upstream=$5
blue_compose=$6
blue_check_url="http://${blue_compose}:${port}/"

green_upstream=$7
green_compose=$8
green_check_url="http://${green_compose}:${port}/"

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
docker tag ${image}:previous ${image}:${new_state}

echo "Update the ${new_state} container"
docker-compose up -d ${new_compose}
docker-compose run --rm --entrypoint bash ${new_compose} docker/wait-for-it.sh ${new_compose}:${port} --timeout=60

echo 'Get static files from the previous image'
id=$(docker create ${image}:previous) && docker cp ${id}:/app/build/ . && docker rm -v ${id}

bash docker/activate.sh ${new_state} ${new_upstream} ${key_value_store} ${nginx_container} ${image} ${state}

echo "Set the ${new_state} image as ${state}"
docker tag ${image}:${new_state} ${image}:${state}

echo 'Update all containers'
docker-compose up -d

echo "Stop the ${state} container"
docker-compose stop ${compose}
