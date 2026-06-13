#!/bin/sh
set -e

mkdir -p /app/data
chown -R lab:lab /app/data

if [ -S /var/run/docker.sock ]; then
  DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
  DOCKER_GROUP=$(getent group "$DOCKER_GID" | cut -d: -f1 || true)

  if [ -z "$DOCKER_GROUP" ]; then
    addgroup -g "$DOCKER_GID" dockerhost
    DOCKER_GROUP=dockerhost
  fi

  addgroup lab "$DOCKER_GROUP" 2>/dev/null || true
fi

exec su-exec lab "$@"
