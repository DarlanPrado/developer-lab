#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/DarlanPrado/developer-lab.git"
TARGET="${1:-$HOME/developer-lab}"

install_git() {
  if command -v git >/dev/null; then
    return
  fi

  echo ">> Instalando git..."
  sudo apt-get update -qq
  sudo apt-get install -y git
}

install_docker() {
  if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
    return
  fi

  echo ">> Instalando Docker e Docker Compose..."
  sudo apt-get update -qq
  sudo apt-get install -y ca-certificates curl gnupg

  if ! command -v docker >/dev/null; then
    sudo apt-get install -y docker.io
    sudo systemctl enable --now docker
  fi

  if ! docker compose version >/dev/null 2>&1; then
    sudo apt-get install -y docker-compose-v2 || sudo apt-get install -y docker-compose-plugin
  fi

  if ! groups "$USER" | grep -q '\bdocker\b'; then
    sudo usermod -aG docker "$USER"
    echo ">> Usuário adicionado ao grupo docker (vale após re-login ou newgrp docker)."
  fi
}

docker_cmd() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
    return
  fi

  if sudo docker info >/dev/null 2>&1; then
    sudo docker "$@"
    return
  fi

  echo "Erro: Docker não responde. Tente: newgrp docker"
  exit 1
}

install_git
install_docker

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

echo ">> Subindo containers (build pode demorar alguns minutos)..."
docker_cmd compose up -d --build api web

IP="$(hostname -I | awk '{print $1}')"
echo ""
echo "Developer Lab no ar em: http://${IP}"
echo "Login padrão: admin@lab.local / admin123"
