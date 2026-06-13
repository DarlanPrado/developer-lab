<script setup lang="ts">
definePageMeta({ layout: 'docs' });

const route = useRoute();
const slug = computed(() => route.params.slug as string);

const { data: page } = await useAsyncData(
  () => `docs-${slug.value}`,
  () => queryCollection('docs').path(`/docs/${slug.value}`).first(),
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
