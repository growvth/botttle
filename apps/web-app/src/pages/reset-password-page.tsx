import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@botttle/ui';
import { resetPassword as resetPasswordApi } from '@/lib/api';
import { BrandLogo } from '@/components/brand-logo';

const schema = z
  .object({
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const token = useMemo(() => params.get('token') ?? '', [params]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    if (!token) {
      setError('Missing reset token.');
      return;
    }
    const res = await resetPasswordApi(token, data.newPassword);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate('/login', { replace: true }), 500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
          <div className="flex flex-col items-center gap-3">
            <BrandLogo className="h-12 w-12 object-contain" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">Set a new password</h1>
            <p className="text-sm text-foreground-muted">Choose a new password for your account.</p>
          </div>

          {done ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-sm text-foreground">
                Password updated. Redirecting to sign in…
              </div>
              <Link to="/login" className="block text-center text-sm font-semibold text-primary hover:underline">
                Go to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-foreground">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  className="input-field"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="mt-1.5 text-xs font-medium text-destructive">{errors.newPassword.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-foreground">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="input-field"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="mt-1.5 text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !token}
                className={cn(
                  'w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:opacity-50',
                  !isSubmitting && 'active:scale-[0.98]'
                )}
              >
                {isSubmitting ? 'Updating…' : 'Update password'}
              </button>
              {!token && <p className="text-xs font-medium text-destructive">This reset link is missing a token.</p>}
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-foreground-muted">
          Need a new link?{' '}
          <Link to="/forgot-password" className="font-semibold text-primary hover:underline">
            Request reset
          </Link>
        </p>
      </div>
    </div>
  );
}

