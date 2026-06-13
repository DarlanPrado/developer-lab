<script setup lang="ts">

const { data, isPending } = useTemplatesQuery();
const createMutation = useCreateTemplateMutation();
const isCreatingTemplate = computed(() => createMutation.isPending.value);
const { showApiError, showSuccess } = useAppToast();

const form = reactive({
  name: '',
  description: '',
  version: 'v1',
  definition: `image: node:22-alpine
port: 3000
`,
});

async function createTemplate() {
  createMutation.reset();

  try {
    await createMutation.mutateAsync(form);

    form.name = '';
    form.description = '';
    showSuccess('Template criado com sucesso');
  } catch (error) {
    showApiError(error, 'Não foi possível criar o template');
  }
}

</script>



<template>

  <div>

    <div class="mb-8">

      <h1 class="text-3xl font-semibold text-highlighted">Templates</h1>

      <p class="text-muted">Modelos reutilizáveis para criação de workspaces</p>

    </div>



    <div class="grid gap-8 xl:grid-cols-[1fr_380px]">

      <div>

        <div v-if="isPending" class="text-muted">Carregando templates...</div>



        <div v-else-if="!data?.length" class="text-muted">

          Nenhum template cadastrado ainda.

        </div>



        <div v-else class="space-y-3">

          <UCard v-for="template in data" :key="template.id" variant="subtle">

            <div class="flex items-center justify-between gap-3">

              <div>

                <h2 class="font-semibold">{{ template.name }}</h2>

                <p class="text-sm text-muted">{{ template.description || 'Sem descrição' }}</p>

              </div>

              <UBadge>{{ template.version }}</UBadge>

            </div>

            <pre class="mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs text-toned">{{ template.definition }}</pre>

          </UCard>

        </div>

      </div>



      <UCard variant="subtle">

        <template #header>

          <h2 class="font-semibold">Novo template</h2>

        </template>



        <form class="space-y-4" @submit.prevent="createTemplate">

          <UFormField label="Nome">

            <UInput v-model="form.name" placeholder="Nuxt Starter" required />

          </UFormField>

          <UFormField label="Versão">

            <UInput v-model="form.version" />

          </UFormField>

          <UFormField label="Descrição">

            <UTextarea v-model="form.description" />

          </UFormField>

          <UFormField label="Definição">

            <UTextarea v-model="form.definition" :rows="8" required />

          </UFormField>



          <UButton type="submit" block :loading="isCreatingTemplate">Criar template</UButton>

        </form>

      </UCard>

    </div>

  </div>

</template>


