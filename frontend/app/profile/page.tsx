'use client';

import { useState } from 'react';
import { LogOut, Save } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthContext';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { setSession } from '@/lib/auth';
import { resetMyPassword, updateMe } from '@/lib/auth-api';

export default function ProfilePage() {
  const { user, token, setAuthUser, logout } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  async function onSave() {
    if (!token) {
      setMessage('Session missing. Please login again.');
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateMe(token, { firstName, lastName });
      setAuthUser(updated);
      setSession(token, updated);
      setMessage('Profile updated successfully.');
    } catch {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword() {
    if (!token) {
      setPasswordMessage('Session missing. Please login again.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('New password and confirm password do not match.');
      return;
    }

    setChangingPassword(true);
    setPasswordMessage(null);
    try {
      await resetMyPassword(token, { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Password updated successfully.');
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Profile settings"
        subtitle="Manage your account name and session."
      />

      <section className="px-4 lg:px-8 pb-8">
        <Card className="max-w-2xl p-5 lg:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm space-y-1.5">
              <span className="text-2">First name</span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </label>
            <label className="text-sm space-y-1.5">
              <span className="text-2">Last name</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </label>
          </div>

          <label className="text-sm space-y-1.5 block">
            <span className="text-2">Email</span>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-3"
            />
          </label>

          <label className="text-sm space-y-1.5 block">
            <span className="text-2">Role</span>
            <input
              value={user?.role?.replace('_', ' ') ?? ''}
              disabled
              className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-3"
            />
          </label>

          {message && <p className="text-sm text-2">{message}</p>}

          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" icon={<Save className="h-4 w-4" />} onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </Button>
            <Button variant="soft" size="sm" icon={<LogOut className="h-4 w-4" />} onClick={logout}>
              Logout
            </Button>
          </div>
        </Card>

        <Card className="max-w-2xl p-5 lg:p-6 space-y-4 mt-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Reset password</h2>
            <p className="text-xs text-3 mt-1">Use letters, numbers, and symbols. Minimum 8 characters.</p>
          </div>

          <label className="text-sm space-y-1.5 block">
            <span className="text-2">Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm space-y-1.5">
              <span className="text-2">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </label>
            <label className="text-sm space-y-1.5">
              <span className="text-2">Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              />
            </label>
          </div>

          {passwordMessage && <p className="text-sm text-2">{passwordMessage}</p>}

          <div>
            <Button variant="primary" size="sm" onClick={onResetPassword} disabled={changingPassword}>
              {changingPassword ? 'Updating password...' : 'Update password'}
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
