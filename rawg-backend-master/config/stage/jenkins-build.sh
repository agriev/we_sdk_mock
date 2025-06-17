#!/usr/bin/env bash

set -e

docker build -f config/Dockerfile -t rawg-web-stage:new .
docker tag rawg-web-stage:new rawgio/rawg-web:stage-new
docker push rawgio/rawg-web:stage-new

docker build -f config/stage-nginx/Dockerfile -t rawg-nginx-stage:latest .
docker tag rawg-nginx-stage:latest rawgio/rawg-nginx:stage
docker push rawgio/rawg-nginx:stage
