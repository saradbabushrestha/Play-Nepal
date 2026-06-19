import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Gamepad2, LogOut, Moon, Sun, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { useFriends } from '@/store/friends';
import { Avatar, Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

export function Layout() {
  const { user, status, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const requestCount = useFriends((s) => s.requests.length);
  const onlineFriends = useFriends((s) => s.friends.filter((f) => f.online).length);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">🇳🇵</span>
            <span className="text-gradient">Play Nepal</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavItem to="/lobby" icon={<Gamepad2 className="h-4 w-4" />}>Play</NavItem>
            <NavItem to="/leaderboard" icon={<Trophy className="h-4 w-4" />}>Leaderboard</NavItem>
            {status === 'authenticated' && (
              <NavItem to="/friends" icon={<Users className="h-4 w-4" />}>
                <span className="flex items-center gap-1.5">
                  Friends
                  {requestCount > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{requestCount}</span>}
                  {requestCount === 0 && onlineFriends > 0 && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                </span>
              </NavItem>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {status === 'authenticated' && user ? (
              <div className="flex items-center gap-2">
                <Link to={`/u/${user.username}`} className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 hover:bg-secondary">
                  <Avatar name={user.displayName} src={user.avatarUrl} className="h-7 w-7" />
                  <span className="hidden text-sm font-semibold sm:block">{user.displayName}</span>
                  <Badge variant="accent" className="hidden sm:inline-flex">Lv {user.level}</Badge>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Log out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>Log in</Button>
                <Button onClick={() => navigate('/register')}>Sign up</Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 text-center text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" /> Built for Nepal’s gaming community
          </div>
          <p>© {new Date().getFullYear()} Play Nepal. A demo platform.</p>
        </div>
      </footer>
    </div>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}
