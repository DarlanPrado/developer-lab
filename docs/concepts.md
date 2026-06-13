# Conceitos

[← Voltar ao índice](./README.md)

## Solução

Centralizar recursos compartilhados em um único laboratório.

**Exemplo — cenário proposto:**

```text
Developer Lab

Shared Resources
├ PostgreSQL Dev
├ Redis Dev
├ RabbitMQ Dev
├ Backend Dev
└ Mailpit

Workspaces
├ Frontend Checkout
├ POC OAuth
├ Curso Nuxt
└ Teste IA
```

Os desenvolvedores passam a **consumir recursos existentes** ao invés de recriá-los localmente.

## Shared Resources

Recursos permanentes compartilhados entre equipes.

**Exemplos:**

- PostgreSQL
- Redis
- RabbitMQ
- MinIO
- Mailpit
- APIs internas
- Serviços de autenticação

**Características:**

- Longa duração
- Compartilhados
- Catálogo centralizado
- Controle de acesso

## Workspaces

Ambientes isolados destinados a desenvolvimento, testes ou experimentação.

**Exemplos:**

- Frontend Checkout
- Feature Pix
- POC IA
- Curso NestJS

**Características:**

- Temporários
- Isolados
- Podem possuir dependências
- Possuem limites de recursos

## Templates

Modelos reutilizáveis para criação rápida de workspaces.

**Exemplos:**

- Nuxt Starter
- Fastify Starter
- NestJS Starter
- Laravel Starter
- PostgreSQL Sandbox
