import React, { useState } from 'react';
import { Save, Settings as SettingsIcon, Coins, User, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Badge from '../components/Badge.jsx';
import { defaultSettings } from '../data/settingsData.jsx';

const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

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

  const handleFeatureToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: !prev.features[key]
      }
    }));
  };

  const tabs = [
    { value: 'general', label: 'General', icon: SettingsIcon },
    { value: 'rewards', label: 'Coin Rewards', icon: Coins },
    { value: 'wallet', label: 'Wallet', icon: User },
    { value: 'features', label: 'Features', icon: Globe }
  ];

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
                    onClick={() => setActiveTab(tab.value)}
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

          {/* Coin Rewards */}
          {activeTab === 'rewards' && (
            <Card>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800">Coin Rewards</h3>
                  <p className="text-sm text-neutral-500">Configure coin rewards for user actions</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Like Reward"
                    type="number"
                    value={settings.coinRewards.like}
                    onChange={(e) => handleChange('coinRewards', 'like', parseInt(e.target.value))}
                    helperText="Coins awarded when a user likes content"
                  />
                  <Input
                    label="Comment Reward"
                    type="number"
                    value={settings.coinRewards.comment}
                    onChange={(e) => handleChange('coinRewards', 'comment', parseInt(e.target.value))}
                    helperText="Coins awarded when a user comments"
                  />
                  <Input
                    label="Save Reward"
                    type="number"
                    value={settings.coinRewards.save}
                    onChange={(e) => handleChange('coinRewards', 'save', parseInt(e.target.value))}
                    helperText="Coins awarded when a user saves content"
                  />
                  <Input
                    label="Share Reward"
                    type="number"
                    value={settings.coinRewards.share}
                    onChange={(e) => handleChange('coinRewards', 'share', parseInt(e.target.value))}
                    helperText="Coins awarded when a user shares content"
                  />
                  <Input
                    label="Post Reward"
                    type="number"
                    value={settings.coinRewards.post}
                    onChange={(e) => handleChange('coinRewards', 'post', parseInt(e.target.value))}
                    helperText="Coins awarded when a user creates a post"
                  />
                  <Input
                    label="Reel Reward"
                    type="number"
                    value={settings.coinRewards.reel}
                    onChange={(e) => handleChange('coinRewards', 'reel', parseInt(e.target.value))}
                    helperText="Coins awarded when a user creates a reel"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Wallet Settings */}
          {activeTab === 'wallet' && (
            <Card>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800">Initial Wallet Balance</h3>
                  <p className="text-sm text-neutral-500">Set default coin balance for new users by role</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Member Balance"
                    type="number"
                    value={settings.initialWalletBalance.member}
                    onChange={(e) => handleChange('initialWalletBalance', 'member', parseInt(e.target.value))}
                    helperText="Default for new members"
                  />
                  <Input
                    label="Vendor Balance"
                    type="number"
                    value={settings.initialWalletBalance.vendor}
                    onChange={(e) => handleChange('initialWalletBalance', 'vendor', parseInt(e.target.value))}
                    helperText="Default for new vendors"
                  />
                  <Input
                    label="Admin Balance"
                    type="number"
                    value={settings.initialWalletBalance.admin}
                    onChange={(e) => handleChange('initialWalletBalance', 'admin', parseInt(e.target.value))}
                    helperText="Default for new admins"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Features */}
          {activeTab === 'features' && (
            <Card>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800">Platform Features</h3>
                  <p className="text-sm text-neutral-500">Enable or disable platform features</p>
                </div>
                
                <div className="space-y-4">
                  {[
                    { key: 'enableComments', label: 'Comments', desc: 'Allow users to comment on posts and reels' },
                    { key: 'enableReels', label: 'Reels', desc: 'Enable reels feature for users' },
                    { key: 'enableStories', label: 'Stories', desc: 'Enable stories feature for users' },
                    { key: 'enableShopping', label: 'Shopping', desc: 'Enable shopping and product tags' },
                    { key: 'enableLive', label: 'Live Streaming', desc: 'Enable live streaming feature' }
                  ].map((feature) => (
                    <div 
                      key={feature.key} 
                      className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-neutral-800">{feature.label}</p>
                          {settings.features[feature.key] && (
                            <Badge variant="success" size="sm">Enabled</Badge>
                          )}
                        </div>
                        <p className="text-sm text-neutral-500 mt-1">{feature.desc}</p>
                      </div>
                      <button
                        onClick={() => handleFeatureToggle(feature.key)}
                        className={clsx(
                          'w-12 h-6 rounded-full relative transition-colors',
                          settings.features[feature.key] ? 'bg-primary' : 'bg-neutral-300'
                        )}
                      >
                        <span 
                          className={clsx(
                            'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                            settings.features[feature.key] ? 'right-1' : 'left-1'
                          )} 
                        />
                      </button>
                    </div>
                  ))}
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
