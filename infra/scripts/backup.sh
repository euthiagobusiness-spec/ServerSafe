#!/usr/bin/env bash
set -euo pipefail

echo "ServerSafe Infrastructure v1 — backup template"
if [ "${SERVERSAFE_INFRA_ALLOW_BACKUP:-0}" != "1" ]; then
  echo "NOT_IMPLEMENTED: nenhum backup real será executado nesta fase."
  exit 2
fi

echo "NOT_IMPLEMENTED: defina destino criptografado, retenção, chaves e procedimento de restore testado."
exit 2
