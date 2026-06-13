# Visão e Problema

[← Voltar ao índice](./README.md)

## Visão

O **Developer Lab** é uma plataforma self-hosted para equipes de desenvolvimento compartilharem ambientes, serviços e recursos sem a necessidade de executar toda a infraestrutura localmente.

O objetivo **não** é ser um PaaS, um gerenciador de deploys ou um substituto de Kubernetes.

O objetivo é fornecer um **laboratório centralizado** onde desenvolvedores possam:

- Consumir recursos compartilhados
- Criar ambientes temporários
- Colaborar em projetos com controle de acesso
- Operar com baixo custo operacional

## Problema

Em equipes de desenvolvimento é comum que cada desenvolvedor precise executar localmente:

- Backend
- Banco de dados
- Redis
- RabbitMQ
- Elasticsearch
- Serviços auxiliares

Isso gera:

- Alto consumo de recursos
- Ambientes inconsistentes
- Problemas de onboarding
- Tempo perdido com configuração
- Dependências difíceis de manter

**Exemplo — cenário atual:**

```text
Frontend Developer

├ Frontend
├ Backend
├ PostgreSQL
├ Redis
├ RabbitMQ
└ Elasticsearch
```

Na prática, o desenvolvedor frontend normalmente precisa apenas do **frontend**.
