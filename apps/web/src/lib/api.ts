import axios, { type AxiosInstance } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/** In-memory access token (refresh token lives in an httpOnly cookie). */
let accessToken: string | null = null;
export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Transparently refresh once on 401, then retry the original request.
let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      refreshing ??= refreshAccessToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await axios.post(
      `${BASE_URL}/api/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const token = data?.data?.accessToken ?? null;
    setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    return null;
  }
}

/** Unwrap the `{ ok, data }` envelope or throw a readable error. */
export function unwrap<T>(payload: { ok: boolean; data?: T; message?: string }): T {
  if (!payload.ok || payload.data === undefined) {
    throw new Error(payload.message ?? 'Request failed');
  }
  return payload.data;
}

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong';
}
