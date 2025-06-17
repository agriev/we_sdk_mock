#!/usr/bin/env bash

set -e

port=8000
key_value_store=http://consul:8500/v1/kv/deploy/backend
nginx_container=rawg-nginx-stage
image=rawg-web-stage

blue_upstream=http://blue
blue_compose=web

green_upstream=http://green
green_compose=web-temp
