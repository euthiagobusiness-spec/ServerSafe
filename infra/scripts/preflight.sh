#!/usr/bin/env bash
set -euo pipefail

echo "ServerSafe Infrastructure v1 — preflight read-only"

if [ -r /etc/os-release ]; then
  . /etc/os-release
  printf 'OS: %s %s\n' "${NAME:-unknown}" "${VERSION_ID:-unknown}"
else
  echo "OS: /etc/os-release indisponível"
fi

printf 'Kernel: %s\n' "$(uname -sr)"
printf 'Architecture: %s\n' "$(uname -m)"
if command -v getconf >/dev/null 2>&1; then
  printf 'CPU count: %s\n' "$(getconf _NPROCESSORS_ONLN)"
else
  echo "CPU count: getconf indisponível"
fi
if [ -r /proc/meminfo ]; then
  printf 'RAM: %s\n' "$(awk '/^MemTotal:/ { print $2 " kB"; exit }' /proc/meminfo)"
else
  echo "RAM: /proc/meminfo indisponível"
fi
printf 'Root filesystem:\n'
df -h /
printf 'Filesystem type:\n'
df -T / 2>/dev/null || true
printf 'User: %s (uid=%s gid=%s)\n' "$(id -un)" "$(id -u)" "$(id -g)"

if command -v docker >/dev/null 2>&1; then
  docker --version
  if docker compose version >/dev/null 2>&1; then
    docker compose version
  else
    echo "Docker Compose: indisponível"
  fi
else
  echo "Docker: indisponível"
fi

if command -v ss >/dev/null 2>&1; then
  echo "Listening TCP sockets:"
  ss -ltn
else
  echo "Port inspection: ss indisponível"
fi

echo "Preflight concluído; nenhum estado foi alterado."
