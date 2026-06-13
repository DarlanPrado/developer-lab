# Developer Lab Platform

Plataforma self-hosted para equipes compartilharem ambientes, serviços e recursos de desenvolvimento.

## Stack

- **ORM**: Drizzle ORM + `@libsql/client` (SQLite em arquivo local)
- **Frontend**: Nuxt 3 + Nuxt UI + Pinia
- **Infra**: Docker + Traefik

## Pré-requisitos

- Node.js 20+
- pnpm 10+
- Docker (opcional, para workspaces e terminal)

## Desenvolvimento

```bash
cp .env.example .env
pnpm install
pnpm dev
```

- API: http://localhost:3001
- Web: http://localhost:3000

O primeiro usuário registrado via `/auth/register` torna-se **admin**.

## Scripts

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Inicia API e Web em paralelo |
| `pnpm dev:api` | Apenas API |
| `pnpm dev:web` | Apenas frontend |
| `pnpm build` | Build de todos os pacotes |
| `pnpm test` | Testes da API |
| `pnpm db:push` | Sincroniza schema SQLite |

## Docker Compose

```bash
docker compose up -d
```

## Documentação

Consulte [docs/README.md](./docs/README.md) para a visão completa do projeto.
