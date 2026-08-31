#!/usr/bin/env bash
set -euo pipefail

echo "ServerSafe Infrastructure v1 — restore template"
if [ "${SERVERSAFE_INFRA_ALLOW_RESTORE:-0}" != "1" ]; then
  echo "NOT_IMPLEMENTED: nenhum restore real será executado nesta fase."
  exit 2
fi

echo "NOT_IMPLEMENTED: exige origem, checksum, ambiente isolado e aprovação explícita."
exit 2
