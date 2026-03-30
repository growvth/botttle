import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@botttle/ui';
import { forgotPassword as forgotPasswordApi } from '@/lib/api';
import { BrandLogo } from '@/components/brand-logo';

const schema = z.object({
  email: z.string().email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const res = await forgotPasswordApi(data.email);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
          <div className="flex flex-col items-center gap-3">
            <BrandLogo className="h-12 w-12 object-contain" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">Reset your password</h1>
            <p className="text-sm text-foreground-muted">
              Enter your email and we’ll send a reset link if an account exists.
            </p>
          </div>

          {sent ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-sm text-foreground">
                If an account exists for that email, a reset link is on its way.
              </div>
              <Link to="/login" className="block text-center text-sm font-semibold text-primary hover:underline">
                Back to sign in
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
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                  Email
                </label>
                <input id="email" type="email" autoComplete="email" className="input-field" {...register('email')} />
                {errors.email && (
                  <p className="mt-1.5 text-xs font-medium text-destructive">{errors.email.message}</p>
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
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-foreground-muted">
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

