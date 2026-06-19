import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from '@/store/auth';
import { apiError } from '@/lib/api';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/lobby';

  const [emailOrUsername, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(emailOrUsername, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back 👋</CardTitle>
          <p className="text-sm text-muted-foreground">Log in to keep climbing the ranks.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={submit} className="space-y-3">
            <Input placeholder="Email or username" value={emailOrUsername} onChange={(e) => setId(e.target.value)} autoComplete="username" required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>Log in</Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
              </div>
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={async (cred) => {
                      if (cred.credential) {
                        try {
                          await loginWithGoogle(cred.credential);
                          navigate(from, { replace: true });
                        } catch (err) {
                          setError(apiError(err));
                        }
                      }
                    }}
                    onError={() => setError('Google sign-in failed.')}
                  />
                </div>
              </GoogleOAuthProvider>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">Create an account</Link>
          </p>
          <p className="rounded-lg bg-muted/50 p-2 text-center text-xs text-muted-foreground">
            Demo: <b>sagar</b> / <b>password123</b>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
