#!/usr/bin/env bash

set -e

# https://blog.jondh.me.uk/2018/04/strategies-for-docker-caching-in-circleci/
docker build -f docker/stage/Dockerfile --tag ${CIRCLE_BRANCH} . | grep '\-\-\->' | grep -v 'Using cache' | sed -e 's/[ >-]//g' > /tmp/layers.txt
mkdir -p /tmp/docker-caches
docker save $(cat /tmp/layers.txt) | gzip > /tmp/docker-caches/${CIRCLE_PROJECT_REPONAME}.tar.gz
