<script setup lang="ts">
import type { CreateWorkspaceContainerRequest, WorkspaceContainer } from '@developer-lab/shared';

const props = defineProps<{
  workspaceId: string;
  workspaceKey: string;
  canManage: boolean;
}>();

const { data: containers, isPending, refetch } = useWorkspaceContainersQuery(
  computed(() => props.workspaceId),
);

const containerAction = useContainerActionMutation();
const createContainer = useCreateContainerMutation();
const removeContainer = useRemoveContainerMutation();
const workspaceAction = useWorkspaceActionMutation();

const { showApiError, showSuccess } = useAppToast();

const isAddOpen = ref(false);
const addForm = reactive({
  name: '',
  image: 'node:22-alpine',
  port: 3000,
  exposeViaTraefik: true,
  isPrimary: false,
});

function containerStatusColor(status: WorkspaceContainer['status']) {
  if (status === 'running') return 'success';
  if (status === 'error') return 'error';
  return 'neutral';
}

async function runWorkspaceAction(action: 'start' | 'stop' | 'restart') {
  try {
    await workspaceAction.mutateAsync({ workspaceId: props.workspaceId, action });
    await refetch();
    showSuccess(`Workspace ${action === 'start' ? 'iniciado' : action === 'stop' ? 'parado' : 'reiniciado'}`);
  } catch (error) {
    showApiError(error, 'Não foi possível executar a ação no workspace');
  }
}

async function runContainerAction(
  container: WorkspaceContainer,
  action: 'start' | 'stop' | 'restart',
) {
  try {
    await containerAction.mutateAsync({
      workspaceId: props.workspaceId,
      containerId: container.id,
      action,
    });
    await refetch();
    showSuccess(`Container ${container.name} ${action === 'start' ? 'iniciado' : action === 'stop' ? 'parado' : 'reiniciado'}`);
  } catch (error) {
    showApiError(error, `Não foi possível ${action} o container`);
  }
}

async function submitAddContainer() {
  const body: CreateWorkspaceContainerRequest = {
    name: addForm.name.trim(),
    image: addForm.image.trim(),
    port: addForm.port,
    exposeViaTraefik: addForm.exposeViaTraefik,
    isPrimary: addForm.isPrimary,
    env: [],
    cpuLimit: null,
    memoryLimit: null,
    order: containers.value?.length ?? 0,
  };

  try {
    await createContainer.mutateAsync({ workspaceId: props.workspaceId, body });
    isAddOpen.value = false;
    addForm.name = '';
    addForm.image = 'node:22-alpine';
    addForm.port = 3000;
    addForm.exposeViaTraefik = true;
    addForm.isPrimary = false;
    showSuccess('Serviço adicionado');
  } catch (error) {
    showApiError(error, 'Não foi possível adicionar o serviço');
  }
}

async function deleteContainer(container: WorkspaceContainer) {
  try {
    await removeContainer.mutateAsync({
      workspaceId: props.workspaceId,
      containerId: container.id,
    });
    showSuccess(`Container ${container.name} removido`);
  } catch (error) {
    showApiError(error, 'Não foi possível remover o container');
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="font-semibold">Containers</h2>
        <p class="text-sm text-muted">Serviços do workspace na rede isolada</p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton size="sm" color="success" variant="soft" @click="runWorkspaceAction('start')">
          Iniciar todos
        </UButton>
        <UButton size="sm" color="warning" variant="soft" @click="runWorkspaceAction('stop')">
          Parar todos
        </UButton>
        <UButton
          v-if="canManage"
          size="sm"
          icon="i-lucide-plus"
          @click="isAddOpen = true"
        >
          Adicionar serviço
        </UButton>
      </div>
    </div>

    <div v-if="isPending" class="text-sm text-muted">Carregando containers...</div>

    <div v-else-if="!containers?.length" class="rounded-lg border border-dashed border-default p-6 text-sm text-muted">
      Nenhum container configurado.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead class="text-left text-muted">
          <tr>
            <th class="pb-3 pr-4">Nome</th>
            <th class="pb-3 pr-4">Imagem</th>
            <th class="pb-3 pr-4">Status</th>
            <th class="pb-3 pr-4">Porta</th>
            <th class="pb-3 pr-4">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="container in containers"
            :key="container.id"
            class="border-t border-default"
          >
            <td class="py-3 pr-4">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ container.name }}</span>
                <UBadge v-if="container.isPrimary" size="xs" color="primary">primary</UBadge>
              </div>
            </td>
            <td class="py-3 pr-4">
              <code class="text-xs">{{ container.image }}</code>
            </td>
            <td class="py-3 pr-4">
              <UBadge :color="containerStatusColor(container.status)">
                {{ container.status }}
              </UBadge>
            </td>
            <td class="py-3 pr-4">
              {{ container.port ? `:${container.port}` : '—' }}
            </td>
            <td class="py-3">
              <div class="flex flex-wrap gap-1">
                <UButton
                  size="xs"
                  variant="soft"
                  :to="`/workspaces/${workspaceKey}/terminal?container=${encodeURIComponent(container.name)}`"
                >
                  Terminal
                </UButton>
                <UButton
                  size="xs"
                  variant="soft"
                  :to="`/workspaces/${workspaceKey}/logs?container=${encodeURIComponent(container.name)}`"
                >
                  Logs
                </UButton>
                <UButton
                  v-if="container.status !== 'running'"
                  size="xs"
                  color="success"
                  variant="ghost"
                  @click="runContainerAction(container, 'start')"
                >
                  Start
                </UButton>
                <UButton
                  v-else
                  size="xs"
                  color="warning"
                  variant="ghost"
                  @click="runContainerAction(container, 'stop')"
                >
                  Stop
                </UButton>
                <UButton
                  v-if="canManage"
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  @click="deleteContainer(container)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="isAddOpen" title="Adicionar serviço">
      <template #body>
        <form class="space-y-4" @submit.prevent="submitAddContainer">
          <UFormField label="Nome" required>
            <UInput v-model="addForm.name" placeholder="postgres" class="w-full" required />
          </UFormField>
          <UFormField label="Imagem" required>
            <UInput v-model="addForm.image" placeholder="postgres:16" class="w-full" required />
          </UFormField>
          <UFormField label="Porta">
            <UInputNumber v-model="addForm.port" :min="1" :max="65535" class="w-full" />
          </UFormField>
          <UCheckbox v-model="addForm.exposeViaTraefik" label="Expor via Traefik" />
          <UCheckbox v-model="addForm.isPrimary" label="Container principal (terminal padrão)" />
        </form>
      </template>
      <template #footer="{ close }">
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="close">Cancelar</UButton>
          <UButton :loading="createContainer.isPending.value" @click="submitAddContainer">
            Adicionar
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
