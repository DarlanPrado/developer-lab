# Funcionalidades Futuras

[← Voltar ao índice](./README.md)

## Templates avançados

Criação automática de stacks completas.

**Exemplo:**

```yaml
services:
  app:
    image: node:22

  postgres:
    image: postgres

  redis:
    image: redis
```

## Workspace expiration

Encerramento automático de workspaces inativos.

## Snapshots

Salvar e restaurar ambientes.

## Rollback

Retornar para versões anteriores.

## Integração GitHub

- OAuth
- Importação de repositórios
- Configuração automática de webhooks

## Domínios customizados

**Exemplo:**

```text
api.meuprojeto.com
```
