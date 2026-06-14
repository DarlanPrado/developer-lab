<script setup lang="ts">
const route = useRoute();

const key = computed(() => route.params.key as string);
const selectedContainerName = ref(typeof route.query.container === 'string' ? route.query.container : '');

const { data: workspace } = useWorkspaceQuery(key);
const workspaceId = computed(() => workspace.value?.id ?? '');

const { data: containers, isPending: containersPending } = useWorkspaceContainersQuery(workspaceId);

const selectedContainer = computed(() =>
  containers.value?.find((container) => container.name === selectedContainerName.value)
  ?? containers.value?.find((container) => container.isPrimary)
  ?? containers.value?.[0],
);

watch(
  containers,
  (value) => {
    if (!value?.length) return;
    if (!selectedContainerName.value || !value.some((item) => item.name === selectedContainerName.value)) {
      const primary = value.find((item) => item.isPrimary) ?? value[0];
      selectedContainerName.value = primary?.name ?? '';
    }
  },
  { immediate: true },
);

const { data: logsData, isPending, refetch, error } = useContainerLogsQuery(
  workspaceId,
  computed(() => selectedContainer.value?.id),
);

const { showApiError } = useAppToast();

watch(error, (value) => {
  if (value) {
    showApiError(value, 'Não foi possível carregar os logs');
  }
});

const containerOptions = computed(() =>
  (containers.value ?? []).map((container) => ({
    label: container.name,
    value: container.name,
  })),
);
</script>

<template>
  <div>
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-highlighted">Logs — {{ key }}</h1>
        <p class="text-muted">Saída recente do container</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <USelect
          v-if="containerOptions.length"
          v-model="selectedContainerName"
          :items="containerOptions"
          class="min-w-40"
        />
        <UButton variant="soft" @click="refetch">Atualizar</UButton>
        <UButton :to="`/workspaces/${key}`" variant="soft">Voltar</UButton>
      </div>
    </div>

    <div v-if="containersPending || isPending" class="text-muted">Carregando logs...</div>

    <pre
      v-else
      class="max-h-[70vh] overflow-auto rounded-xl border border-default bg-elevated p-4 text-sm whitespace-pre-wrap"
    >{{ logsData?.logs || 'Sem logs disponíveis.' }}</pre>
  </div>
</template>
