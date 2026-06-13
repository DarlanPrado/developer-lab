<script setup lang="ts">
definePageMeta({ layout: false });

const auth = useAuthStore();

if (!auth.sessionLoaded) {
  await auth.loadSession();
}

await navigateTo(auth.isAuthenticated ? '/dashboard' : '/login');
</script>

<template>
  <div />
</template>
