'use client';

import { useEffect, useState } from 'react';
import { KeyRound, LogOut, Moon, Pencil, Save, Sun, X } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthContext';
import { PageHeader } from '@/components/shell/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { setSession } from '@/lib/auth';
import { resetMyPassword, updateMe } from '@/lib/auth-api';
import { cn } from '@/lib/utils';

const THEME_STORAGE_KEY = 'alubond-theme';

function formatRole(role: string | undefined) {
  return role?.replaceAll('_', ' ') ?? '—';
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-3">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full h-11 px-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600/40 transition-colors';

export default function ProfilePage() {
  const { user, token, setAuthUser, logout } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'ok' | 'err'>('ok');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordTone, setPasswordTone] = useState<'ok' | 'err'>('ok');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
  }, [user?.firstName, user?.lastName]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const isDark = savedTheme
      ? savedTheme === 'dark'
      : document.documentElement.classList.contains('dark') ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'Your profile';

  function openEditProfile() {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setMessage(null);
    setEditingPassword(false);
    setEditingProfile(true);
  }

  function closeEditProfile() {
    setFirstName(user?.firstName ?? '');
    setLastName(user?.lastName ?? '');
    setMessage(null);
    setEditingProfile(false);
  }

  function openEditPassword() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage(null);
    setEditingProfile(false);
    setEditingPassword(true);
  }

  function closeEditPassword() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage(null);
    setEditingPassword(false);
  }

  async function onSave() {
    if (!token) {
      setMessageTone('err');
      setMessage('Session missing. Please login again.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateMe(token, { firstName: firstName.trim(), lastName: lastName.trim() });
      setAuthUser(updated);
      setSession(token, updated);
      setMessageTone('ok');
      setMessage('Profile saved.');
      setEditingProfile(false);
    } catch {
      setMessageTone('err');
      setMessage('Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword() {
    if (!token) {
      setPasswordTone('err');
      setPasswordMessage('Session missing. Please login again.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordTone('err');
      setPasswordMessage('New password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);
    setPasswordMessage(null);
    try {
      await resetMyPassword(token, { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordTone('ok');
      setPasswordMessage('Password updated.');
      setEditingPassword(false);
    } catch (error) {
      setPasswordTone('err');
      setPasswordMessage(error instanceof Error ? error.message : 'Could not update password.');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details and security." />

      <section className="px-4 lg:px-8 pb-10">
        <div className="mx-auto max-w-xl space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <Avatar name={displayName} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold tracking-tight truncate">{displayName}</p>
                <p className="text-sm text-3 truncate mt-0.5">{user?.email ?? '—'}</p>
                <span className="mt-2 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 text-[11px] font-semibold capitalize text-2">
                  {formatRole(user?.role)}
                </span>
              </div>
            </div>

            {message && !editingProfile ? (
              <p
                className={cn(
                  'mt-4 text-sm',
                  messageTone === 'ok'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {message}
              </p>
            ) : null}

            {passwordMessage && !editingPassword ? (
              <p
                className={cn(
                  'mt-4 text-sm',
                  passwordTone === 'ok'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {passwordMessage}
              </p>
            ) : null}
          </Card>

          {!editingProfile && !editingPassword ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex w-full items-center justify-between gap-2 h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  Appearance
                </span>
                <span className="text-xs text-3">{dark ? 'Dark' : 'Light'}</span>
              </button>
              <button
                type="button"
                onClick={openEditProfile}
                className="inline-flex w-full items-center justify-center gap-2 h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
              >
                <Pencil className="h-4 w-4" />
                Edit name
              </button>
              <button
                type="button"
                onClick={openEditPassword}
                className="inline-flex w-full items-center justify-center gap-2 h-11 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors"
              >
                <KeyRound className="h-4 w-4" />
                Change password
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex w-full items-center justify-center gap-2 h-11 px-4 rounded-xl border border-rose-500/25 bg-rose-500/5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          ) : null}

          {editingProfile ? (
            <Card className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Edit name</h2>
                  <p className="text-xs text-3 mt-1">Update how your name appears across the CRM.</p>
                </div>
                <button
                  type="button"
                  onClick={closeEditProfile}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--border)] text-3 hover:bg-[var(--surface-2)]"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="First name">
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className={inputClass}
                    autoComplete="given-name"
                    autoFocus
                  />
                </Field>
                <Field label="Last name">
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className={inputClass}
                    autoComplete="family-name"
                  />
                </Field>
              </div>

              {message ? (
                <p
                  className={cn(
                    'text-sm',
                    messageTone === 'ok'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {message}
                </p>
              ) : null}

              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button variant="soft" size="md" className="w-full sm:w-auto" onClick={closeEditProfile}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                  icon={<Save className="h-4 w-4" />}
                  onClick={() => void onSave()}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </Card>
          ) : null}

          {editingPassword ? (
            <Card className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-2">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight">Change password</h2>
                    <p className="text-xs text-3 mt-1">Minimum 8 characters. Include letters and numbers.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeEditPassword}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--border)] text-3 hover:bg-[var(--surface-2)]"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Field label="Current password">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={inputClass}
                  autoComplete="current-password"
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="New password">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Confirm">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                  />
                </Field>
              </div>

              {passwordMessage ? (
                <p
                  className={cn(
                    'text-sm',
                    passwordTone === 'ok'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {passwordMessage}
                </p>
              ) : null}

              <div className="flex flex-col-reverse sm:flex-row gap-2">
                <Button variant="soft" size="md" className="w-full sm:w-auto" onClick={closeEditPassword}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => void onResetPassword()}
                  disabled={changingPassword}
                >
                  {changingPassword ? 'Updating…' : 'Update password'}
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </section>
    </>
  );
}
