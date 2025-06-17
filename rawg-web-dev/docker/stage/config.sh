#!/usr/bin/env bash

set -e

port=4000
key_value_store=http://consul:8500/v1/kv/deploy/frontend-stage
nginx_container=rawg-nginx-front-stage
image=rawg-node-stage

blue_upstream=http://blue
blue_compose=node

green_upstream=http://green
green_compose=node-temp
