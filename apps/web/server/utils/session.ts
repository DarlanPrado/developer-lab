export const TOKEN_COOKIE = 'lab-token';
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export function getSessionToken(event: { node: { req: { headers: { cookie?: string; authorization?: string } } } }) {
  const cookieHeader = event.node.req.headers.cookie ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function setSessionCookie(
  event: Parameters<typeof setCookie>[0],
  token: string,
  remember: boolean,
) {
  setCookie(event, TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  });
}

export function clearSessionCookie(event: Parameters<typeof deleteCookie>[0]) {
  deleteCookie(event, TOKEN_COOKIE, { path: '/' });
}

export function injectAuthHeader(event: { node: { req: { headers: { authorization?: string } } } }) {
  const token = getSessionToken(event);
  if (token) {
    event.node.req.headers.authorization = `Bearer ${token}`;
  }
}

export function getTokenFromRequest(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
