#!/usr/bin/env bash

set -e

source config/stage/config.sh

docker pull rawgio/rawg-nginx:stage
docker pull rawgio/rawg-web:stage-new
docker tag rawgio/rawg-web:stage-new ${image}:new

cp config/stage/docker-compose.yml ./
cp config/stage/help.yml ./
cp config/stage/env ./

cat env backendstage > out && mv out env_web && rm backendstage
mv poxastage env_poxa

bash config/deploy.sh \
    ${port} \
    ${key_value_store} \
    ${nginx_container} \
    ${image} \
    ${blue_upstream} \
    ${blue_compose} \
    ${green_upstream} \
    ${green_compose}
