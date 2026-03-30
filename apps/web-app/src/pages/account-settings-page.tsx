import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { cn } from '@botttle/ui';
import { changePassword, fetchUserMe, patchUser } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export function AccountSettingsPage() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const storeUser = useAuthStore((s) => s.user);

  const { data: meRes, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: () => fetchUserMe(),
  });

  const me = meRes?.success ? meRes.data : null;
  const [name, setName] = useState('');

  useEffect(() => {
    if (me) setName(me.name ?? '');
  }, [me]);

  const saveMutation = useMutation({
    mutationFn: async (nextName: string) => {
      if (!storeUser) throw new Error('Not signed in');
      const res = await patchUser(storeUser.id, { name: nextName.trim() || undefined });
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (data) => {
      if (!storeUser || !accessToken || !refreshToken) return;
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      setAuth(accessToken, refreshToken, {
        id: storeUser.id,
        email: data.email,
        role: data.role,
        name: data.name,
      });
    },
  });

  const errorMsg = saveMutation.isError ? (saveMutation.error as Error).message : null;

  const pwdMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const res = await changePassword(currentPassword, newPassword);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (data) => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (!accessToken || !refreshToken) return;
      setAuth(data.accessToken, data.refreshToken, {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name,
      });
    },
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const pwdError = pwdMutation.isError ? (pwdMutation.error as Error).message : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Account</h1>
        <p className="mt-1 text-sm text-foreground-muted">Your profile, password, and display name.</p>
      </div>

      {isLoading && <p className="text-sm text-foreground-muted">Loading…</p>}

      {me && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(name);
          }}
          className="rounded-xl border border-border bg-surface p-6 shadow-card"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
              <input type="email" value={me.email} disabled className="input-field bg-muted/50 text-foreground-muted" />
              <p className="mt-1 text-xs text-foreground-muted">Email cannot be changed here.</p>
            </div>
            <div>
              <label htmlFor="display-name" className="mb-1.5 block text-sm font-medium text-foreground">
                Display name
              </label>
              <input
                id="display-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
            {errorMsg && (
              <p className="text-sm text-destructive" role="alert">
                {errorMsg}
              </p>
            )}
            <button
              type="submit"
              disabled={saveMutation.isPending || name.trim() === (me.name ?? '').trim()}
              className={cn(
                'rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50',
                'bg-primary'
              )}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}

      {me && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newPassword !== confirmPassword) return;
            pwdMutation.mutate({ currentPassword, newPassword });
          }}
          className="rounded-xl border border-border bg-surface p-6 shadow-card"
        >
          <h2 className="mb-4 text-lg font-semibold text-foreground">Change password</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-foreground">
                Current password
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input-field"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-foreground">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-field"
                autoComplete="new-password"
                minLength={8}
              />
              <p className="mt-1 text-xs text-foreground-muted">At least 8 characters.</p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-foreground">
                Confirm new password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                autoComplete="new-password"
              />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">New passwords do not match.</p>
            )}
            {pwdError && (
              <p className="text-sm text-destructive" role="alert">
                {pwdError}
              </p>
            )}
            <button
              type="submit"
              disabled={
                pwdMutation.isPending ||
                !currentPassword ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
              className={cn(
                'rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50',
                'bg-primary'
              )}
            >
              {pwdMutation.isPending ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
