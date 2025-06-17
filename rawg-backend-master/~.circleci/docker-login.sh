#!/usr/bin/env bash

set -e

docker login -u ${DOCKERHUB_USERNAME} -p ${DOCKERHUB_PASSWORD}
