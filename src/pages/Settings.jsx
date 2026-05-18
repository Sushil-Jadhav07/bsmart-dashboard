import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, Settings as SettingsIcon, Shield, Eye, EyeOff } from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import { defaultSettings } from '../data/settingsData.jsx';
import { API_BASE_WITH_PATH } from '../lib/apiBase.js';

const PasswordField = ({ label, value, onChange, autoComplete, visible, onToggle }) => (
  <div>
    <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors duration-200"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-neutral-600"
        aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  </div>
);

const tabs = [
  { value: 'profile', label: 'Profile', icon: Shield },
  { value: 'general', label: 'General', icon: SettingsIcon }
];

const validTabs = new Set(tabs.map((tab) => tab.value));

const Settings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState(validTabs.has(tabFromUrl) ? tabFromUrl : 'general');
  const [saved, setSaved] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const authState = (() => {
    try {
      return JSON.parse(localStorage.getItem('auth_state')) || {};
    } catch {
      return {};
    }
  })();

  const user = authState.user || null;
  const token = authState.token || null;
  const displayName =
    user?.full_name ||
    user?.name ||
    user?.username ||
    (user?.email ? user.email.split('@')[0] : 'Admin User');
  const displayEmail = user?.email || 'No email';

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleTabChange = (tabValue) => {
    setActiveTab(tabValue);
    setSearchParams({ tab: tabValue });
  };

  const togglePasswordVisibility = (key) => {
    setShowPasswords((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          oldPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
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

  useEffect(() => {
    if (tabFromUrl && !validTabs.has(tabFromUrl)) {
      setActiveTab('general');
      setSearchParams({ tab: 'general' }, { replace: true });
      return;
    }
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab, setSearchParams]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Settings</h1>
          <p className="text-neutral-500 mt-1">Configure your admin dashboard</p>
        </div>
        <Button 
          variant="primary" 
          icon={Save}
          onClick={handleSave}
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      {saved && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Save className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-green-800">Settings saved successfully!</p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <Card padding="small">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.value}
                    onClick={() => handleTabChange(tab.value)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      activeTab === tab.value
                        ? 'bg-gradient-brand text-white'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* General Settings */}
          {activeTab === 'profile' && (
            <Card>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800">Profile Settings</h3>
                  <p className="text-sm text-neutral-500">Manage your account and password</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Name"
                    value={displayName}
                    readOnly
                    helperText="This is your current logged-in profile name"
                  />
                  <Input
                    label="Email"
                    value={displayEmail}
                    readOnly
                    helperText="This is your current logged-in email"
                  />
                </div>

                <form onSubmit={handlePasswordChange} className="pt-4 border-t border-neutral-100 space-y-4">
                  <h4 className="font-medium text-neutral-800">Change Password</h4>
                  <PasswordField
                    label="Current Password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    autoComplete="current-password"
                    visible={showPasswords.current}
                    onToggle={() => togglePasswordVisibility('current')}
                  />
                  <PasswordField
                    label="New Password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    autoComplete="new-password"
                    visible={showPasswords.next}
                    onToggle={() => togglePasswordVisibility('next')}
                  />
                  <PasswordField
                    label="Confirm New Password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    autoComplete="new-password"
                    visible={showPasswords.confirm}
                    onToggle={() => togglePasswordVisibility('confirm')}
                  />

                  {passwordStatus.message && (
                    <div
                      className={clsx(
                        'text-sm rounded-lg px-3 py-2 border',
                        passwordStatus.type === 'success'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      )}
                    >
                      {passwordStatus.message}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" loading={passwordLoading}>
                      Change Password
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          )}

          {/* General Settings */}
          {activeTab === 'general' && (
            <Card>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800">General Settings</h3>
                  <p className="text-sm text-neutral-500">Basic application configuration</p>
                </div>
                
                <div className="space-y-4">
                  <Input
                    label="Application Name"
                    value={settings.appName}
                    onChange={(e) => setSettings(prev => ({ ...prev, appName: e.target.value }))}
                    helperText="This name will be displayed in the browser tab and emails"
                  />
                </div>

                <div className="pt-4 border-t border-neutral-100">
                  <h4 className="font-medium text-neutral-800 mb-4">Notifications</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive email alerts for important events' },
                      { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive browser push notifications' },
                      { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Get weekly summary reports via email' }
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium text-neutral-800">{item.label}</p>
                          <p className="text-sm text-neutral-500">{item.desc}</p>
                        </div>
                        <button
                          onClick={() => {}}
                          className="w-12 h-6 rounded-full bg-primary relative transition-colors"
                        >
                          <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
