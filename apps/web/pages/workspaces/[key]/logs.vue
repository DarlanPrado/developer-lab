<script setup lang="ts">

const route = useRoute();



const key = computed(() => route.params.key as string);



const { data: workspace } = useWorkspaceQuery(key);



const workspaceId = computed(() => workspace.value?.id ?? '');



const { data: logsData, isPending, refetch, error } = useWorkspaceLogsQuery(workspaceId);

const { showApiError } = useAppToast();

watch(error, (value) => {
  if (value) {
    showApiError(value, 'Não foi possível carregar os logs');
  }
});

</script>



<template>

  <div>

    <div class="mb-8 flex items-center justify-between">

      <div>

        <h1 class="text-3xl font-semibold text-highlighted">Logs — {{ key }}</h1>

        <p class="text-muted">Saída recente do container</p>

      </div>

      <div class="flex gap-2">

        <UButton variant="soft" @click="refetch">Atualizar</UButton>

        <UButton :to="`/workspaces/${key}`" variant="soft">Voltar</UButton>

      </div>

    </div>



    <div v-if="isPending" class="text-muted">Carregando logs...</div>



    <pre

      v-else

      class="max-h-[70vh] overflow-auto rounded-xl border border-default bg-black/60 p-4 text-xs leading-6 text-toned"

    >{{ logsData?.logs || 'Sem logs disponíveis' }}</pre>

  </div>

</template>


