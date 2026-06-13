# Primeiros passos

Este guia explica como acessar a plataforma e navegar pelas áreas principais.

## Acesso

1. Abra a plataforma em `http://localhost:3000` (ou o domínio configurado no seu ambiente)
2. Na tela de login, informe **email** e **senha**
3. Marque **Lembrar de mim** se quiser manter a sessão por mais tempo
4. Clique em **Entrar**

A sessão é gerenciada por cookie seguro (HttpOnly). Você não precisa copiar tokens manualmente.

## Navegação

Após o login, a sidebar exibe as seções do laboratório:

| Seção | Rota | Descrição |
|-------|------|-----------|
| Dashboard | `/dashboard` | Visão geral da plataforma |
| Recursos | `/resources` | Catálogo de serviços compartilhados |
| Workspaces | `/workspaces` | Seus ambientes de desenvolvimento |
| Documentação | `/docs` | Esta documentação de uso |

Usuários com papel **Admin** também veem a seção **Administração** com gestão de usuários, times, recursos e templates.

## Perfil

No rodapé da sidebar você vê:

- Nome e email da conta logada
- Badge **Admin**, se aplicável
- Botão **Sair** para encerrar a sessão

## Próximos passos

- Explore o [catálogo de recursos](/docs/recursos) disponíveis no laboratório
- Crie seu primeiro [workspace](/docs/workspaces)
- Consulte [permissões](/docs/permissoes) se trabalhar em equipe
