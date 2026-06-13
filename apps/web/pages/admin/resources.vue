<script setup lang="ts">

import type { Resource, ResourceType } from '@developer-lab/shared';



const { data, isPending } = useResourcesQuery();

const createMutation = useCreateResourceMutation();
const isCreatingResource = computed(() => createMutation.isPending.value);
const { showApiError, showSuccess } = useAppToast();



const form = reactive({

  name: '',

  type: 'postgresql' as ResourceType,

  endpoint: '',

  description: '',

  envPrefix: '',

  visibility: 'restricted' as 'public' | 'restricted' | 'key_only',

});



const typeOptions = [

  { label: 'PostgreSQL', value: 'postgresql' },

  { label: 'Redis', value: 'redis' },

  { label: 'RabbitMQ', value: 'rabbitmq' },

  { label: 'MinIO', value: 'minio' },

  { label: 'Mailpit', value: 'mailpit' },

  { label: 'API', value: 'api' },

  { label: 'Outro', value: 'other' },

];



async function createResource() {

  createMutation.reset();



  try {

    await createMutation.mutateAsync(form);



    form.name = '';

    form.endpoint = '';

    form.description = '';

    form.envPrefix = '';
    showSuccess('Recurso cadastrado com sucesso');
  } catch (error) {
    showApiError(error, 'Não foi possível cadastrar o recurso');
  }
}



function statusColor(status: Resource['status']) {

  if (status === 'online') return 'success';

  if (status === 'degraded') return 'warning';

  if (status === 'offline') return 'error';

  return 'neutral';

}

</script>



<template>

  <div>

    <div class="mb-8">

      <h1 class="text-3xl font-semibold text-highlighted">Recursos compartilhados</h1>

      <p class="text-muted">Cadastrar serviços permanentes do laboratório</p>

    </div>



    <div class="grid gap-8 xl:grid-cols-[1fr_380px]">

      <div>

        <div v-if="isPending" class="text-muted">Carregando recursos...</div>



        <div v-else-if="!data?.length" class="text-muted">

          Nenhum recurso cadastrado ainda.

        </div>



        <div v-else class="space-y-3">

          <UCard v-for="resource in data" :key="resource.id" variant="subtle">

            <div class="flex items-start justify-between gap-3">

              <div>

                <h2 class="font-semibold">{{ resource.name }}</h2>

                <p class="text-sm text-muted">{{ resource.type }}</p>

              </div>

              <UBadge :color="statusColor(resource.status)">{{ resource.status }}</UBadge>

            </div>

            <p class="mt-2 text-sm text-muted">{{ resource.endpoint }}</p>

          </UCard>

        </div>

      </div>



      <UCard variant="subtle">

        <template #header>

          <h2 class="font-semibold">Novo recurso</h2>

        </template>



        <form class="space-y-4" @submit.prevent="createResource">

          <UFormField label="Nome">

            <UInput v-model="form.name" placeholder="PostgreSQL Dev" required />

          </UFormField>

          <UFormField label="Tipo">

            <USelect v-model="form.type" :items="typeOptions" />

          </UFormField>

          <UFormField label="Endpoint">

            <UInput v-model="form.endpoint" placeholder="postgres-dev.lab:5432" required />

          </UFormField>

          <UFormField label="Prefixo ENV (opcional)">

            <UInput v-model="form.envPrefix" placeholder="DB" />

          </UFormField>

          <UFormField label="Descrição">

            <UTextarea v-model="form.description" />

          </UFormField>



          <UButton type="submit" block :loading="isCreatingResource">Cadastrar recurso</UButton>

        </form>

      </UCard>

    </div>

  </div>

</template>


