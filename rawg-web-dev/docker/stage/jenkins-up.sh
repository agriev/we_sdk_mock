#!/usr/bin/env bash

set -e

source docker/stage/config.sh

docker pull rawgio/rawg-nginx-front:stage
docker pull rawgio/rawg-node:stage-new
docker tag rawgio/rawg-node:stage-new ${image}:new

cp docker/stage/docker-compose.yml ./
cp docker/production/env ./
cp docker/stage/env ./env_stage

bash docker/deploy.sh \
    ${port} \
    ${key_value_store} \
    ${nginx_container} \
    ${image} \
    ${blue_upstream} \
    ${blue_compose} \
    ${green_upstream} \
    ${green_compose}
