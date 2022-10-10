#/bin/bash

set -eo pipefail

VERSION=0.1.0

yarn install && \
  yarn build && \
  jupyter labextension build  && \
  zip -r perspective-mime.zip labextension && \
  aws s3 cp perspective-mime.zip s3://joom-analytics-deploy/platform/perspective-mime/perspective-mime-$VERSION.zip
