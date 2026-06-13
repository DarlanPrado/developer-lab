<script setup lang="ts">
import { docsNavItems, isDocsNavActive } from '~/utils/docs-nav';

const route = useRoute();
</script>

<template>
  <div class="min-h-screen flex bg-default">
    <aside class="w-64 shrink-0 border-r border-default bg-elevated/50 flex flex-col">
      <div class="border-b border-default p-4">
        <NuxtLink
          to="/dashboard"
          class="inline-flex items-center gap-2 text-sm text-muted hover:text-highlighted transition-colors"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4" />
          Voltar para a plataforma
        </NuxtLink>
        <div class="mt-4">
          <p class="text-xs uppercase tracking-widest text-primary">Developer Lab</p>
          <h1 class="text-lg font-semibold text-highlighted">Documentação</h1>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto p-3 space-y-1">
        <NuxtLink
          v-for="item in docsNavItems"
          :key="item.to"
          :to="item.to"
          class="block rounded-lg px-3 py-2 text-sm transition-colors"
          :class="
            isDocsNavActive(route.path, item.to)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted hover:bg-elevated hover:text-highlighted'
          "
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </aside>

    <main class="flex-1 overflow-auto">
      <div class="mx-auto w-full max-w-3xl p-6 lg:p-10">
        <slot />
      </div>
    </main>
  </div>
</template>

<style>
.docs-content h1 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--ui-text-highlighted);
}

.docs-content h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  color: var(--ui-text-highlighted);
}

.docs-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--ui-text-highlighted);
}

.docs-content p,
.docs-content li {
  line-height: 1.7;
  color: var(--ui-text-muted);
}

.docs-content p {
  margin-bottom: 1rem;
}

.docs-content ul,
.docs-content ol {
  margin-bottom: 1rem;
  padding-left: 1.5rem;
}

.docs-content li {
  margin-bottom: 0.35rem;
}

.docs-content a {
  color: var(--ui-primary);
  text-decoration: underline;
}

.docs-content code {
  font-size: 0.875em;
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  background: var(--ui-bg-elevated);
  color: var(--ui-primary);
}

.docs-content pre {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 0.75rem;
  overflow-x: auto;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
}

.docs-content pre code {
  padding: 0;
  background: transparent;
  color: inherit;
}

.docs-content table {
  width: 100%;
  margin-bottom: 1rem;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.docs-content th,
.docs-content td {
  border: 1px solid var(--ui-border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.docs-content th {
  background: var(--ui-bg-elevated);
  color: var(--ui-text-highlighted);
  font-weight: 600;
}

.docs-content hr {
  margin: 2rem 0;
  border-color: var(--ui-border);
}
</style>
