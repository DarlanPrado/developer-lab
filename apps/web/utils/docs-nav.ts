export interface DocsNavItem {
  label: string;
  to: string;
}

export const docsNavItems: DocsNavItem[] = [
  { label: 'Introdução', to: '/docs' },
  { label: 'Primeiros passos', to: '/docs/primeiros-passos' },
  { label: 'Recursos', to: '/docs/recursos' },
  { label: 'Workspaces', to: '/docs/workspaces' },
  { label: 'Permissões', to: '/docs/permissoes' },
  { label: 'Administração', to: '/docs/administracao' },
];

export function isDocsNavActive(path: string, itemTo: string) {
  if (itemTo === '/docs') {
    return path === '/docs' || path === '/docs/';
  }

  return path === itemTo || path.startsWith(`${itemTo}/`);
}
