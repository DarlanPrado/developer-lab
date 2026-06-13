<script setup lang="ts">
import type { User, WorkspaceRole } from '@developer-lab/shared';

const props = defineProps<{
  workspaceId: string;
  users: User[];
  canManageMembers: boolean;
}>();

const { data: members, isPending, refetch } = useWorkspaceMembersQuery(
  () => props.workspaceId,
);
const addMutation = useAddWorkspaceMemberMutation();
const removeMutation = useRemoveWorkspaceMemberMutation();
const { showApiError, showSuccess } = useAppToast();

const selectedUserId = ref<string | undefined>(undefined);
const selectedRole = ref<Exclude<WorkspaceRole, 'owner'>>('viewer');
const isAdding = computed(() => addMutation.isPending.value);
const isRemoving = computed(() => removeMutation.isPending.value);

const memberUserIds = computed(
  () => new Set(members.value?.map((member) => member.userId) ?? []),
);

const availableUsers = computed(() =>
  props.users.filter((user) => !memberUserIds.value.has(user.id)),
);

const userOptions = computed(() =>
  availableUsers.value.map((user) => ({
    label: `${user.name} (${user.email})`,
    value: user.id,
  })),
);

const roleOptions = [
  { label: 'Viewer', value: 'viewer' },
  { label: 'Developer', value: 'developer' },
  { label: 'Maintainer', value: 'maintainer' },
];

function roleColor(role: WorkspaceRole) {
  if (role === 'owner') return 'warning';
  if (role === 'maintainer') return 'info';
  if (role === 'developer') return 'primary';
  return 'neutral';
}

async function addMember() {
  if (!selectedUserId.value) return;

  try {
    await addMutation.mutateAsync({
      workspaceId: props.workspaceId,
      body: {
        userId: selectedUserId.value,
        role: selectedRole.value,
      },
    });
    selectedUserId.value = undefined;
    selectedRole.value = 'viewer';
    await refetch();
    showSuccess('Membro adicionado ao workspace');
  } catch (error) {
    showApiError(error, 'Não foi possível adicionar o membro');
  }
}

async function removeMember(userId: string) {
  try {
    await removeMutation.mutateAsync({ workspaceId: props.workspaceId, userId });
    await refetch();
    showSuccess('Membro removido do workspace');
  } catch (error) {
    showApiError(error, 'Não foi possível remover o membro');
  }
}
</script>

<template>
  <div v-if="isPending" class="text-sm text-muted">Carregando membros...</div>

  <ul v-else-if="members?.length" class="space-y-2">
    <li
      v-for="member in members"
      :key="member.userId"
      class="flex items-center justify-between gap-3 rounded-lg border border-default px-3 py-2 text-sm"
    >
      <div class="min-w-0">
        <p class="font-medium truncate">{{ member.user.name }}</p>
        <p class="text-muted truncate">{{ member.user.email }}</p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <UBadge size="xs" :color="roleColor(member.role)">
          {{ member.role }}
        </UBadge>
        <UButton
          v-if="canManageMembers"
          size="xs"
          color="error"
          variant="ghost"
          icon="i-lucide-x"
          :loading="isRemoving"
          :disabled="member.role === 'owner'"
          aria-label="Remover membro"
          @click="removeMember(member.userId)"
        />
      </div>
    </li>
  </ul>

  <p v-else class="text-sm text-muted">Nenhum membro neste workspace.</p>

  <form
    v-if="canManageMembers && userOptions.length"
    class="mt-4 flex flex-wrap items-end gap-2"
    @submit.prevent="addMember"
  >
    <UFormField label="Usuário" class="min-w-[220px] flex-1">
      <USelect
        v-model="selectedUserId"
        :items="userOptions"
        placeholder="Selecione um usuário"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Papel" class="min-w-[140px]">
      <USelect v-model="selectedRole" :items="roleOptions" class="w-full" />
    </UFormField>

    <UButton type="submit" size="sm" :loading="isAdding" :disabled="!selectedUserId">
      Adicionar
    </UButton>
  </form>

  <p
    v-else-if="canManageMembers && !isPending && members?.length && !userOptions.length"
    class="mt-4 text-xs text-muted"
  >
    Todos os usuários já fazem parte deste workspace.
  </p>
</template>
