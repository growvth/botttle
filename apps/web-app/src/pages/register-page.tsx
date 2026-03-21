import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '@botttle/ui';
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
  const { theme } = useTheme();
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
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo className="h-14 w-14 object-contain" />
          <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div
              className={cn(
                'rounded-md px-3 py-2 text-sm',
                theme === 'dark' ? 'bg-destructive/20 text-red-300' : 'bg-destructive/10 text-destructive'
              )}
            >
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              {...register('name')}
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2 font-medium text-white shadow-subtle hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="text-center text-sm text-foreground-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
