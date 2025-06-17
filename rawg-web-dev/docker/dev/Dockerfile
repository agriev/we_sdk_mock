FROM node:10

RUN JQ_URL="https://circle-downloads.s3.amazonaws.com/circleci-images/cache/linux-amd64/jq-latest" && \
    curl --silent --show-error --location --fail --retry 3 --output /usr/bin/jq $JQ_URL && \
    chmod +x /usr/bin/jq && jq --version

ADD package.json /app/package.json

# RUN npm install -g yarn

RUN cd /app && yarn --frozen-lockfile && npm install pm2 -g && rm /app/package.json

ADD . /app/

WORKDIR /app

RUN export $(cat docker/production/env | xargs) $(cat docker/dev/env | xargs) && yarn build:prod

EXPOSE 4000
