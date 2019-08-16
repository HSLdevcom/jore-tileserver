#!/bin/bash
set -e

ORG=${ORG:-hsldevcom}
DOCKER_IMAGE=$ORG/jore-tileserver:latest

docker build --tag=$DOCKER_IMAGE .
docker push $DOCKER_IMAGE
