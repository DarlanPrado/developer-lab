import type { FormErrorEvent } from '@nuxt/ui';

type ToastColor = 'error' | 'success' | 'warning' | 'info' | 'primary' | 'neutral';

export function useAppToast() {
  const toast = useToast();

  function show(
    title: string,
    options?: {
      description?: string;
      color?: ToastColor;
      icon?: string;
    },
  ) {
    toast.add({
      title,
      description: options?.description,
      color: options?.color ?? 'neutral',
      icon: options?.icon,
    });
  }

  function showError(title: string, description?: string) {
    show(title, {
      description,
      color: 'error',
      icon: 'i-lucide-circle-x',
    });
  }

  function showSuccess(title: string, description?: string) {
    show(title, {
      description,
      color: 'success',
      icon: 'i-lucide-circle-check',
    });
  }

  function showWarning(title: string, description?: string) {
    show(title, {
      description,
      color: 'warning',
      icon: 'i-lucide-triangle-alert',
    });
  }

  function showInfo(title: string, description?: string) {
    show(title, {
      description,
      color: 'info',
      icon: 'i-lucide-info',
    });
  }

  function showApiError(error: unknown, fallback: string) {
    showError(getApiErrorMessage(error, fallback));
  }

  function showFormErrors(event: FormErrorEvent, fallback = 'Verifique os campos do formulário') {
    const message = event.errors
      .map((item) => item.message)
      .filter(Boolean)
      .join('. ');

    showError(message || fallback);
  }

  return {
    toast,
    show,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    showApiError,
    showFormErrors,
  };
}
