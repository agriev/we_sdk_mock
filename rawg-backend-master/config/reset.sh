#!/usr/bin/env bash

set -e

key_value_store=$1
image=$2
state=$3
bad_compose=$4

echo 'Set the previous container as working'
docker-compose run --rm nginx curl -X PUT -d ${state} ${key_value_store} > /dev/null

echo 'Get the list of previous migrations'
migrations=$(docker run --rm --network backend_backend --env-file env ${image}:latest python /app/project/manage.py showmigrations -p)

echo 'Revert migrations'
echo "${migrations}" | docker-compose run --rm ${bad_compose} manage revert_migrations

echo 'Remove the new image'
docker tag ${image}:latest ${image}:new
