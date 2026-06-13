import type { CreateResourceRequest, Resource } from '@developer-lab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

export function useResourcesQuery() {
  const { api } = useApi();
  return useQuery({
    queryKey: ['resources'],
    queryFn: () => api<Resource[]>('/resources'),
  });
}

export function useCreateResourceMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateResourceRequest) =>
      api<Resource>('/resources', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  });
}
