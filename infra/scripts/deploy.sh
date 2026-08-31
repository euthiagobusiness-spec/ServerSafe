#!/usr/bin/env bash
set -euo pipefail

echo "ServerSafe Infrastructure v1 — deploy template"
if [ "${SERVERSAFE_INFRA_ALLOW_DEPLOY:-0}" != "1" ]; then
  echo "NOT_IMPLEMENTED: nenhum deploy será executado sem autorização operacional explícita."
  exit 2
fi

echo "NOT_IMPLEMENTED: faltam VM, domínio, backup, observabilidade e aprovação de mudança."
exit 2
