<script setup lang="ts">
definePageMeta({ layout: 'docs' });

const { data: page } = await useAsyncData('docs-index', () =>
  queryCollection('docs').path('/docs').first(),
);

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Documento não encontrado' });
}
</script>

<template>
  <article v-if="page" class="docs-content">
    <ContentRenderer :value="page" />
  </article>
</template>
