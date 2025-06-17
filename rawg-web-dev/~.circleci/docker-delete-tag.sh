#!/usr/bin/env bash

set -e

if [[ ${CIRCLE_BRANCH} == 'dev' || ${CIRCLE_BRANCH} == 'master' ]]
then
    exit 0
fi

TOKEN=`curl -s -H "Content-Type: application/json" -X POST \
    -d '{"username": "'${DOCKERHUB_USERNAME}'", "password": "'${DOCKERHUB_PASSWORD}'"}' \
    https://hub.docker.com/v2/users/login/ | jq -r .token`

curl "https://hub.docker.com/v2/repositories/${DOCKERHUB_USERNAME}/${IMAGE}/tags/${CIRCLE_BRANCH}/" \
    -X DELETE \
    -H "Authorization: JWT ${TOKEN}"
