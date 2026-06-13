export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname;

  if (!path.startsWith('/api/')) {
    return;
  }

  if (
    path === '/api/auth/login'
    || path === '/api/auth/register'
    || path === '/api/auth/logout'
  ) {
    return;
  }

  injectAuthHeader(event);
});
