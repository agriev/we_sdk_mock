#!/usr/bin/env bash

set -e

source docker/production/config.sh

docker build -f docker/production/Dockerfile -t ${image}:new .
docker tag ${image}:new rawgio/${image}:production-new
docker push rawgio/${image}:production-new

docker build -f docker/production-nginx/Dockerfile -t rawgio/${nginx_container}:latest .
docker push rawgio/${nginx_container}:latest

mkdir -p /home/docker/frontend
cp docker/production/docker-compose.yml /home/docker/frontend
cp docker/production/env /home/docker/frontend
cp -r docker /home/docker/frontend
cd /home/docker/frontend

bash docker/deploy.sh \
    ${port} \
    ${key_value_store} \
    ${nginx_container} \
    ${image} \
    ${blue_upstream} \
    ${blue_compose} \
    ${green_upstream} \
    ${green_compose}
