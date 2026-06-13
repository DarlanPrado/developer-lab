<script setup lang="ts">
const { data: users, isPending: usersPending } = useUsersQuery();
const { data: teams, isPending: teamsPending } = useTeamsQuery();
const { data: resources, isPending: resourcesPending } = useResourcesQuery();
const { data: workspaces, isPending: workspacesPending } = useWorkspacesQuery();

const isPending = computed(
  () =>
    usersPending.value ||
    teamsPending.value ||
    resourcesPending.value ||
    workspacesPending.value,
);

const stats = computed(() => {
  const userList = users.value ?? [];
  const teamList = teams.value ?? [];
  const resourceList = resources.value ?? [];
  const workspaceList = workspaces.value ?? [];

  return {
    users: userList.length,
    teams: teamList.length,
    resources: resourceList.length,
    workspaces: workspaceList.length,
    runningWorkspaces: workspaceList.filter((w) => w.status === 'running').length,
    onlineResources: resourceList.filter((r) => r.status === 'online').length,
  };
});

const adminLinks = [
  {
    title: 'Usuários',
    description: 'Criar e gerenciar contas da plataforma',
    to: '/admin/users',
    icon: 'i-lucide-users',
  },
  {
    title: 'Times',
    description: 'Organizar equipes e membros',
    to: '/admin/teams',
    icon: 'i-lucide-users-round',
  },
  {
    title: 'Recursos compartilhados',
    description: 'Cadastrar PostgreSQL, Redis, APIs e outros',
    to: '/admin/resources',
    icon: 'i-lucide-server',
  },
  {
    title: 'Templates',
    description: 'Modelos para criação rápida de workspaces',
    to: '/admin/templates',
    icon: 'i-lucide-file-code-2',
  },
];
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-semibold text-highlighted">Administração</h1>
      <p class="text-muted">Gestão central da plataforma Developer Lab</p>
    </div>

    <div v-if="isPending" class="text-muted">Carregando painel...</div>

    <div v-else class="space-y-8">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <UCard variant="subtle">
          <p class="text-sm text-muted">Usuários</p>
          <p class="text-3xl font-semibold">{{ stats.users }}</p>
        </UCard>
        <UCard variant="subtle">
          <p class="text-sm text-muted">Times</p>
          <p class="text-3xl font-semibold">{{ stats.teams }}</p>
        </UCard>
        <UCard variant="subtle">
          <p class="text-sm text-muted">Recursos</p>
          <p class="text-3xl font-semibold">{{ stats.resources }}</p>
          <p class="text-xs text-primary mt-1">{{ stats.onlineResources }} online</p>
        </UCard>
        <UCard variant="subtle">
          <p class="text-sm text-muted">Workspaces</p>
          <p class="text-3xl font-semibold">{{ stats.workspaces }}</p>
          <p class="text-xs text-info mt-1">{{ stats.runningWorkspaces }} em execução</p>
        </UCard>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <NuxtLink
          v-for="link in adminLinks"
          :key="link.to"
          :to="link.to"
          class="block rounded-xl border border-default bg-elevated/50 p-5 transition hover:border-primary/40 hover:bg-elevated"
        >
          <div class="flex items-start gap-3">
            <UIcon :name="link.icon" class="size-5 text-primary mt-0.5" />
            <div>
              <h2 class="font-semibold">{{ link.title }}</h2>
              <p class="mt-1 text-sm text-muted">{{ link.description }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
