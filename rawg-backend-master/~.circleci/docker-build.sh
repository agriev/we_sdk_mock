#!/usr/bin/env bash

set -e

docker build -f config/Dockerfile -t ${DOCKERHUB_USERNAME}/rawg-web:${CIRCLE_BRANCH}${CIRCLE_WORKFLOW_ID} .
docker push ${DOCKERHUB_USERNAME}/rawg-web:${CIRCLE_BRANCH}${CIRCLE_WORKFLOW_ID}
