import { useState, useEffect } from 'react';
import { User, LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';
import { signOut } from '../services/auth';
import { checkForUpdates } from '../services/updater';

const APP_VERSION = __APP_VERSION__;

export default function AccountSettings() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || '');
      }
    });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateMessage('');

    try {
      const result = await checkForUpdates();
      setUpdateMessage(result.message || '');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  return (
    <div className="space-y-8 animate-in">
      <div className="card">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--bg-hover)' }}>
            <User className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Account
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Manage your account and app info
            </p>
          </div>
        </div>

        {/* Profile Section */}
        <div className="label mb-3">Profile</div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <div className="input px-4 py-2 rounded-lg" style={{ color: 'var(--text-primary)' }}>
              {userEmail || 'Loading...'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />

        {/* About Section */}
        <div className="label mb-3">About</div>
        <div className="space-y-3">
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            SubTrkr <span style={{ color: 'var(--text-muted)' }}>v{APP_VERSION}</span>
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            A cloud-native subscription and bills tracker built with Tauri, React, and Supabase.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Your data is securely stored in the cloud and synced across all your devices.
          </p>
          <button
            type="button"
            onClick={handleCheckForUpdates}
            disabled={isCheckingUpdates}
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
            {isCheckingUpdates ? 'Checking for updates...' : 'Check for updates'}
          </button>
          {updateMessage ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {updateMessage}
            </p>
          ) : null}
        </div>

        {/* Divider */}
        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors"
          style={{ color: 'var(--accent-red)' }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
