const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (fetchOptions.headers) {
    Object.assign(headers, fetchOptions.headers);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: { email: string; password: string; name?: string }) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  // URLs
  submitUrls: (urls: string[], token: string) =>
    apiFetch('/urls/submit', {
      method: 'POST',
      body: JSON.stringify({ urls }),
      token,
    }),

  getHistory: (token: string, params?: { page?: number; limit?: number; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiFetch(`/urls/history?${query}`, { token });
  },

  // Stats
  getStats: (token: string) => apiFetch('/stats', { token }),

  getQuotas: (token: string) => apiFetch('/quotas', { token }),

  // Service Accounts
  getServiceAccounts: (token: string) => apiFetch('/service-accounts', { token }),

  addServiceAccount: (jsonKey: any, token: string) =>
    apiFetch('/service-accounts', {
      method: 'POST',
      body: JSON.stringify({ jsonKey }),
      token,
    }),

  deleteServiceAccount: (id: string, token: string) =>
    apiFetch(`/service-accounts/${id}`, { method: 'DELETE', token }),

  // User settings
  updateSettings: (data: any, token: string) =>
    apiFetch('/user/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
      token,
    }),
};
