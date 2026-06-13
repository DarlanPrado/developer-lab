export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const path = event.context.params?.path;

  if (!path) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  injectAuthHeader(event);

  const target = `${config.apiUrl}/${Array.isArray(path) ? path.join('/') : path}`;
  return proxyRequest(event, target);
});
