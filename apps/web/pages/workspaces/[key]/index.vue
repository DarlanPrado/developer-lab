<script setup lang="ts">
import type { Resource } from '@developer-lab/shared';

const route = useRoute();
const auth = useAuthStore();

const key = computed(() => route.params.key as string);

const { data, isPending, refetch } = useWorkspaceQuery(key);

const workspaceId = computed(() => data.value?.id ?? '');

const { data: envData, isPending: envPending } = useWorkspaceEnvQuery(workspaceId);
const { data: members } = useWorkspaceMembersQuery(workspaceId);

const { data: allResources, isPending: resourcesPending } = useResourcesQuery();

const actionMutation = useWorkspaceActionMutation();
const updateMutation = useUpdateWorkspaceMutation();

const isRunningAction = computed(() => actionMutation.isPending.value);
const isUpdatingDependencies = computed(() => updateMutation.isPending.value);
const isWorkspaceRunning = computed(() => data.value?.status === 'running');
const { showApiError, showSuccess } = useAppToast();

const canManageMembers = computed(() => {
  if (!auth.user || !data.value) return false;
  if (auth.isAdmin) return true;
  if (data.value.ownerId === auth.user.id) return true;

  const membership = members.value?.find((member) => member.userId === auth.user!.id);
  return membership?.role === 'maintainer' || membership?.role === 'owner';
});

const { data: memberCandidates } = useWorkspaceMemberCandidatesQuery(
  workspaceId,
  canManageMembers,
);

const candidateUsers = computed(() => memberCandidates.value ?? []);

const actionLabels = {
  start: { success: 'Workspace iniciado com sucesso', error: 'Não foi possível iniciar o workspace' },
  stop: { success: 'Workspace parado com sucesso', error: 'Não foi possível parar o workspace' },
  restart: { success: 'Workspace reiniciado com sucesso', error: 'Não foi possível reiniciar o workspace' },
} as const;

const activeTab = ref('containers');

const copiedKey = ref<string | null>(null);
const isAddModalOpen = ref(false);
const selectedResourceIds = ref<string[]>([]);

const linkedResourceIds = computed(
  () => new Set(data.value?.dependencies.map((resource) => resource.id) ?? []),
);

const availableResources = computed(() =>
  (allResources.value ?? []).filter((resource) => !linkedResourceIds.value.has(resource.id)),
);

const resourceCheckboxItems = computed(() =>
  availableResources.value.map((resource) => ({
    label: resource.name,
    value: resource.id,
    description: `${resource.type} · ${resource.endpoint}`,
  })),
);

watch(isAddModalOpen, (open) => {
  if (open) {
    selectedResourceIds.value = [];
  }
});

function statusColor(status: Resource['status']) {
  if (status === 'online') return 'success';
  if (status === 'degraded') return 'warning';
  if (status === 'offline') return 'error';
  return 'neutral';
}

async function runAction(action: 'start' | 'stop' | 'restart') {
  if (!data.value) return;

  try {
    await actionMutation.mutateAsync({
      workspaceId: data.value.id,
      action,
    });

    await refetch();
    showSuccess(actionLabels[action].success);
  } catch (error) {
    showApiError(error, actionLabels[action].error);
  }
}

async function updateDependencies(resourceIds: string[]) {
  if (!data.value) return;

  try {
    await updateMutation.mutateAsync({
      id: data.value.id,
      body: { resourceIds },
    });

    await refetch();
    showSuccess('Dependências atualizadas com sucesso');
  } catch (error) {
    showApiError(error, 'Não foi possível atualizar as dependências');
  }
}

async function confirmAddResources() {
  if (!data.value || selectedResourceIds.value.length === 0) return;

  const nextResourceIds = [
    ...data.value.dependencies.map((resource) => resource.id),
    ...selectedResourceIds.value,
  ];

  await updateDependencies(nextResourceIds);
  isAddModalOpen.value = false;
}

async function removeResource(resourceId: string) {
  if (!data.value) return;

  const nextResourceIds = data.value.dependencies
    .map((resource) => resource.id)
    .filter((id) => id !== resourceId);

  await updateDependencies(nextResourceIds);
}

async function copyValue(value: string, envKey: string) {
  await navigator.clipboard.writeText(value);
  copiedKey.value = envKey;
  setTimeout(() => {
    copiedKey.value = null;
  }, 1500);
}
</script>

<template>
  <div>
    <div v-if="isPending" class="text-muted">Carregando workspace...</div>

    <div v-else-if="data">
      <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-semibold text-highlighted">{{ data.name }}</h1>
          <p class="text-muted">{{ data.key }}</p>
          <p class="mt-1 text-muted">{{ data.description || 'Sem descrição' }}</p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            :loading="isRunningAction"
            :disabled="isWorkspaceRunning || isRunningAction"
            color="success"
            @click="runAction('start')"
          >
            Iniciar
          </UButton>

          <UButton
            :loading="isRunningAction"
            :disabled="!isWorkspaceRunning || isRunningAction"
            color="warning"
            @click="runAction('stop')"
          >
            Parar
          </UButton>

          <UButton
            :loading="isRunningAction"
            :disabled="!isWorkspaceRunning || isRunningAction"
            variant="soft"
            @click="runAction('restart')"
          >
            Reiniciar
          </UButton>

          <UButton
            :to="`/workspaces/${data.key}/terminal${(data.containers?.find(c => c.isPrimary) ?? data.containers?.[0]) ? `?container=${encodeURIComponent((data.containers?.find(c => c.isPrimary) ?? data.containers?.[0])!.name)}` : ''}`"
            variant="soft"
          >
            Terminal
          </UButton>

          <UButton :to="`/workspaces/${data.key}/logs`" variant="soft">
            Logs
          </UButton>
        </div>
      </div>

      <UTabs
        v-model="activeTab"
        :items="[
          { label: 'Containers', value: 'containers' },
          { label: 'Manifesto', value: 'manifest' },
          { label: 'Dependências', value: 'dependencies' },
          { label: 'Membros', value: 'members' },
          { label: 'Variáveis', value: 'env' },
        ]"
        class="mb-6"
      />

      <div v-show="activeTab === 'containers'" class="mb-6">
        <UCard variant="subtle">
          <WorkspaceContainersPanel
            v-if="workspaceId"
            :workspace-id="workspaceId"
            :workspace-key="data.key"
            :can-manage="canManageMembers"
          />
        </UCard>
      </div>

      <div v-show="activeTab === 'manifest'" class="mb-6">
        <UCard variant="subtle">
          <WorkspaceManifestPanel v-if="workspaceId" :workspace-id="workspaceId" />
        </UCard>
      </div>

      <div v-show="activeTab === 'dependencies'" class="mb-6">
        <UCard variant="subtle">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold">Dependências</h2>
              <UButton
                size="sm"
                icon="i-lucide-plus"
                :loading="resourcesPending"
                :disabled="isUpdatingDependencies"
                @click="isAddModalOpen = true"
              >
                Adicionar
              </UButton>
            </div>
          </template>

          <div v-if="data.dependencies.length === 0" class="text-sm text-muted">
            Nenhuma dependência configurada
          </div>

          <ul v-else class="space-y-2">
            <li
              v-for="resource in data.dependencies"
              :key="resource.id"
              class="flex items-start justify-between gap-3 rounded-lg border border-default px-3 py-2 text-sm"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="font-medium">{{ resource.name }}</p>
                  <UBadge size="xs" :color="statusColor(resource.status)">
                    {{ resource.status }}
                  </UBadge>
                </div>
                <p class="text-muted">{{ resource.type }} · {{ resource.endpoint }}</p>
              </div>

              <UButton
                size="xs"
                color="error"
                variant="ghost"
                icon="i-lucide-x"
                :loading="isUpdatingDependencies"
                aria-label="Remover recurso"
                @click="removeResource(resource.id)"
              />
            </li>
          </ul>
        </UCard>
      </div>

      <div v-show="activeTab === 'members'" class="mb-6">
        <UCard variant="subtle">
          <template #header>
            <h2 class="font-semibold">Membros</h2>
          </template>

          <WorkspaceMembersPanel
            v-if="workspaceId"
            :workspace-id="workspaceId"
            :users="candidateUsers"
            :can-manage-members="canManageMembers"
          />
        </UCard>
      </div>

      <div v-show="activeTab === 'env'" class="mb-6">
        <UCard variant="subtle">
          <template #header>
            <h2 class="font-semibold">Variáveis de ambiente</h2>
          </template>

          <div v-if="envPending" class="text-sm text-muted">Carregando variáveis...</div>

          <div v-else-if="envData?.env.length" class="space-y-2">
            <div
              v-for="item in envData.env"
              :key="item.key"
              class="flex items-center justify-between gap-4 rounded-lg border border-default px-3 py-2 text-sm"
            >
              <div>
                <code>{{ item.key }}</code>
                <p class="text-muted">{{ item.value }}</p>
              </div>

              <UButton size="xs" variant="soft" @click="copyValue(item.value, item.key)">
                {{ copiedKey === item.key ? 'Copiado!' : 'Copiar' }}
              </UButton>
            </div>
          </div>

          <div v-else class="text-sm text-muted">
            Nenhuma variável gerada. Associe recursos compartilhados para ver as connection strings.
          </div>
        </UCard>
      </div>
    </div>

    <UModal v-model:open="isAddModalOpen" title="Adicionar recursos">
      <template #body>
        <div v-if="resourcesPending" class="text-sm text-muted">Carregando recursos...</div>

        <div v-else-if="!allResources?.length" class="space-y-2 text-sm text-muted">
          <p>Nenhum recurso cadastrado no laboratório.</p>
          <p>
            Cadastre em
            <NuxtLink to="/admin/resources" class="text-primary underline">
              Administração → Recursos
            </NuxtLink>
            e volte para associar.
          </p>
        </div>

        <div v-else-if="availableResources.length === 0" class="text-sm text-muted">
          Todos os recursos disponíveis já estão associados a este workspace.
        </div>

        <UCheckboxGroup
          v-else
          v-model="selectedResourceIds"
          :items="resourceCheckboxItems"
          class="w-full"
        />
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="close">Cancelar</UButton>
          <UButton
            :loading="isUpdatingDependencies"
            :disabled="selectedResourceIds.length === 0"
            @click="confirmAddResources"
          >
            Associar
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
