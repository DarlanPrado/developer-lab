<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui';

const { data, isPending } = useWorkspacesQuery();
const { mutateAsync: createWorkspaceRequest, isPending: isCreatingWorkspace, reset: resetCreateMutation } =
  useCreateWorkspaceMutation();

const {
  searchTerm: imageSearch,
  images: dockerImages,
  status: imageSearchStatus,
  onOpen: onImageMenuOpen,
} = useDockerHubImageSearch();

const imageItems = computed(() => {
  const items = dockerImages.value ?? [];

  if (form.image && !items.some((item) => item.value === form.image)) {
    return [{ label: form.image, value: form.image }, ...items];
  }

  return items;
});

const form = reactive({
  name: '',
  key: '',
  description: '',
  image: 'node:22-alpine',
  port: 3000,
});

const extraContainers = ref<Array<{ name: string; image: string; port: number | null }>>([]);

function addExtraContainer() {
  extraContainers.value.push({
    name: '',
    image: 'postgres:16',
    port: null,
  });
}

function removeExtraContainer(index: number) {
  extraContainers.value.splice(index, 1);
}

const isKeyManual = ref(false);

watch(
  () => form.name,
  (name) => {
    if (!isKeyManual.value) {
      form.key = slugify(name);
    }
  },
);

watch(
  () => form.key,
  (key) => {
    const autoKey = slugify(form.name);

    if (!key.trim()) {
      isKeyManual.value = false;

      if (autoKey && form.key !== autoKey) {
        form.key = autoKey;
      }

      return;
    }

    isKeyManual.value = key !== autoKey;
  },
);

const portFormatOptions = {
  useGrouping: false,
  maximumFractionDigits: 0,
} satisfies Intl.NumberFormatOptions;

watch(
  () => form.port,
  (value) => {
    if (!Number.isFinite(value)) return;

    const digits = String(Math.trunc(Math.abs(value)));
    if (digits.length > 4) {
      form.port = Number(digits.slice(0, 4));
    }
  },
);

function getImageValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return String((value as { value: unknown }).value).trim();
  }

  return '';
}

function validateForm(): FormError[] {
  const errors: FormError[] = [];

  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.push({ name: 'name', message: 'Informe um nome com pelo menos 2 caracteres' });
  }

  if (form.key.trim() && form.key.trim().length < 2) {
    errors.push({ name: 'key', message: 'A key deve ter pelo menos 2 caracteres' });
  }

  const image = getImageValue(form.image);
  if (!image) {
    errors.push({ name: 'image', message: 'Informe a imagem Docker' });
  }

  const port = Number(form.port);
  if (!Number.isFinite(port) || port < 1000 || port > 9999) {
    errors.push({
      name: 'port',
      message: 'Informe uma porta válida com 4 dígitos (1000-9999)',
    });
  }

  return errors;
}

const { showApiError, showFormErrors, showSuccess } = useAppToast();

async function createWorkspace(event: FormSubmitEvent<typeof form>) {
  resetCreateMutation();

  try {
    await createWorkspaceRequest({
      name: event.data.name.trim(),
      key: event.data.key.trim() || undefined,
      description: event.data.description.trim() || undefined,
      image: getImageValue(event.data.image),
      port: Number(event.data.port),
      containers: [
        {
          name: 'app',
          image: getImageValue(event.data.image),
          port: Number(event.data.port),
          exposeViaTraefik: true,
          isPrimary: true,
          env: [],
          order: 0,
        },
        ...extraContainers.value
          .filter((item) => item.name.trim() && item.image.trim())
          .map((item, index) => ({
            name: item.name.trim(),
            image: item.image.trim(),
            port: item.port,
            exposeViaTraefik: false,
            isPrimary: false,
            env: [],
            order: index + 1,
          })),
      ],
    });

    form.name = '';
    form.key = '';
    form.description = '';
    form.image = 'node:22-alpine';
    form.port = 3000;
    extraContainers.value = [];
    isKeyManual.value = false;
    showSuccess('Workspace criado com sucesso');
  } catch (error) {
    showApiError(error, 'Não foi possível criar o workspace');
  }
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-semibold text-highlighted">Workspaces</h1>
      <p class="text-muted">Ambientes isolados para desenvolvimento</p>
    </div>

    <div class="grid gap-8 xl:grid-cols-[1fr_400px]">
      <div>
        <div v-if="isPending" class="text-muted">Carregando workspaces...</div>

        <div v-else-if="!data?.length" class="rounded-xl border border-dashed border-default p-8 text-center">
          <UIcon name="i-lucide-boxes" class="mx-auto mb-3 size-8 text-muted" />
          <p class="text-muted">Nenhum workspace criado ainda</p>
        </div>

        <div v-else class="space-y-3">
          <UCard v-for="workspace in data" :key="workspace.id" variant="subtle">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="font-semibold text-highlighted">{{ workspace.name }}</h2>
                <p class="text-sm text-muted">{{ workspace.key }}</p>
              </div>

              <div class="flex items-center gap-3 shrink-0">
                <UBadge :color="workspace.status === 'running' ? 'success' : 'neutral'">
                  {{ workspace.status }}
                </UBadge>
                <UButton :to="`/workspaces/${workspace.key}`" size="sm">Detalhes</UButton>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <UCard variant="subtle" class="h-fit">
        <template #header>
          <div>
            <h2 class="font-semibold text-highlighted">Novo workspace</h2>
            <p class="text-sm text-muted">Crie um ambiente isolado para desenvolvimento</p>
          </div>
        </template>

        <UForm
          :state="form"
          :validate="validateForm"
          class="space-y-4"
          @submit="createWorkspace"
          @error="showFormErrors"
        >
          <UFormField label="Nome" name="name" required>
            <UInput v-model="form.name" placeholder="Frontend Checkout" class="w-full" />
          </UFormField>

          <UFormField label="Key" name="key" hint="Opcional. Gerada automaticamente a partir do nome">
            <UInput v-model="form.key" placeholder="frontend-checkout" class="w-full" />
          </UFormField>

          <UFormField label="Descrição" name="description">
            <UTextarea v-model="form.description" :rows="3" class="w-full" />
          </UFormField>

          <UFormField
            label="Imagem Docker"
            name="image"
            required
            hint="Busque no Docker Hub ou informe uma imagem customizada"
          >
            <USelectMenu
              v-model="form.image"
              v-model:search-term="imageSearch"
              value-key="value"
              :items="imageItems"
              :loading="imageSearchStatus === 'pending'"
              :search-input="{
                icon: 'i-lucide-search',
                loading: imageSearchStatus === 'pending',
                placeholder: 'Buscar no Docker Hub...',
              }"
              ignore-filter
              icon="i-lucide-container"
              placeholder="node:22-alpine"
              :create-item="{ when: 'always' }"
              class="w-full"
              @update:open="onImageMenuOpen"
            />
          </UFormField>

          <UFormField label="Porta" name="port" required>
            <UInputNumber
              v-model="form.port"
              :min="1000"
              :max="9999"
              :step="1"
              :format-options="portFormatOptions"
              placeholder="3000"
              class="w-full"
            />
          </UFormField>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-sm font-medium text-highlighted">Serviços adicionais</p>
              <UButton size="xs" variant="soft" icon="i-lucide-plus" @click="addExtraContainer">
                Adicionar
              </UButton>
            </div>

            <div
              v-for="(container, index) in extraContainers"
              :key="index"
              class="space-y-2 rounded-lg border border-default p-3"
            >
              <UFormField label="Nome">
                <UInput v-model="container.name" placeholder="postgres" class="w-full" />
              </UFormField>
              <UFormField label="Imagem">
                <UInput v-model="container.image" placeholder="postgres:16" class="w-full" />
              </UFormField>
              <UFormField label="Porta">
                <UInputNumber v-model="container.port" :min="1" :max="65535" class="w-full" />
              </UFormField>
              <UButton size="xs" color="error" variant="ghost" @click="removeExtraContainer(index)">
                Remover
              </UButton>
            </div>
          </div>

          <UButton type="submit" block size="lg" :loading="isCreatingWorkspace">
            Criar workspace
          </UButton>
        </UForm>
      </UCard>
    </div>
  </div>
</template>
