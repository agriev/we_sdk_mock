#!/usr/bin/env bash

set -e

source docker/dev/config.sh

docker pull rawgio/rawg-nginx-front:dev
docker pull rawgio/rawg-node:dev-new
docker tag rawgio/rawg-node:dev-new ${image}:new

cp docker/dev/docker-compose.yml ./
cp docker/production/env ./
cp docker/dev/env ./env_dev

bash docker/deploy.sh \
    ${port} \
    ${key_value_store} \
    ${nginx_container} \
    ${image} \
    ${blue_upstream} \
    ${blue_compose} \
    ${green_upstream} \
    ${green_compose}
