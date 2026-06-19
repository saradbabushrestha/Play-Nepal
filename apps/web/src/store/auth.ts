import { create } from 'zustand';
import type { PublicUser } from '@play-nepal/shared';
import { api, refreshAccessToken, setAccessToken, unwrap } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  xp: number;
  level: number;
  country?: string | null;
  city?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  status: 'loading' | 'authenticated' | 'anonymous';
  register: (input: { email: string; username: string; password: string; displayName?: string }) => Promise<void>;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
}

function applySession(set: (s: Partial<AuthState>) => void, data: { user: AuthUser; accessToken: string }) {
  setAccessToken(data.accessToken);
  set({ user: data.user, status: 'authenticated' });
  connectSocket();
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  async register(input) {
    const data = unwrap<{ user: AuthUser; accessToken: string }>((await api.post('/auth/register', input)).data);
    applySession(set, data);
  },

  async login(emailOrUsername, password) {
    const data = unwrap<{ user: AuthUser; accessToken: string }>(
      (await api.post('/auth/login', { emailOrUsername, password })).data,
    );
    applySession(set, data);
  },

  async loginWithGoogle(idToken) {
    const data = unwrap<{ user: AuthUser; accessToken: string }>((await api.post('/auth/google', { idToken })).data);
    applySession(set, data);
  },

  async logout() {
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    disconnectSocket();
    set({ user: null, status: 'anonymous' });
  },

  async bootstrap() {
    const token = await refreshAccessToken();
    if (!token) return set({ status: 'anonymous' });
    try {
      const { user } = unwrap<{ user: AuthUser }>((await api.get('/auth/me')).data);
      set({ user, status: 'authenticated' });
      connectSocket();
    } catch {
      set({ status: 'anonymous' });
    }
  },
}));

export type { PublicUser };
