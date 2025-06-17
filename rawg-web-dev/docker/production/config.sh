#!/usr/bin/env bash

set -e

port=4000
key_value_store=http://consul:8500/v1/kv/deploy/frontend
nginx_container=rawg-nginx-front
image=rawg-node

blue_upstream=http://blue
blue_compose=node

green_upstream=http://green
green_compose=node-temp
