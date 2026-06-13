# Developer Lab

Bem-vindo à documentação de uso da plataforma **Developer Lab**.

O Developer Lab é um laboratório centralizado onde equipes de desenvolvimento podem consumir recursos compartilhados e criar ambientes isolados (workspaces) sem precisar configurar toda a infraestrutura localmente.

## O que você pode fazer

- **Consumir recursos compartilhados** — PostgreSQL, Redis, RabbitMQ, MinIO e outros serviços já disponíveis no laboratório
- **Criar workspaces** — ambientes isolados em containers Docker para desenvolvimento, testes ou POCs
- **Acessar terminal web** — shell direto no container do workspace via browser
- **Visualizar logs e dependências** — acompanhar o estado do ambiente e variáveis geradas automaticamente

## Conceitos principais

| Conceito | Descrição |
|----------|-----------|
| **Recurso** | Serviço compartilhado permanente (ex.: banco de dados, fila, storage) |
| **Workspace** | Ambiente temporário e isolado do desenvolvedor |
| **Template** | Modelo reutilizável para criar workspaces rapidamente |
| **Dependência** | Vínculo entre um workspace e os recursos que ele consome |

## Guias

- [Primeiros passos](/docs/primeiros-passos) — login, navegação e perfil
- [Recursos](/docs/recursos) — catálogo e dependências
- [Workspaces](/docs/workspaces) — criar, gerenciar e usar o terminal
- [Permissões](/docs/permissoes) — papéis globais e por workspace
- [Administração](/docs/administracao) — gestão da plataforma (admin)
