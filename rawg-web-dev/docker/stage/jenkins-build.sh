#!/usr/bin/env bash

set -e

docker build -f docker/stage/Dockerfile -t rawg-node-stage:new .
docker tag rawg-node-stage:new rawgio/rawg-node:stage-new
docker push rawgio/rawg-node:stage-new

docker build -f docker/stage-nginx/Dockerfile -t rawg-nginx-front-stage:latest .
docker tag rawg-nginx-front-stage:latest rawgio/rawg-nginx-front:stage
docker push rawgio/rawg-nginx-front:stage
