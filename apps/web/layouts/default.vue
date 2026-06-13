<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const auth = useAuthStore();
const app = useAppStore();
const route = useRoute();

const mainNav = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: 'i-lucide-layout-dashboard',
    active: route.path === '/dashboard',
  },
  {
    label: 'Recursos',
    to: '/resources',
    icon: 'i-lucide-database',
    active: route.path.startsWith('/resources'),
  },
  {
    label: 'Workspaces',
    to: '/workspaces',
    icon: 'i-lucide-boxes',
    active: route.path.startsWith('/workspaces'),
  },
  {
    label: 'Documentação',
    to: '/docs',
    icon: 'i-lucide-book-open',
    active: route.path.startsWith('/docs'),
  },
]);

const adminNav = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Visão geral',
    to: '/admin',
    icon: 'i-lucide-shield',
    active: route.path === '/admin',
  },
  {
    label: 'Usuários',
    to: '/admin/users',
    icon: 'i-lucide-users',
    active: route.path === '/admin/users',
  },
  {
    label: 'Times',
    to: '/admin/teams',
    icon: 'i-lucide-users-round',
    active: route.path === '/admin/teams',
  },
  {
    label: 'Recursos',
    to: '/admin/resources',
    icon: 'i-lucide-server',
    active: route.path === '/admin/resources',
  },
  {
    label: 'Templates',
    to: '/admin/templates',
    icon: 'i-lucide-file-code-2',
    active: route.path === '/admin/templates',
  },
]);

async function logout() {
  await auth.clearSession();
  await navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen flex bg-default">
    <aside
      :class="[
        'border-r border-default bg-elevated/50 flex flex-col shrink-0 transition-all duration-200',
        app.sidebarOpen ? 'w-64' : 'w-16',
      ]"
    >
      <div class="flex items-center justify-between gap-2 p-4 border-b border-default">
        <div v-if="app.sidebarOpen" class="min-w-0">
          <p class="text-xs uppercase tracking-widest text-primary">Developer Lab</p>
          <h1 class="text-lg font-semibold text-highlighted truncate">Plataforma</h1>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          :icon="app.sidebarOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'"
          :class="app.sidebarOpen ? '' : 'mx-auto'"
          @click="app.toggleSidebar()"
        />
      </div>

      <nav class="flex-1 overflow-y-auto p-3 space-y-6">
        <div>
          <p
            v-if="app.sidebarOpen"
            class="mb-2 px-2 text-xs uppercase tracking-widest text-muted"
          >
            Laboratório
          </p>
          <UNavigationMenu
            :collapsed="!app.sidebarOpen"
            :items="mainNav"
            orientation="vertical"
            variant="pill"
            color="primary"
          />
        </div>

        <div v-if="auth.isAdmin">
          <p
            v-if="app.sidebarOpen"
            class="mb-2 px-2 text-xs uppercase tracking-widest text-warning"
          >
            Administração
          </p>
          <UNavigationMenu
            :collapsed="!app.sidebarOpen"
            :items="adminNav"
            orientation="vertical"
            variant="pill"
            color="neutral"
          />
        </div>
      </nav>

      <div class="border-t border-default p-4">
        <template v-if="app.sidebarOpen">
          <p class="text-sm text-highlighted">{{ auth.user?.name }}</p>
          <p class="text-xs text-muted">{{ auth.user?.email }}</p>
          <UBadge v-if="auth.isAdmin" class="mt-2" color="warning" variant="soft">Admin</UBadge>
        </template>
        <UButton
          class="mt-3"
          color="neutral"
          variant="soft"
          :block="app.sidebarOpen"
          :icon="app.sidebarOpen ? 'i-lucide-log-out' : 'i-lucide-log-out'"
          @click="logout"
        >
          <span v-if="app.sidebarOpen">Sair</span>
        </UButton>
      </div>
    </aside>

    <main class="flex-1 overflow-auto">
      <div class="p-6 lg:p-8 max-w-7xl mx-auto w-full">
        <slot />
      </div>
    </main>
  </div>
</template>
