import { create } from 'zustand';
import type { FriendActivityItem, FriendRequestSummary, FriendSummary, PresenceActivity } from '@play-nepal/shared';
import { api, unwrap } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface FriendsState {
  friends: FriendSummary[];
  requests: FriendRequestSummary[];
  feed: FriendActivityItem[];
  loaded: boolean;
  load: () => Promise<void>;
  loadRequests: () => Promise<void>;
  sendRequest: (username: string) => Promise<boolean>;
  accept: (id: string) => Promise<void>;
  decline: (id: string) => Promise<void>;
  remove: (friendId: string) => Promise<void>;
  subscribe: () => void;
  reset: () => void;
}

let subscribed = false;

export const useFriends = create<FriendsState>((set, get) => ({
  friends: [],
  requests: [],
  feed: [],
  loaded: false,

  async load() {
    const [f, r] = await Promise.all([api.get('/friends'), api.get('/friends/requests')]);
    set({
      friends: unwrap<{ friends: FriendSummary[] }>(f.data).friends,
      requests: unwrap<{ requests: FriendRequestSummary[] }>(r.data).requests,
      loaded: true,
    });
  },

  async loadRequests() {
    const r = await api.get('/friends/requests');
    set({ requests: unwrap<{ requests: FriendRequestSummary[] }>(r.data).requests });
  },

  async sendRequest(username) {
    const res = await api.post('/friends/request', { username });
    const { accepted } = unwrap<{ accepted: boolean }>(res.data);
    if (accepted) await get().load();
    return accepted;
  },

  async accept(id) {
    await api.post(`/friends/requests/${id}/accept`);
    set((s) => ({ requests: s.requests.filter((r) => r.id !== id) }));
    await get().load();
  },

  async decline(id) {
    await api.post(`/friends/requests/${id}/decline`);
    set((s) => ({ requests: s.requests.filter((r) => r.id !== id) }));
  },

  async remove(friendId) {
    await api.delete(`/friends/${friendId}`);
    set((s) => ({ friends: s.friends.filter((f) => f.id !== friendId) }));
  },

  subscribe() {
    if (subscribed) return;
    subscribed = true;
    const socket = getSocket();

    socket.on('friend:presence', ({ userId, online, activity }: { userId: string; online: boolean; activity: PresenceActivity | null }) => {
      set((s) => ({
        friends: s.friends
          .map((f) => (f.id === userId ? { ...f, online, activity } : f))
          .sort((a, b) => Number(b.online) - Number(a.online) || a.displayName.localeCompare(b.displayName)),
      }));
    });

    socket.on('friend:event', (item: FriendActivityItem) => {
      set((s) => ({ feed: [item, ...s.feed].slice(0, 40) }));
    });

    socket.on('friend:request', () => { void get().loadRequests(); });
    socket.on('friend:accepted', () => { void get().load(); });
  },

  reset() {
    set({ friends: [], requests: [], feed: [], loaded: false });
  },
}));
