#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/DarlanPrado/developer-lab.git"
TARGET="${1:-$HOME/developer-lab}"

if ! command -v git >/dev/null; then
  echo "Erro: git não instalado."
  exit 1
fi

if ! command -v docker >/dev/null; then
  echo "Erro: docker não instalado."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null; then
  echo "Erro: docker compose não disponível."
  exit 1
fi

if [ ! -d "$TARGET/.git" ]; then
  git clone "$REPO" "$TARGET"
else
  git -C "$TARGET" pull --ff-only
fi

cd "$TARGET"

if [ ! -f .env ]; then
  cp .env.example .env
  if command -v openssl >/dev/null; then
    SECRET="$(openssl rand -hex 32)"
    sed -i "s/JWT_SECRET=change-me-in-production/JWT_SECRET=${SECRET}/" .env
  fi
fi

mkdir -p data

cat > docker-compose.override.yml << 'EOF'
services:
  traefik:
    profiles:
      - traefik
  web:
    ports:
      - "80:3000"
EOF

if docker compose version >/dev/null 2>&1; then
  docker compose up -d --build api web
else
  docker-compose up -d --build api web
fi

IP="$(hostname -I | awk '{print $1}')"
echo ""
echo "Developer Lab no ar em: http://${IP}"
echo "Login padrão: admin@lab.local / admin123"
