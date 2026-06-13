export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login' || to.path.startsWith('/docs')) {
    return;
  }

  const auth = useAuthStore();

  if (!auth.sessionLoaded) {
    await auth.loadSession();
  }

  if (!auth.isAuthenticated) {
    return navigateTo('/login');
  }

  if (to.path.startsWith('/admin') && !auth.isAdmin) {
    return navigateTo('/dashboard');
  }
});
