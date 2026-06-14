<script setup lang="ts">
const props = defineProps<{
  workspaceId: string;
}>();

const { data, isPending } = useWorkspaceManifestQuery(computed(() => props.workspaceId));
const updateManifest = useUpdateWorkspaceManifestMutation();
const { showApiError, showSuccess } = useAppToast();

const manifestText = ref('');

watch(
  () => data.value?.manifest,
  (value) => {
    if (value !== undefined) {
      manifestText.value = value;
    }
  },
  { immediate: true },
);

async function saveManifest() {
  try {
    await updateManifest.mutateAsync({
      workspaceId: props.workspaceId,
      manifest: manifestText.value,
    });
    showSuccess('Manifesto atualizado');
  } catch (error) {
    showApiError(error, 'Não foi possível salvar o manifesto');
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="font-semibold">Manifesto</h2>
      <p class="text-sm text-muted">
        Defina os serviços do workspace em YAML. Salvar aplica as mudanças nos containers.
      </p>
    </div>

    <div v-if="isPending" class="text-sm text-muted">Carregando manifesto...</div>

    <template v-else>
      <UTextarea
        v-model="manifestText"
        :rows="18"
        class="w-full font-mono text-sm"
        placeholder="services:&#10;  app:&#10;    image: node:22-alpine&#10;    primary: true&#10;    port: 3000&#10;    expose: true"
      />

      <div class="flex justify-end">
        <UButton
          :loading="updateManifest.isPending.value"
          :disabled="!manifestText.trim()"
          @click="saveManifest"
        >
          Salvar manifesto
        </UButton>
      </div>
    </template>
  </div>
</template>
