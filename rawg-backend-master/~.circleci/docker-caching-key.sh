#!/usr/bin/env bash

set -e

# https://anonoz.github.io/tech/2018/06/17/circleci-docker-caching.html
BASE_IMAGE_NAMES=$(grep "^FROM" config/Dockerfile | cut -d' ' -f2 | uniq)

cp config/Dockerfile docker-caching-key.txt

for n in ${BASE_IMAGE_NAMES}; do
    if grep -q ':' <<< "$n"; then
        REPOSITORY=$(cut -d':' -f1 <<< "$n")
        TAG=$(cut -d':' -f2 <<< "$n")
    else
        REPOSITORY=${n}
        TAG="latest"
    fi

    # If there is no slash in the repo name, it is an official image,
    # we will need to prepend library/ to it
    if ! grep -q '/' <<< "$REPOSITORY"; then
        REPOSITORY="library/$REPOSITORY"
    fi

    # Source: https://stackoverflow.com/questions/41808763/how-to-determine-the-docker-image-id-for-a-tag-via-docker-hub-api
    TOKEN=$(curl -s "https://auth.docker.io/token?service=registry.docker.io&scope=repository:$REPOSITORY:pull" | jq -r .token)
    IMAGE_DIGEST=$(curl -s -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.docker.distribution.manifest.v2+json" https://index.docker.io/v2/${REPOSITORY}/manifests/$TAG | jq -r .config.digest)

    # Append the newfound IDs to form the key
    echo ${IMAGE_DIGEST} >> docker-caching-key.txt
done
