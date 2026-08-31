#!/usr/bin/env bash
set -euo pipefail

echo "ServerSafe Infrastructure v1 — health-check read-only"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
COMPOSE_FILE="$SCRIPT_DIR/../compose/docker-compose.yml"
ENV_FILE="${SERVERSAFE_INFRA_ENV_FILE:-$SCRIPT_DIR/../compose/.env}"

if [ ! -r "$ENV_FILE" ]; then
  ENV_FILE="$SCRIPT_DIR/../compose/.env.example"
  echo "Arquivo de ambiente local não encontrado; usando somente placeholders para validar o Compose."
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker indisponível; health-check não executado."
  exit 2
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose indisponível; health-check não executado."
  exit 2
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
