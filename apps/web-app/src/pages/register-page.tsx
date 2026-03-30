import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@botttle/ui';
import { useAuthStore } from '@/stores/auth-store';
import { register as registerApi } from '@/lib/api';
import { BrandLogo } from '@/components/brand-logo';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  name: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', name: '' },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await registerApi({
      email: data.email,
      password: data.password,
      name: data.name ?? undefined,
    });
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
            <h1 className="text-xl font-bold tracking-tight text-foreground">Create your account</h1>
            <p className="text-sm text-foreground-muted">Get started with botttle in seconds.</p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                Name (optional)
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                className="input-field"
                {...register('name')}
              />
            </div>
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
                autoComplete="new-password"
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
              {isSubmitting ? 'Creating account…' : 'Sign up'}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-foreground-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
