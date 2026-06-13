<script setup lang="ts">

const { data, isPending, isError } = useUsersQuery();

const createMutation = useCreateUserMutation();
const isCreatingUser = computed(() => createMutation.isPending.value);
const { showApiError, showSuccess } = useAppToast();



const form = reactive({

  name: '',

  email: '',

  password: '',

  role: 'user' as 'admin' | 'user',

});



async function createUser() {

  createMutation.reset();



  try {

    await createMutation.mutateAsync(form);



    form.name = '';

    form.email = '';

    form.password = '';

    form.role = 'user';
    showSuccess('Usuário criado com sucesso');
  } catch (error) {
    showApiError(error, 'Não foi possível criar o usuário');
  }
}

</script>



<template>

  <div>

    <div class="mb-8">

      <h1 class="text-3xl font-semibold text-highlighted">Usuários</h1>

      <p class="text-muted">Criar e gerenciar contas da plataforma</p>

    </div>



    <div class="grid gap-8 xl:grid-cols-[1fr_360px]">

      <UCard variant="subtle">

        <template #header>

          <h2 class="font-semibold">Usuários cadastrados</h2>

        </template>



        <div v-if="isPending" class="text-muted">Carregando usuários...</div>

        <div v-else-if="isError" class="text-sm text-error">
          Não foi possível carregar os usuários. Saia e entre novamente.
        </div>

        <div v-else class="overflow-x-auto">

          <table class="min-w-full text-sm">

            <thead class="text-left text-muted">

              <tr>

                <th class="pb-3 pr-4">Nome</th>

                <th class="pb-3 pr-4">Email</th>

                <th class="pb-3 pr-4">Role</th>

                <th class="pb-3">Criado em</th>

              </tr>

            </thead>

            <tbody>

              <tr

                v-for="user in data"

                :key="user.id"

                class="border-t border-default"

              >

                <td class="py-3 pr-4">{{ user.name }}</td>

                <td class="py-3 pr-4">{{ user.email }}</td>

                <td class="py-3 pr-4">

                  <UBadge :color="user.role === 'admin' ? 'warning' : 'neutral'">

                    {{ user.role }}

                  </UBadge>

                </td>

                <td class="py-3">{{ new Date(user.createdAt).toLocaleString() }}</td>

              </tr>

            </tbody>

          </table>

        </div>

      </UCard>



      <UCard variant="subtle">

        <template #header>

          <h2 class="font-semibold">Novo usuário</h2>

        </template>



        <form class="space-y-4" @submit.prevent="createUser">

          <UFormField label="Nome">

            <UInput v-model="form.name" required />

          </UFormField>

          <UFormField label="Email">

            <UInput v-model="form.email" type="email" required />

          </UFormField>

          <UFormField label="Senha">

            <UInput v-model="form.password" type="password" required />

          </UFormField>

          <UFormField label="Perfil">

            <USelect

              v-model="form.role"

              :items="[

                { label: 'Usuário', value: 'user' },

                { label: 'Admin', value: 'admin' },

              ]"

            />

          </UFormField>



          <UButton type="submit" block :loading="isCreatingUser">Criar usuário</UButton>

        </form>

      </UCard>

    </div>

  </div>

</template>


