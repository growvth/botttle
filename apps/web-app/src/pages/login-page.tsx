import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@botttle/ui';
import { useAuthStore } from '@/stores/auth-store';
import { login as loginApi } from '@/lib/api';
import { BrandLogo } from '@/components/brand-logo';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await loginApi(data.email, data.password);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
    navigate('/', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
          <div className="flex flex-col items-center gap-3">
            <BrandLogo className="h-12 w-12 object-contain" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in to botttle</h1>
            <p className="text-sm text-foreground-muted">Welcome back. Enter your credentials below.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input-field"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs font-medium text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="input-field"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs font-medium text-destructive">{errors.password.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-50',
                !isSubmitting && 'active:scale-[0.98]'
              )}
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
        <div className="mt-6 space-y-2 text-center text-sm text-foreground-muted">
          <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
            Forgot your password?
          </Link>
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
