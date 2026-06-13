# Arquitetura

[← Voltar ao índice](./README.md)

## Visão geral

```text
Internet
    │
    ▼
 Traefik
    │
    ▼
 API
    │
    ├── SQLite
    ├── Docker Engine
    ├── Git Worker
    └── Terminal Service
```

## Diagrama de componentes

```mermaid
flowchart TD
    Internet --> Traefik
    Traefik --> API["API (Fastify)"]
    API --> SQLite
    API --> Docker["Docker Engine"]
    API --> GitWorker["Git Worker"]
    API --> TerminalService["Terminal Service (WS)"]
    TerminalService --> DockerExec["docker exec"]
    Traefik --> WorkspaceContainers["Workspace Containers"]
    Traefik --> SharedContainers["Shared Resource Containers"]
```

## Fluxo Terminal e API

```mermaid
flowchart LR
    Browser -->|WebSocket| TerminalService
    TerminalService -->|docker exec| Container
    Browser -->|HTTP| API
    API -->|"Docker SDK"| Docker
```

## Tecnologias

| Camada     | Tecnologia | Motivo                                      |
|------------|------------|---------------------------------------------|
| Backend    | Fastify    | Leve, rápido, excelente integração com Docker |
| Frontend   | Nuxt       | Dashboard, catálogo, workspaces, logs, terminal, admin |
| Banco      | SQLite     | Simples, sem manutenção, baixo consumo      |
| Proxy      | Traefik    | Integração nativa com Docker, rotas dinâmicas, HTTPS |
| Containers | Docker     | Simplicidade, baixo overhead, amplamente conhecido |

## Rede Docker (recomendado)

- Cada **workspace** recebe sua própria Docker network, evitando conflitos de porta e vazamento entre ambientes.
- **Shared Resources** ficam em uma rede `lab-shared`, acessível por todos os workspaces autorizados.
