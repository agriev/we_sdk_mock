#!/usr/bin/env bash

set -e

# https://blog.jondh.me.uk/2018/04/strategies-for-docker-caching-in-circleci/
set +o pipefail
if [ -f /tmp/docker-caches/${CIRCLE_PROJECT_REPONAME}.tar.gz ]; then
    gunzip -c /tmp/docker-caches/${CIRCLE_PROJECT_REPONAME}.tar.gz | docker load;
    docker images;
fi
