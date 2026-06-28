import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Save, Settings as SettingsIcon, Shield } from 'lucide-react';
import { clsx } from 'clsx';
import Button from '../components/Button.jsx';
import { defaultSettings } from '../data/settingsData.jsx';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

const tabs = [
  { value: 'profile', label: 'Profile', icon: Shield },
  { value: 'general', label: 'General', icon: SettingsIcon },
];
const validTabs = new Set(tabs.map((tab) => tab.value));

const Field = ({ label, helperText, className = '', ...props }) => (
  <div className={className}>
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</label>
    <input
      {...props}
      className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:bg-neutral-50 disabled:text-neutral-500"
    />
    {helperText && <p className="mt-1.5 text-xs font-medium text-neutral-400">{helperText}</p>}
  </div>
);

const PasswordField = ({ label, value, onChange, visible, onToggle, autoComplete }) => (
  <div>
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-500">{label}</label>
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 pr-11 text-sm font-medium text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
      />
      <button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 transition hover:text-primary">
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  </div>
);

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState(validTabs.has(tabFromUrl) ? tabFromUrl : 'general');
  const [saved, setSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });

  const authState = (() => {
    try { return JSON.parse(localStorage.getItem('auth_state')) || {}; } catch { return {}; }
  })();
  const user = authState.user || null;
  const token = authState.token || null;
  const displayName = user?.full_name || user?.name || user?.username || (user?.email ? user.email.split('@')[0] : 'Admin User');
  const displayEmail = user?.email || 'No email';

  useEffect(() => {
    if (tabFromUrl && !validTabs.has(tabFromUrl)) {
      setActiveTab('general');
      setSearchParams({ tab: 'general' }, { replace: true });
    } else if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab, setSearchParams]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordStatus({ type: '', message: '' });
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Please fill all password fields.' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New password and confirm password do not match.' });
      return;
    }
    if (!token) {
      setPasswordStatus({ type: 'error', message: 'Session expired. Please login again.' });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE_WITH_PATH}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: passwordForm.currentPassword, oldPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordStatus({ type: 'error', message: data?.message || 'Failed to change password.' });
        return;
      }
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordStatus({ type: 'success', message: data?.message || 'Password changed successfully.' });
    } catch (error) {
      setPasswordStatus({ type: 'error', message: error.message || 'Network error while changing password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Admin Settings</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-neutral-950">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Configure profile security, dashboard preferences and notification behavior.</p>
        </div>
        <Button variant="primary" icon={Save} className="h-12 rounded-xl px-5 text-sm font-bold tracking-wide shadow-soft transition duration-200 hover:-translate-y-0.5" onClick={handleSave}>
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {saved && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-card">Settings saved successfully.</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-card">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => changeTab(tab.value)}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition',
                  activeTab === tab.value ? 'bg-gradient-brand text-white shadow-soft' : 'text-neutral-600 hover:bg-rose-50 hover:text-primary'
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </aside>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-card">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-neutral-950">Profile Settings</h2>
                <p className="mt-1 text-sm text-neutral-500">Manage your account identity and password.</p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name" value={displayName} readOnly helperText="Current logged-in profile name" />
                <Field label="Email" value={displayEmail} readOnly helperText="Current logged-in email" />
              </div>
              <form onSubmit={handlePasswordChange} className="space-y-4 border-t border-neutral-100 pt-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Change Password</h3>
                <PasswordField label="Current Password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((value) => ({ ...value, currentPassword: event.target.value }))} autoComplete="current-password" visible={showPasswords.current} onToggle={() => setShowPasswords((value) => ({ ...value, current: !value.current }))} />
                <PasswordField label="New Password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((value) => ({ ...value, newPassword: event.target.value }))} autoComplete="new-password" visible={showPasswords.next} onToggle={() => setShowPasswords((value) => ({ ...value, next: !value.next }))} />
                <PasswordField label="Confirm New Password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((value) => ({ ...value, confirmPassword: event.target.value }))} autoComplete="new-password" visible={showPasswords.confirm} onToggle={() => setShowPasswords((value) => ({ ...value, confirm: !value.confirm }))} />
                {passwordStatus.message && (
                  <div className={clsx('rounded-xl border px-3 py-2 text-sm font-bold', passwordStatus.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>
                    {passwordStatus.message}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" loading={passwordLoading}>Change Password</Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-neutral-950">General Settings</h2>
                <p className="mt-1 text-sm text-neutral-500">Basic application configuration and notification preferences.</p>
              </div>
              <Field label="Application Name" value={settings.appName} onChange={(event) => setSettings((value) => ({ ...value, appName: event.target.value }))} helperText="Displayed in browser tabs and emails" />
              <div className="border-t border-neutral-100 pt-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Notifications</h3>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Email Notifications', desc: 'Receive email alerts for important events' },
                    { label: 'Push Notifications', desc: 'Receive browser push notifications' },
                    { label: 'Weekly Reports', desc: 'Get weekly summary reports via email' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-neutral-950">{item.label}</p>
                        <p className="mt-0.5 text-xs font-medium text-neutral-500">{item.desc}</p>
                      </div>
                      <button type="button" className="relative h-6 w-12 rounded-full bg-primary transition">
                        <span className="absolute right-1 top-1 h-4 w-4 rounded-full bg-white shadow-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Settings;
