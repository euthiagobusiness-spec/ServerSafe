#!/usr/bin/env bash
set -euo pipefail

echo "ServerSafe Infrastructure v1 — bootstrap template"
if [ "${SERVERSAFE_INFRA_ALLOW_BOOTSTRAP:-0}" != "1" ]; then
  echo "NOT_IMPLEMENTED: defina SERVERSAFE_INFRA_ALLOW_BOOTSTRAP=1 após revisão humana e especificação da VM."
  exit 2
fi

echo "NOT_IMPLEMENTED: faltam versão Ubuntu, usuário, política SSH, discos e portas aprovadas."
exit 2
