import type { CreateTemplateRequest, Template } from '@developer-lab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';

export function useTemplatesQuery() {
  const { api } = useApi();
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => api<Template[]>('/templates'),
  });
}

export function useCreateTemplateMutation() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTemplateRequest) =>
      api<Template>('/templates', { method: 'POST', body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });
}
