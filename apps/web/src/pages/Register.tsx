import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { apiError } from '@/lib/api';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register({
        email: form.email,
        username: form.username,
        password: form.password,
        displayName: form.displayName || undefined,
      });
      navigate('/lobby', { replace: true });
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
          <CardTitle className="text-2xl">Create your account 🎮</CardTitle>
          <p className="text-sm text-muted-foreground">Join the arena in seconds. It’s free.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input placeholder="Display name" value={form.displayName} onChange={set('displayName')} />
            <Input placeholder="Username" value={form.username} onChange={set('username')} autoComplete="username" required minLength={3} />
            <Input type="email" placeholder="Email" value={form.email} onChange={set('email')} autoComplete="email" required />
            <Input type="password" placeholder="Password (min 8 chars)" value={form.password} onChange={set('password')} autoComplete="new-password" required minLength={8} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" loading={loading}>Create account</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
