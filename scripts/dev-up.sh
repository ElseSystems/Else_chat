#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "Docker não está rodando. Abra o Docker Desktop e tente de novo."
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Criado .env a partir de .env.example"
fi

docker compose up --build -d
echo ""
echo "Else Chat:"
echo "  Painel:    http://localhost:3000"
echo "  API:       http://localhost:3001/health"
echo "  Evolution: http://localhost:8080"
echo ""
echo "Login demo: admin@demo.com / admin123"
