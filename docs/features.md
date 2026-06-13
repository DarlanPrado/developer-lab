# Funcionalidades

[← Voltar ao índice](./README.md)

## Catálogo de recursos

Todo recurso compartilhado deve possuir:

```text
Nome
Descrição
Status
Endpoint
Documentação
Permissões
```

**Exemplo:**

```text
PostgreSQL Dev

Host:
postgres-dev.lab

Porta:
5432

Status:
Online
```

## Dependências

Workspaces podem consumir recursos compartilhados.

**Exemplo:**

```text
Frontend Checkout

Dependências

✓ Backend Dev
✓ PostgreSQL Dev
✓ Redis Dev
```

O sistema exibe automaticamente:

```env
API_URL=https://backend-dev.lab
DB_HOST=postgres-dev.lab
REDIS_HOST=redis-dev.lab
```

## Terminal

O acesso principal será via **terminal web**.

**Stack:**

```text
xterm.js
+
WebSocket
+
docker exec
```

**Fluxo:**

```text
Browser
 ↓
WebSocket
 ↓
docker exec
```

**Benefícios:**

- Sem SSH por container
- Menor consumo de recursos
- Controle centralizado

## SSH (opcional)

SSH será opcional para acesso avançado, administração e casos específicos.

**Arquitetura:**

```text
SSH Gateway
    │
    ▼
Docker Exec
```

Não haverá um `sshd` dentro de cada container.

## Deploy por Git

Cada workspace poderá opcionalmente ser conectado a um repositório.

**Configuração:**

```text
Repository
Branch
Dockerfile
```

**Fluxo:**

```text
GitHub
 ↓
Webhook
 ↓
Build
 ↓
Deploy
```

## Visibilidade

| Nível      | Descrição                              |
|------------|----------------------------------------|
| Public     | Acesso livre                           |
| Restricted | Apenas usuários autorizados            |
| Key Only   | Acesso através de token compartilhado  |
