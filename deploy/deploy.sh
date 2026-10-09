#!/usr/bin/env bash
# Deploy (or roll back to) a frontend image built by GitHub Actions:  deploy/deploy.sh <full commit sha>
# The stack itself (compose.prod.yaml, Caddyfile) belongs to the backend repo (../image-gallery, its deploy/deploy.sh).
# This only records the sha as FRONT_TAG in the server's .env, pulls the image and restarts the front service.
set -euo pipefail

SERVER=${DEPLOY_SERVER:-deploy@2.28.193.254}
DIR=${DEPLOY_DIR:-/srv/artai}
SHA=${1:-}

if [[ ! $SHA =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: $0 <full 40-char commit sha>   (an image ghcr.io/sni10/image-gallery-front:<sha> must exist)" >&2
  exit 1
fi

ssh "$SERVER" bash -s -- "$DIR" "$SHA" <<'REMOTE'
set -euo pipefail
cd "$1"
if grep -q '^FRONT_TAG=' .env; then sed -i "s/^FRONT_TAG=.*/FRONT_TAG=$2/" .env; else echo "FRONT_TAG=$2" >> .env; fi
compose() { docker compose -f compose.prod.yaml "$@"; }
compose pull --quiet front
compose up -d front
compose ps --format '{{.Service}}\t{{.Status}}\t{{.Image}}'
REMOTE
