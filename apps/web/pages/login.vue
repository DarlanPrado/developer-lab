<script setup lang="ts">
import type { User } from '@developer-lab/shared';

definePageMeta({ layout: false });

const auth = useAuthStore();
const { api } = useApi();

const form = reactive({
  email: '',
  password: '',
});

const rememberMe = ref(true);
const loading = ref(false);
const { showError } = useAppToast();

onMounted(() => {
  auth.loadRememberPreference();
  rememberMe.value = auth.rememberMe;
  form.email = auth.loadSavedEmail();
});

async function submit() {
  loading.value = true;

  try {
    const response = await api<{ user: User }>('/auth/login', {
      method: 'POST',
      body: {
        email: form.email,
        password: form.password,
        rememberMe: rememberMe.value,
      },
    });

    auth.setSession(response.user, rememberMe.value);
    await navigateTo('/dashboard');
  } catch {
    showError('Credenciais inválidas');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-default">
    <UCard class="w-full max-w-md" variant="subtle">
      <template #header>
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-widest text-primary">Developer Lab</p>
          <h1 class="text-2xl font-semibold text-highlighted">Entrar</h1>
          <p class="text-sm text-muted">Acesse o laboratório de desenvolvimento</p>
        </div>
      </template>

      <form class="space-y-5" @submit.prevent="submit">
        <UFormField label="Email" required>
          <UInput
            v-model="form.email"
            type="email"
            placeholder="admin@lab.local"
            icon="i-lucide-mail"
            class="w-full"
            required
          />
        </UFormField>

        <UFormField label="Senha" required>
          <UInput
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            icon="i-lucide-lock"
            class="w-full"
            required
          />
        </UFormField>

        <UCheckbox v-model="rememberMe" label="Lembrar de mim" />

        <UButton type="submit" block size="lg" :loading="loading">
          Entrar
        </UButton>
      </form>
    </UCard>
  </div>
</template>
