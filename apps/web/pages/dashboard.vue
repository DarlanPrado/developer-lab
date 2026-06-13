<script setup lang="ts">

const {

  data: workspaces,

  isPending: workspacesPending,

  error: workspacesError,

} = useWorkspacesQuery();



const {

  data: resources,

  isPending: resourcesPending,

  error: resourcesError,

} = useResourcesQuery();



const isPending = computed(() => workspacesPending.value || resourcesPending.value);

const error = computed(() => workspacesError.value ?? resourcesError.value);

const { showApiError } = useAppToast();

watch(error, (value) => {
  if (value) {
    showApiError(value, 'Erro ao carregar dashboard');
  }
});



const stats = computed(() => {

  const ws = workspaces.value ?? [];

  const rs = resources.value ?? [];



  return {

    workspaces: ws,

    running: ws.filter((w) => w.status === 'running').length,

    onlineResources: rs.filter((r) => r.status === 'online').length,

  };

});

</script>



<template>

  <div>

    <div class="mb-8">

      <h1 class="text-3xl font-semibold text-highlighted">Dashboard</h1>

      <p class="text-muted">Visão geral do laboratório</p>

    </div>



    <div v-if="isPending" class="text-muted">Carregando...</div>



    <div v-else class="space-y-8">

      <div class="grid gap-4 md:grid-cols-3">

        <UCard variant="subtle">

          <p class="text-sm text-muted">Workspaces</p>

          <p class="text-3xl font-semibold">{{ stats.workspaces.length }}</p>

        </UCard>

        <UCard variant="subtle">

          <p class="text-sm text-muted">Em execução</p>

          <p class="text-3xl font-semibold text-primary">{{ stats.running }}</p>

        </UCard>

        <UCard variant="subtle">

          <p class="text-sm text-muted">Recursos online</p>

          <p class="text-3xl font-semibold text-info">{{ stats.onlineResources }}</p>

        </UCard>

      </div>



      <UCard variant="subtle">

        <template #header>

          <h2 class="font-semibold">Workspaces recentes</h2>

        </template>



        <div class="space-y-3">

          <div

            v-for="workspace in stats.workspaces.slice(0, 5)"

            :key="workspace.id"

            class="flex items-center justify-between rounded-lg border border-default px-4 py-3"

          >

            <div>

              <p class="font-medium">{{ workspace.name }}</p>

              <p class="text-sm text-muted">{{ workspace.key }}</p>

            </div>

            <div class="flex items-center gap-3">

              <UBadge :color="workspace.status === 'running' ? 'success' : 'neutral'">

                {{ workspace.status }}

              </UBadge>

              <UButton :to="`/workspaces/${workspace.key}`" size="sm" variant="soft">

                Abrir

              </UButton>

            </div>

          </div>

        </div>

      </UCard>

    </div>

  </div>

</template>


