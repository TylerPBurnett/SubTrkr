import { isTauri } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';

const LAST_UPDATE_CHECK_AT_KEY = 'subtrkr-last-update-check-at';
const AUTO_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

type UpdateCheckStatus =
  | 'unsupported'
  | 'up-to-date'
  | 'available'
  | 'installed'
  | 'relaunching'
  | 'error';

interface UpdateCheckResult {
  status: UpdateCheckStatus;
  message?: string;
  version?: string;
}

interface CheckForUpdatesOptions {
  silentIfUpToDate?: boolean;
}

function buildUpdatePrompt(version: string, notes?: string): string {
  const header = `SubTrkr ${version} is available. Install now?`;
  if (!notes?.trim()) {
    return header;
  }

  return `${header}\n\nRelease notes:\n${notes.trim()}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unable to check for updates right now. Please try again.';
}

function rememberUpdateCheckAttempt() {
  localStorage.setItem(LAST_UPDATE_CHECK_AT_KEY, Date.now().toString());
}

function shouldRunAutomaticUpdateCheck() {
  if (import.meta.env.DEV || !isTauri()) {
    return false;
  }

  const last = Number(localStorage.getItem(LAST_UPDATE_CHECK_AT_KEY));
  if (!Number.isFinite(last) || last <= 0) {
    return true;
  }

  return Date.now() - last >= AUTO_CHECK_INTERVAL_MS;
}

export async function checkForUpdates(
  options: CheckForUpdatesOptions = {}
): Promise<UpdateCheckResult> {
  const { silentIfUpToDate = false } = options;

  if (!isTauri()) {
    return {
      status: 'unsupported',
      message: 'Update checks are only available in installed desktop builds.',
    };
  }

  try {
    const update = await check();

    if (!update) {
      return {
        status: 'up-to-date',
        message: silentIfUpToDate ? undefined : 'You are already on the latest version.',
      };
    }

    const shouldInstall = window.confirm(buildUpdatePrompt(update.version, update.body));
    if (!shouldInstall) {
      return {
        status: 'available',
        version: update.version,
        message: `Update ${update.version} is available whenever you are ready.`,
      };
    }

    await update.downloadAndInstall();

    const shouldRestart = window.confirm(
      'Update installed successfully. Restart SubTrkr now to finish updating?'
    );
    if (shouldRestart) {
      await relaunch();
      return {
        status: 'relaunching',
        version: update.version,
      };
    }

    return {
      status: 'installed',
      version: update.version,
      message: 'Update installed. Restart SubTrkr to apply it.',
    };
  } catch (error) {
    const message = getErrorMessage(error);

    // Common first-release case: updater endpoint exists but no latest.json yet.
    if (message.includes('404')) {
      return {
        status: 'error',
        message: 'No published app updates are available yet.',
      };
    }

    return {
      status: 'error',
      message,
    };
  }
}

export async function checkForUpdatesOnLaunch(): Promise<void> {
  if (!shouldRunAutomaticUpdateCheck()) {
    return;
  }

  rememberUpdateCheckAttempt();
  await checkForUpdates({ silentIfUpToDate: true });
}
