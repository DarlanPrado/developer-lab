# Melhorias e Novas Ideias

[← Voltar ao índice](./README.md)

Sugestões identificadas na análise da arquitetura, para consideração durante o desenvolvimento.

## Arquitetura e infraestrutura

- **Health check automático de Shared Resources** — sondar periodicamente os recursos compartilhados e atualizar o status (Online/Degradado/Offline) sem intervenção manual. Alerta via notificação no dashboard.
- **Rede Docker isolada por workspace** — cada workspace recebe sua própria Docker network. Shared Resources ficam em `lab-shared`, acessível por todas as redes autorizadas.
- **Volume persistente opcional por workspace** — workspaces podem declarar volumes nomeados para persistência de dados entre reinicializações (útil para bancos temporários em POCs).

## Segurança e acesso

- **Tokens de acesso por recurso (Key Only melhorado)** — além do token compartilhado de workspace, permitir tokens com escopo e TTL por recurso individual.
- **Audit log** — registrar ações relevantes (criação/remoção de workspaces, acesso a terminais, deploys) para rastreabilidade.
- **Allowlist de imagens Docker** — admins definem quais imagens Docker são permitidas nos workspaces, evitando uso de imagens não confiáveis.

## Experiência do desenvolvedor

- **`lab.yaml` — configuração por repositório** — arquivo no repositório define automaticamente o workspace (imagem, variáveis, dependências, limites), similar ao `devcontainer.json`. Elimina configuração manual no dashboard.
- **Copy-to-clipboard de connection strings** — na tela de dependências, cada variável de ambiente gerada automaticamente tem botão de copiar.
- **Notificações em tempo real** — WebSocket no frontend para eventos como fim de deploy, workspace expirado, recurso degradado.
- **Preview de ambiente** — quando um workspace expõe uma porta HTTP, o dashboard exibe iframe ou link direto para o preview do serviço.

## Workspaces

- **Workspace como código (WaC)** — exportar/importar a definição completa de um workspace em YAML, permitindo versionamento e reprodutibilidade.
- **Modo sleep** — workspace inativo por N minutos entra em sleep (container pausado), acordando automaticamente na próxima requisição via Traefik middleware. Economiza recursos sem expirar o ambiente.
- **Clonagem de workspace** — duplicar um workspace existente (útil para hotfix a partir de um ambiente de feature).

## Catálogo e templates

- **Versionamento de templates** — templates possuem versões (`v1`, `v2`), permitindo workspaces existentes continuarem na versão anterior enquanto novos usam a mais recente.
- **Template marketplace** — área para a equipe publicar e avaliar templates internos, com contagem de uso e autor.

## Observabilidade

- **Logs com filtro e busca** — interface dedicada, sem depender do terminal.
- **Dashboard de uso do laboratório** — visão consolidada para planejamento de capacidade.
