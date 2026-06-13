import type { AuthResponse } from '@developer-lab/shared';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const body = await readBody<{ name: string; email: string; password: string; rememberMe?: boolean }>(event);

  const response = await $fetch<AuthResponse>(`${config.apiUrl}/auth/register`, {
    method: 'POST',
    body: {
      name: body.name,
      email: body.email,
      password: body.password,
    },
  });

  setSessionCookie(event, response.token, body.rememberMe !== false);

  return { user: response.user };
});
