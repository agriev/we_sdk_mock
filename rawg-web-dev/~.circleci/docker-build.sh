#!/usr/bin/env bash

set -e

docker build -f docker/stage/Dockerfile -t ${DOCKERHUB_USERNAME}/rawg-node:${CIRCLE_BRANCH} .
docker push ${DOCKERHUB_USERNAME}/rawg-node:${CIRCLE_BRANCH}
