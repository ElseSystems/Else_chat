#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! docker info >/dev/null 2>&1; then
  echo "Docker não está rodando. Abrindo Docker Desktop..."
  open -a Docker || true
  echo "Aguarde o Docker iniciar e rode de novo: ./start-local.sh"
  exit 1
fi

echo "Subindo AtendeChat (build pode demorar na primeira vez)..."
docker compose up --build -d

echo ""
echo "Aguardando serviços..."
for i in $(seq 1 60); do
  if curl -sf http://localhost:3000 >/dev/null 2>&1 || curl -sf http://localhost:3000/ >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

echo ""
echo "AtendeChat local:"
echo "  Frontend: http://localhost:3001"
echo "  Backend:  http://localhost:3000"
echo ""
echo "Login seed padrão:"
echo "  Email: admin@admin.com"
echo "  Senha: 123456"
echo ""
echo "Logs: docker compose logs -f backend"
