export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxt/content'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    apiUrl: process.env.NUXT_API_URL ?? 'http://localhost:3001',
  },
  nitro: {
    experimental: {
      websocket: true,
    },
  },
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },
  routeRules: {
    '/docker-hub/**': { proxy: 'https://hub.docker.com/**' },
  },
  build: {
    transpile: ['@vueuse/core', '@vueuse/shared'],
  },
});