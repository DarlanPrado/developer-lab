<script setup lang="ts">
import type { User } from '@developer-lab/shared';

const props = defineProps<{
  teamId: string;
  users: User[];
}>();

const { data: members, isPending, refetch } = useTeamMembersQuery(() => props.teamId);
const addMutation = useAddTeamMemberMutation();
const removeMutation = useRemoveTeamMemberMutation();
const { showApiError, showSuccess } = useAppToast();

const selectedUserId = ref<string | undefined>(undefined);
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

async function addMember() {
  if (!selectedUserId.value) return;

  try {
    await addMutation.mutateAsync({
      teamId: props.teamId,
      body: { userId: selectedUserId.value },
    });
    selectedUserId.value = undefined;
    await refetch();
    showSuccess('Membro adicionado ao time');
  } catch (error) {
    showApiError(error, 'Não foi possível adicionar o membro');
  }
}

async function removeMember(userId: string) {
  try {
    await removeMutation.mutateAsync({ teamId: props.teamId, userId });
    await refetch();
    showSuccess('Membro removido do time');
  } catch (error) {
    showApiError(error, 'Não foi possível remover o membro');
  }
}
</script>

<template>
  <div class="mt-4 space-y-4 border-t border-default pt-4">
    <h3 class="text-sm font-medium text-highlighted">Membros</h3>

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
          <UBadge size="xs" :color="member.role === 'owner' ? 'warning' : 'neutral'">
            {{ member.role }}
          </UBadge>
          <UButton
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

    <p v-else class="text-sm text-muted">Nenhum membro neste time.</p>

    <form v-if="userOptions.length" class="flex flex-wrap items-end gap-2" @submit.prevent="addMember">
      <UFormField label="Adicionar membro" class="min-w-[220px] flex-1">
        <USelect
          v-model="selectedUserId"
          :items="userOptions"
          placeholder="Selecione um usuário"
          class="w-full"
        />
      </UFormField>
      <UButton type="submit" size="sm" :loading="isAdding" :disabled="!selectedUserId">
        Adicionar
      </UButton>
    </form>

    <p v-else-if="!isPending && members?.length" class="text-xs text-muted">
      Todos os usuários já fazem parte deste time.
    </p>
  </div>
</template>
