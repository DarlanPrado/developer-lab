# Workspaces

Um **Workspace** é um ambiente isolado de desenvolvimento — um container Docker dedicado ao seu projeto, teste ou experimento.

## Características

- Temporário e isolado dos demais workspaces
- Pode ter dependências de recursos compartilhados
- Possui limites de CPU e memória (quando configurados)
- Acessível via terminal web, logs e variáveis de ambiente

## Criar um workspace

1. Acesse **Workspaces** (`/workspaces`)
2. Preencha nome, descrição e imagem Docker (ex.: `node:22-alpine`)
3. Confirme a criação

A plataforma provisiona um container na rede interna do laboratório.

## Ciclo de vida

Na página do workspace (`/workspaces/:key`) você pode:

| Ação | Descrição |
|------|-----------|
| **Iniciar** | Sobe o container parado |
| **Parar** | Interrompe a execução |
| **Reiniciar** | Para e inicia novamente |
| **Terminal** | Abre shell web no container |
| **Logs** | Visualiza saída do container |

Os botões respeitam o status atual — por exemplo, **Iniciar** só fica habilitado quando o workspace está parado.

## Terminal web

O terminal usa **xterm.js** conectado via WebSocket à plataforma, que executa `docker exec` no container.

Acesse em **Terminal** dentro do workspace ou pela rota `/workspaces/:key/terminal`.

## Dependências

Na seção **Dependências** da página do workspace, veja quais recursos compartilhados estão vinculados.

Em **Variáveis de ambiente**, a plataforma lista as URLs e hosts gerados a partir desses recursos — prontos para uso no seu código.

## Associar recursos

Atualmente a associação de recursos a um workspace é feita via API (`PATCH /workspaces/:id` com `resourceIds`). A interface gráfica para isso será adicionada em versões futuras.
