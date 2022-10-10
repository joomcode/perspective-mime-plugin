#/bin/bash

set -eo pipefail

VERSION=0.1.0

yarn install && \
  yarn build && \
  jupyter labextension build  && \
  tar -czvf perspective-mime.tar.gz perspective-mime && \
  aws s3 cp perspective-mime.tar.gz s3://joom-analytics-deploy/platform/perspective-mime/perspective-mime-$VERSION.tar.gz
