export function useApi() {
  const fetcher = import.meta.server ? useRequestFetch() : $fetch;

  async function api<T>(
    path: string,
    options: Parameters<typeof $fetch>[1] = {},
  ): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return fetcher<T>(`/api${normalizedPath}`, {
      ...options,
      credentials: 'include',
    });
  }

  return { api };
}
