#!/usr/bin/env bash
set -euo pipefail

base_url="${VOXIFY_BASE_URL:-http://localhost:3000}"

curl --fail --silent --show-error \
  --request POST \
  --header "Content-Type: application/json" \
  --data '{}' \
  "${base_url}/api/dev/seed"

echo
