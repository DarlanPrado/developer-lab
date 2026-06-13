<script setup lang="ts">
import type { Resource } from '@developer-lab/shared';

const { data, isPending, refetch } = useResourcesQuery();

function statusColor(status: Resource['status']) {
  if (status === 'online') return 'success';
  if (status === 'degraded') return 'warning';
  if (status === 'offline') return 'error';
  return 'neutral';
}
</script>

<template>
  <div>
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-semibold text-highlighted">Catálogo de Recursos</h1>
        <p class="text-muted">Recursos compartilhados do laboratório</p>
      </div>
      <UButton variant="soft" @click="refetch">Atualizar</UButton>
    </div>

    <div v-if="isPending" class="text-muted">Carregando recursos...</div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <UCard v-for="resource in data" :key="resource.id" variant="subtle">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-semibold">{{ resource.name }}</h2>
            <p class="text-sm text-muted">{{ resource.type }}</p>
          </div>
          <UBadge :color="statusColor(resource.status)">{{ resource.status }}</UBadge>
        </div>

        <p class="mt-3 text-sm text-muted">{{ resource.description || 'Sem descrição' }}</p>

        <div class="mt-4 space-y-2 text-sm">
          <div class="flex justify-between gap-4">
            <span class="text-muted">Endpoint</span>
            <code class="text-primary">{{ resource.endpoint }}</code>
          </div>
          <div class="flex justify-between gap-4">
            <span class="text-muted">Visibilidade</span>
            <span>{{ resource.visibility }}</span>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
