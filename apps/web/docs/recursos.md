# Recursos

Um **Recurso** é um serviço compartilhado do laboratório — infraestrutura permanente que vários workspaces podem consumir.

## Exemplos

- PostgreSQL Dev
- Redis Dev
- RabbitMQ Dev
- MinIO
- Mailpit
- APIs internas

## O que compõe um recurso

| Campo | Significado |
|-------|-------------|
| Nome | Identificação amigável no catálogo |
| Tipo | `postgresql`, `redis`, `rabbitmq`, `minio`, `mailpit`, `api` ou `other` |
| Endpoint | URL ou host de conexão |
| Status | `online`, `degraded`, `offline` ou `unknown` |
| Visibilidade | `public`, `restricted` ou `key_only` |
| Descrição | Texto explicativo sobre o serviço |

## Catálogo

Acesse **Recursos** no menu (`/resources`) para ver todos os serviços disponíveis.

Cada card exibe nome, tipo, status, endpoint e visibilidade. A plataforma monitora periodicamente o endpoint e atualiza o status automaticamente.

## Visibilidade

| Nível | Comportamento |
|-------|---------------|
| **Public** | Visível e acessível conforme política do laboratório |
| **Restricted** | Apenas usuários autorizados |
| **Key Only** | Acesso via token compartilhado |

## Dependências de workspace

Quando um recurso é associado a um workspace, a plataforma gera variáveis de ambiente automaticamente:

```env
POSTGRESQL_DEV_URL=postgresql://db:5432/lab
POSTGRESQL_DEV_HOST=db
```

O prefixo pode ser customizado pelo administrador via campo **envPrefix**.

## Cadastro (Admin)

Administradores cadastram recursos em **Administração → Recursos** (`/admin/resources`).

Campos obrigatórios: nome, tipo e endpoint.
