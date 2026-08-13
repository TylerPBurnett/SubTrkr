import { useCallback, useEffect, useSyncExternalStore, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  LogOut,
  RefreshCw,
  RotateCw,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { deleteAccount, signOut } from '../services/auth';
import { Switch } from './ui/Switch';
import DeleteAccountDialog from './ui/DeleteAccountDialog';
import {
  checkForUpdates,
  getUpdaterStateSnapshot,
  installAvailableUpdate,
  restartToApplyUpdate,
  subscribeToUpdaterState,
  type UpdaterState,
} from '../services/updater';

const APP_VERSION = __APP_VERSION__;

function formatBytes(bytes?: number) {
  if (bytes === undefined || bytes <= 0) {
    return null;
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function parseReleaseNotes(notes?: string): { lines: string[]; truncated: boolean } | null {
  if (!notes?.trim()) {
    return null;
  }

  const allLines = notes
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (allLines.length === 0) return null;

  const maxLines = 8;
  return {
    lines: allLines.slice(0, maxLines),
    truncated: allLines.length > maxLines,
  };
}

function ReleaseNotesContent({ lines, truncated }: { lines: string[]; truncated: boolean }) {
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => (
        <ReleaseNoteLine key={i} line={line} />
      ))}
      {truncated && (
        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
          And more...
        </p>
      )}
    </div>
  );
}

function ReleaseNoteLine({ line }: { line: string }) {
  // Headings: ## or ### prefix
  const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
  if (headingMatch) {
    return (
      <p
        className="text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {renderInline(headingMatch[2])}
      </p>
    );
  }

  // Bullet items: - or * prefix
  const bulletMatch = line.match(/^[-*]\s+(.+)/);
  if (bulletMatch) {
    return (
      <div className="flex gap-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
        <span className="shrink-0 select-none" style={{ color: 'var(--text-muted)' }}>{'•'}</span>
        <span>{renderInline(bulletMatch[1])}</span>
      </div>
    );
  }

  // Plain text
  return (
    <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
      {renderInline(line)}
    </p>
  );
}

function renderInline(text: string): ReactNode {
  // Split on bold (**text**) and inline code (`code`) patterns
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Match bold or inline code, whichever comes first
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let earliest: { index: number; length: number; node: ReactNode } | null = null;

    if (boldMatch?.index !== undefined) {
      earliest = {
        index: boldMatch.index,
        length: boldMatch[0].length,
        node: <strong key={key++} style={{ color: 'var(--text-primary)' }}>{boldMatch[1]}</strong>,
      };
    }

    if (codeMatch?.index !== undefined && (!earliest || codeMatch.index < earliest.index)) {
      earliest = {
        index: codeMatch.index,
        length: codeMatch[0].length,
        node: (
          <code
            key={key++}
            className="px-1 py-0.5 rounded text-xs font-mono"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)' }}
          >
            {codeMatch[1]}
          </code>
        ),
      };
    }

    if (!earliest) {
      parts.push(remaining);
      break;
    }

    if (earliest.index > 0) {
      parts.push(remaining.slice(0, earliest.index));
    }
    parts.push(earliest.node);
    remaining = remaining.slice(earliest.index + earliest.length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function getPanelStyles(status: UpdaterState['status']) {
  switch (status) {
    case 'available':
    case 'downloading':
    case 'installing':
    case 'ready-to-restart':
    case 'relaunching':
      return {
        border: '1px solid color-mix(in srgb, var(--brand-primary) 28%, var(--border-default))',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--brand-primary-light) 60%, var(--bg-card)), color-mix(in srgb, var(--bg-card) 96%, var(--bg-surface)))',
        iconBg: 'var(--brand-primary-light)',
        iconColor: 'var(--brand-text)',
        badgeBg: 'color-mix(in srgb, var(--brand-primary) 16%, var(--bg-card))',
        badgeColor: 'var(--brand-text)',
        progressStart: 'var(--brand-primary)',
        progressEnd: 'var(--brand-primary-hover)',
      };
    case 'up-to-date':
      return {
        border: '1px solid color-mix(in srgb, var(--accent-emerald) 24%, var(--border-default))',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--accent-emerald-muted) 58%, var(--bg-card)), color-mix(in srgb, var(--bg-card) 96%, var(--bg-surface)))',
        iconBg: 'var(--accent-emerald-muted)',
        iconColor: 'var(--brand-text)',
        badgeBg: 'color-mix(in srgb, var(--accent-emerald) 18%, var(--bg-card))',
        badgeColor: 'var(--brand-text)',
        progressStart: 'var(--accent-emerald)',
        progressEnd: 'var(--accent-green)',
      };
    case 'error':
      return {
        border: '1px solid color-mix(in srgb, var(--accent-red) 24%, var(--border-default))',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--accent-red-muted) 46%, var(--bg-card)), color-mix(in srgb, var(--bg-card) 96%, var(--bg-surface)))',
        iconBg: 'var(--accent-red-muted)',
        iconColor: 'var(--accent-red)',
        // 14%, not the 18% its siblings use: in dark --accent-red is a light
        // #f87171, so tinting *raises* the badge's luminance and squeezes the
        // text below AA. 18% measured 4.47:1; 14% clears at 4.79:1.
        badgeBg: 'color-mix(in srgb, var(--accent-red) 14%, var(--bg-card))',
        badgeColor: 'var(--accent-red-text)',
        progressStart: 'var(--accent-red)',
        progressEnd: 'var(--accent-red)',
      };
    default:
      return {
        border: '1px solid var(--border-default)',
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--bg-card) 98%, white), color-mix(in srgb, var(--bg-card) 94%, var(--bg-surface)))',
        iconBg: 'var(--bg-hover)',
        iconColor: 'var(--text-muted)',
        badgeBg: 'color-mix(in srgb, var(--bg-hover) 84%, var(--bg-card))',
        badgeColor: 'var(--text-secondary)',
        progressStart: 'var(--brand-primary)',
        progressEnd: 'var(--brand-primary-hover)',
      };
  }
}


function CompactUpdateRow() {
  const updaterState = useSyncExternalStore(
    subscribeToUpdaterState,
    getUpdaterStateSnapshot
  );

  const isChecking = updaterState.status === 'checking';
  const isUpToDate = updaterState.status === 'up-to-date';

  const handleCheck = async () => {
    await checkForUpdates();
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {isUpToDate ? (
          <CheckCircle2
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--brand-text)' }}
          />
        ) : updaterState.status === 'error' ? (
          <AlertCircle
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--accent-red)' }}
          />
        ) : null}
        <div className="min-w-0">
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {isUpToDate
              ? 'Up to date'
              : updaterState.status === 'error'
                ? 'Update check failed'
                : updaterState.status === 'unsupported'
                  ? 'Desktop updates only'
                  : `v${APP_VERSION}`}
          </span>
          {isUpToDate ? (
            <span
              className="text-sm ml-2"
              style={{ color: 'var(--text-muted)' }}
            >
              v{APP_VERSION}
            </span>
          ) : updaterState.status === 'error' && updaterState.message ? (
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
              {updaterState.message}
            </p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={handleCheck}
        disabled={isChecking}
        className="btn-secondary inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
        {isChecking ? 'Checking...' : 'Check for updates'}
      </button>
    </div>
  );
}

function ExpandedUpdatePanel() {
  const updaterState = useSyncExternalStore(
    subscribeToUpdaterState,
    getUpdaterStateSnapshot
  );
  const styles = getPanelStyles(updaterState.status);
  const releaseNotes = parseReleaseNotes(updaterState.releaseNotes);
  const isBusy =
    updaterState.status === 'downloading' ||
    updaterState.status === 'installing' ||
    updaterState.status === 'relaunching';
  const shouldShowProgress =
    updaterState.status === 'downloading' || updaterState.status === 'installing';
  const progressLabel =
    updaterState.progressPercent !== undefined
      ? `${updaterState.progressPercent}%`
      : updaterState.status === 'installing'
        ? 'Preparing files'
        : 'Starting download';
  const byteProgress =
    updaterState.downloadedBytes !== undefined
      ? [
          formatBytes(updaterState.downloadedBytes),
          formatBytes(updaterState.totalBytes),
        ]
          .filter(Boolean)
          .join(' / ')
      : null;

  const handleInstall = async () => {
    await installAvailableUpdate();
  };

  const handleRestart = async () => {
    await restartToApplyUpdate();
  };

  const isReadyToRestart = updaterState.status === 'ready-to-restart';
  const isRelaunching = updaterState.status === 'relaunching';

  return (
    <div
      className="rounded-2xl p-4 space-y-4"
      style={{
        border: styles.border,
        background: styles.background,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: styles.iconBg }}
        >
          {isReadyToRestart || isRelaunching ? (
            <RotateCw
              className={`w-5 h-5 ${isRelaunching ? 'animate-spin' : ''}`}
              style={{ color: styles.iconColor }}
            />
          ) : (
            <Sparkles className="w-5 h-5" style={{ color: styles.iconColor }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4
            className="text-base font-semibold tracking-[-0.02em]"
            style={{ color: 'var(--text-primary)' }}
          >
            {isReadyToRestart
              ? 'Ready to restart'
              : isRelaunching
                ? 'Restarting...'
                : `Update available`}
          </h4>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isReadyToRestart
              ? `v${updaterState.availableVersion} is installed. Restart to finish.`
              : isRelaunching
                ? 'Restarting SubTrkr now...'
                : isBusy
                  ? `Downloading v${updaterState.availableVersion}...`
                  : (
                    <>
                      v{APP_VERSION}
                      <span style={{ color: 'var(--text-muted)' }}>{' → '}</span>
                      v{updaterState.availableVersion}
                    </>
                  )}
          </p>
        </div>
      </div>

      {releaseNotes && !shouldShowProgress ? (
        <div
          className="rounded-xl px-3.5 py-3"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--bg-card) 84%, transparent)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="label-wide mb-2">What&apos;s new</div>
          <ReleaseNotesContent lines={releaseNotes.lines} truncated={releaseNotes.truncated} />
        </div>
      ) : null}

      {shouldShowProgress ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold">
            <span style={{ color: 'var(--text-secondary)' }}>
              {updaterState.status === 'downloading' ? 'Downloading' : 'Installing'}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {byteProgress ? `${progressLabel} • ${byteProgress}` : progressLabel}
            </span>
          </div>

          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'color-mix(in srgb, var(--bg-hover) 85%, transparent)' }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={updaterState.progressPercent}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                updaterState.progressPercent === undefined ? 'animate-pulse' : ''
              }`}
              style={{
                width:
                  updaterState.progressPercent !== undefined
                    ? `${updaterState.progressPercent}%`
                    : '55%',
                background: `linear-gradient(90deg, ${styles.progressStart}, ${styles.progressEnd})`,
              }}
            />
          </div>
        </div>
      ) : null}

      {!shouldShowProgress && !isRelaunching ? (
        <button
          type="button"
          onClick={isReadyToRestart ? handleRestart : handleInstall}
          disabled={isBusy}
          className="btn-primary inline-flex items-center gap-2 w-full justify-center px-4 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isReadyToRestart ? (
            <>
              <RotateCw className="w-4 h-4" />
              Restart to update
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download &amp; install v{updaterState.availableVersion}
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

const AUTO_UPDATE_KEY = 'subtrkr-auto-update-enabled';

function UpdateStatusPanel() {
  const updaterState = useSyncExternalStore(
    subscribeToUpdaterState,
    getUpdaterStateSnapshot
  );
  const [autoUpdate, setAutoUpdate] = useState(() => {
    const stored = localStorage.getItem(AUTO_UPDATE_KEY);
    return stored === null || stored === 'true';
  });

  const handleToggleAutoUpdate = useCallback((enabled: boolean) => {
    setAutoUpdate(enabled);
    localStorage.setItem(AUTO_UPDATE_KEY, String(enabled));
  }, []);

  const isExpandedState =
    updaterState.status === 'available' ||
    updaterState.status === 'downloading' ||
    updaterState.status === 'installing' ||
    updaterState.status === 'ready-to-restart' ||
    updaterState.status === 'relaunching';

  return (
    <div className="space-y-3">
      <div className="label-wide">Software Updates</div>
      {isExpandedState ? <ExpandedUpdatePanel /> : <CompactUpdateRow />}

      <div className="flex items-center justify-between gap-4 pt-1">
        <div>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Automatic updates
          </span>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Check for updates on launch
          </p>
        </div>
        <Switch
          checked={autoUpdate}
          onCheckedChange={handleToggleAutoUpdate}
          aria-label="Toggle automatic update checks"
        />
      </div>
    </div>
  );
}

export default function AccountSettings() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const handleDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);

    let result: { success: boolean; error?: string };
    try {
      result = await deleteAccount();
    } catch (error) {
      console.error('Failed to delete account:', error);
      result = {
        success: false,
        error: error instanceof Error ? error.message : undefined,
      };
    }

    if (!result.success) {
      console.error('Account deletion failed:', result.error);
      setIsDeletingAccount(false);
      toast.error('Account deletion is temporarily unavailable', {
        description: result.error
          ? `${result.error} — the deletion service may not be deployed yet.`
          : 'The deletion service may not be deployed yet. Please try again later.',
      });
      return;
    }

    setShowDeleteDialog(false);
    toast.success('Your account and all of its data have been permanently deleted');

    // The access token is dead server-side now; signOut still clears the local
    // session (it treats a 401 from the logout call as already-signed-out).
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out after account deletion:', error);
    }
  };

  return (
    <div className="space-y-8 animate-in">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-hover)' }}
          >
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

        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />

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
        </div>

        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />

        <UpdateStatusPanel />

        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />

        <button
          onClick={handleSignOut}
          className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors"
          style={{ color: 'var(--accent-red-text)' }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />

        <div className="label mb-3" style={{ color: 'var(--accent-red-text)' }}>
          Danger Zone
        </div>
        <div
          className="rounded-2xl p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            border: '1px solid color-mix(in srgb, var(--accent-red) 30%, var(--border-default))',
            backgroundColor: 'color-mix(in srgb, var(--accent-red-muted) 45%, var(--bg-card))',
          }}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Delete account
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Permanently erases your account along with every item, category, history entry,
              and notification channel. This cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium text-white shrink-0 transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-red)' }}
          >
            <Trash2 className="w-4 h-4" />
            Delete account
          </button>
        </div>
      </div>

      <DeleteAccountDialog
        isOpen={showDeleteDialog}
        isDeleting={isDeletingAccount}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
