type ApiErrorBody = {
  error?: string;
  details?: Array<{ path?: string; message?: string }>;
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const fetchError = error as { data?: ApiErrorBody; statusCode?: number };
  const data = fetchError.data;

  if (data?.error === 'Workspace key already exists') {
    return 'Já existe um workspace com essa key';
  }

  if (data?.error === 'Failed to provision workspace container') {
    return 'Não foi possível criar o container Docker do workspace';
  }

  if (data?.error === 'Validation failed' && data.details?.length) {
    return data.details.map((item) => item.message).filter(Boolean).join('. ');
  }

  if (data?.error) {
    return data.error;
  }

  if (fetchError.statusCode === 401) {
    return 'Sessão expirada. Faça login novamente.';
  }

  return fallback;
}
