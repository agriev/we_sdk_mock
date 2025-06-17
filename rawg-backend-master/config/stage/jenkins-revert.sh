#!/usr/bin/env bash

set -e

source config/stage/config.sh

bash config/revert.sh \
    ${port} \
    ${key_value_store} \
    ${nginx_container} \
    ${image} \
    ${blue_upstream} \
    ${blue_compose} \
    ${green_upstream} \
    ${green_compose}
