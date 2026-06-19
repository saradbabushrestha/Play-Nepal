import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/store/auth';
import { Spinner } from '@/components/ui';
import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Lobby } from '@/pages/Lobby';
import { RoomPage } from '@/pages/Room';
import { Leaderboard } from '@/pages/Leaderboard';
import { Profile } from '@/pages/Profile';
import { Showcase } from '@/pages/Showcase';
import { Friends } from '@/pages/Friends';
import { useFriends } from '@/store/friends';

export default function App() {
  const { status, bootstrap } = useAuth();
  const initFriends = useFriends((s) => s.load);
  const subscribeFriends = useFriends((s) => s.subscribe);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Once signed in, load friends + subscribe so the nav badge and live feed
  // work app-wide.
  useEffect(() => {
    if (status === 'authenticated') { void initFriends(); subscribeFriends(); }
    else if (status === 'anonymous') useFriends.getState().reset();
  }, [status, initFriends, subscribeFriends]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/showcase" element={<Showcase />} />
        <Route path="/u/:username" element={<Profile />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/room/:code" element={<RoomPage />} />
          <Route path="/friends" element={<Friends />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
