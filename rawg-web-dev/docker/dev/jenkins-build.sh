#!/usr/bin/env bash

set -e

docker build -f docker/dev/Dockerfile -t rawg-node-dev:new .
docker tag rawg-node-dev:new rawgio/rawg-node:dev-new
docker push rawgio/rawg-node:dev-new

docker build -f docker/dev-nginx/Dockerfile -t rawg-nginx-front-dev:latest .
docker tag rawg-nginx-front-dev:latest rawgio/rawg-nginx-front:dev
docker push rawgio/rawg-nginx-front:dev
