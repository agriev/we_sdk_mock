#!/usr/bin/env bash

set -e

key_value_store=$1
image=$2
state=$3

echo 'Set the previous container as working'
docker-compose run --rm nginx curl -X PUT -d ${state} ${key_value_store} > /dev/null

echo 'Get static files from the previous image'
id=$(docker create ${image}:latest) && docker cp ${id}:/app/build/ . && docker rm -v ${id}

echo 'Remove the new image'
docker tag ${image}:latest ${image}:new
