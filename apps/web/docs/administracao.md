# Administração

Seção exclusiva para usuários com papel global **Admin**.

Acesse via menu **Administração** ou pelas rotas `/admin/*`.

## Visão geral

`/admin` — painel resumido da plataforma.

## Usuários

`/admin/users` — criar e listar contas.

Ao criar um usuário, defina:

- Nome e email
- Senha inicial
- Papel (`admin` ou `user`)

## Times

`/admin/teams` — organizar usuários em equipes para controle de acesso colaborativo.

## Recursos

`/admin/resources` — cadastrar serviços compartilhados do laboratório.

Campos principais:

- **Nome** — ex.: "PostgreSQL Dev"
- **Tipo** — postgresql, redis, rabbitmq, minio, mailpit, api, other
- **Endpoint** — URL de conexão
- **Visibilidade** — public, restricted, key_only
- **envPrefix** — prefixo opcional para variáveis de ambiente

Após cadastrado, o recurso aparece no catálogo (`/resources`) e pode ser associado a workspaces.

## Templates

`/admin/templates` — modelos reutilizáveis para criação rápida de workspaces (ex.: Nuxt Starter, Fastify Starter).

## Boas práticas

- Cadastre recursos antes de orientar a equipe a criar workspaces com dependências
- Promova a admin apenas contas que precisam gerenciar a plataforma
- Monitore o status dos recursos no catálogo — endpoints offline aparecem como `offline` ou `degraded`
