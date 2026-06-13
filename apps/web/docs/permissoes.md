# Permissões

A plataforma possui dois níveis de controle de acesso: **global** (conta) e **por workspace**.

## Papéis globais

| Papel | Permissões |
|-------|------------|
| **Admin** | Controle total — usuários, times, recursos, templates e todos os workspaces |
| **User** | Acesso aos recursos autorizados e aos workspaces em que participa |

O primeiro usuário registrado na plataforma recebe automaticamente o papel **Admin**.

## Papéis por workspace

| Papel | Permissões |
|-------|------------|
| **Owner** | Dono do workspace — gerencia configuração, membros e recursos |
| **Maintainer** | Gerencia configuração e executa deploys |
| **Developer** | Abre terminal, visualiza logs e reinicia o ambiente |
| **Viewer** | Apenas visualização |

Quem cria um workspace torna-se **Owner** automaticamente.

## Áreas restritas

- Rotas `/admin/*` — apenas usuários com papel global **Admin**
- Terminal e logs — requerem pelo menos **Developer** no workspace
- Edição de workspace — requer **Maintainer** ou superior

## Badge Admin

Usuários admin veem um badge **Admin** no rodapé da sidebar e a seção **Administração** no menu.

Se você esperava ser admin mas não vê o badge, confira se sua conta tem `role: admin` no banco — faça logout e login novamente após qualquer alteração de papel.
