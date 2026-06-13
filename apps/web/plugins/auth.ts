export default defineNuxtPlugin(async () => {
  const auth = useAuthStore();

  if (!auth.sessionLoaded) {
    await auth.loadSession();
  }
});
