import { refDebounced } from '@vueuse/core';
import type { DockerImageOption } from '~/utils/dockerHub';

export function useDockerHubImageSearch() {
  const searchTerm = ref('');
  const searchTermDebounced = refDebounced(searchTerm, 300);

  const { data: images, status, execute } = useLazyFetch<DockerImageOption[]>(
    '/api/docker/images',
    {
      key: 'docker-hub-images',
      params: { q: searchTermDebounced },
      immediate: false,
    },
  );

  function onOpen(open: boolean) {
    if (open) {
      execute();
    }
  }

  return {
    searchTerm,
    images,
    status,
    onOpen,
  };
}
