import type { User } from '@developer-lab/shared';

const REMEMBER_KEY = 'developer-lab-remember-me';
const EMAIL_KEY = 'developer-lab-email';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const rememberMe = ref(true);
  const sessionLoaded = ref(false);

  const isAuthenticated = computed(() => Boolean(user.value));
  const isAdmin = computed(() => user.value?.role === 'admin');

  function loadRememberPreference() {
    if (!import.meta.client) return;

    const stored = localStorage.getItem(REMEMBER_KEY);
    rememberMe.value = stored !== 'false';
  }

  function loadSavedEmail(): string {
    if (!import.meta.client || !rememberMe.value) return '';
    return localStorage.getItem(EMAIL_KEY) ?? '';
  }

  function saveRememberPreference(remember: boolean) {
    rememberMe.value = remember;

    if (!import.meta.client) return;

    localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');

    if (!remember) {
      localStorage.removeItem(EMAIL_KEY);
    }
  }

  function saveEmail(email: string) {
    if (!import.meta.client || !rememberMe.value) return;
    localStorage.setItem(EMAIL_KEY, email);
  }

  function setSession(nextUser: User, remember: boolean) {
    user.value = nextUser;
    sessionLoaded.value = true;
    saveRememberPreference(remember);
    saveEmail(nextUser.email);
  }

  async function loadSession() {
    const { api } = useApi();

    try {
      user.value = await api<User>('/auth/me');
    } catch {
      user.value = null;
    } finally {
      sessionLoaded.value = true;
    }
  }

  async function clearSession() {
    const { api } = useApi();

    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout.
    }

    user.value = null;
    sessionLoaded.value = true;
  }

  return {
    user,
    rememberMe,
    sessionLoaded,
    isAuthenticated,
    isAdmin,
    loadRememberPreference,
    loadSavedEmail,
    setSession,
    loadSession,
    clearSession,
  };
});
