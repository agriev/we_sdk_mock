#!/usr/bin/env bash

set -e

port=4000
key_value_store=http://consul:8500/v1/kv/deploy/frontend-dev
nginx_container=rawg-nginx-front-dev
image=rawg-node-dev

blue_upstream=http://blue
blue_compose=node

green_upstream=http://green
green_compose=node-temp
