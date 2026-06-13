<script setup lang="ts">
const { data, isPending } = useTeamsQuery();
const { data: users, isPending: usersPending } = useUsersQuery();

const createMutation = useCreateTeamMutation();
const isCreatingTeam = computed(() => createMutation.isPending.value);
const { showApiError, showSuccess } = useAppToast();

const form = reactive({
  name: '',
  description: '',
});

const teamList = computed(() => data.value ?? []);
const userList = computed(() => users.value ?? []);

async function createTeam() {
  createMutation.reset();

  try {
    await createMutation.mutateAsync({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
    });

    form.name = '';
    form.description = '';
    showSuccess('Time criado com sucesso');
  } catch (error) {
    showApiError(error, 'Não foi possível criar o time');
  }
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-semibold text-highlighted">Times</h1>
      <p class="text-muted">Organizar equipes e membros do laboratório</p>
    </div>

    <div class="grid gap-8 xl:grid-cols-[1fr_360px]">
      <div>
        <div v-if="isPending || usersPending" class="text-muted">Carregando times...</div>

        <div v-else-if="!teamList.length" class="rounded-xl border border-dashed border-default p-8 text-center">
          <UIcon name="i-lucide-users-round" class="mx-auto mb-3 size-8 text-muted" />
          <p class="text-muted">Nenhum time criado ainda</p>
        </div>

        <div v-else class="grid gap-4 md:grid-cols-2">
          <UCard v-for="team in teamList" :key="team.id" variant="subtle">
            <h2 class="font-semibold">{{ team.name }}</h2>
            <p class="mt-2 text-sm text-muted">{{ team.description || 'Sem descrição' }}</p>
            <p class="mt-2 text-xs text-muted">
              Criado em {{ new Date(team.createdAt).toLocaleString() }}
            </p>

            <TeamMembersPanel :team-id="team.id" :users="userList" />
          </UCard>
        </div>
      </div>

      <UCard variant="subtle" class="h-fit">
        <template #header>
          <h2 class="font-semibold">Novo time</h2>
        </template>

        <form class="space-y-4" @submit.prevent="createTeam">
          <UFormField label="Nome">
            <UInput v-model="form.name" placeholder="Backend" required />
          </UFormField>

          <UFormField label="Descrição">
            <UTextarea v-model="form.description" placeholder="Equipe responsável pela API" />
          </UFormField>

          <UButton type="submit" block :loading="isCreatingTeam">Criar time</UButton>
        </form>
      </UCard>
    </div>
  </div>
</template>
