import { isTauri } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type DownloadEvent, type Update } from '@tauri-apps/plugin-updater';

const LAST_UPDATE_CHECK_AT_KEY = 'subtrkr-last-update-check-at';
const AUTO_UPDATE_ENABLED_KEY = 'subtrkr-auto-update-enabled';
const AUTO_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000;

export type UpdaterStatus =
  | 'idle'
  | 'unsupported'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'installing'
  | 'ready-to-restart'
  | 'relaunching'
  | 'error';

export interface UpdaterState {
  status: UpdaterStatus;
  message?: string;
  availableVersion?: string;
  releaseNotes?: string;
  downloadedBytes?: number;
  totalBytes?: number;
  progressPercent?: number;
  checkedAt?: number;
}

interface CheckForUpdatesOptions {
  silentIfUpToDate?: boolean;
}

let updaterState: UpdaterState = { status: 'idle' };
let pendingUpdate: Update | null = null;
let activeCheckPromise: Promise<UpdaterState> | null = null;
let activeInstallPromise: Promise<UpdaterState> | null = null;
const listeners = new Set<() => void>();

function emitUpdaterState() {
  listeners.forEach((listener) => listener());
}

function setUpdaterState(nextState: UpdaterState): UpdaterState {
  updaterState = nextState;
  emitUpdaterState();
  return updaterState;
}

function calculateProgressPercent(downloadedBytes: number, totalBytes?: number) {
  if (!totalBytes || totalBytes <= 0) {
    return undefined;
  }

  return Math.max(0, Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)));
}

async function replacePendingUpdate(nextUpdate: Update | null) {
  const previousUpdate = pendingUpdate;
  pendingUpdate = nextUpdate;

  if (!previousUpdate || previousUpdate === nextUpdate) {
    return;
  }

  try {
    await previousUpdate.close();
  } catch (error) {
    console.warn('Failed to release updater resource:', error);
  }
}

function buildAvailableState(
  update: Update,
  overrides: Partial<UpdaterState> = {}
): UpdaterState {
  const checkedAt = overrides.checkedAt ?? Date.now();

  return {
    status: 'available',
    availableVersion: update.version,
    releaseNotes: update.body,
    message: `SubTrkr ${update.version} is ready to install.`,
    checkedAt,
    ...overrides,
  };
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

function isAutoUpdateEnabled(): boolean {
  const stored = localStorage.getItem(AUTO_UPDATE_ENABLED_KEY);
  return stored === null || stored === 'true'; // default: enabled
}

function shouldRunAutomaticUpdateCheck() {
  if (import.meta.env.DEV) {
    return localStorage.getItem('subtrkr-dev-simulate-update') === 'true';
  }

  if (!isTauri() || !isAutoUpdateEnabled()) {
    return false;
  }

  const last = Number(localStorage.getItem(LAST_UPDATE_CHECK_AT_KEY));
  if (!Number.isFinite(last) || last <= 0) {
    return true;
  }

  return Date.now() - last >= AUTO_CHECK_INTERVAL_MS;
}

export function subscribeToUpdaterState(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getUpdaterStateSnapshot(): UpdaterState {
  return updaterState;
}

export async function checkForUpdates(
  options: CheckForUpdatesOptions = {}
): Promise<UpdaterState> {
  if (activeCheckPromise) {
    return activeCheckPromise;
  }

  const checkPromise = (async () => {
    const { silentIfUpToDate = false } = options;

    // Dev-mode update simulation: set localStorage key to test the UI flow
    if (import.meta.env.DEV && localStorage.getItem('subtrkr-dev-simulate-update') === 'true') {
      setUpdaterState({ status: 'checking', message: 'Checking for updates...', checkedAt: Date.now() });
      await new Promise((r) => setTimeout(r, 1200));
      return setUpdaterState({
        status: 'available',
        availableVersion: '99.0.0',
        releaseNotes: '## What\'s New\n- **Redesigned update panel** with compact and expanded modes\n- One-click install from toast notification\n- Automatic update preference toggle\n### Bug Fixes\n- Fixed `version` display showing stale build number\n- Improved release notes rendering with markdown support',
        message: 'SubTrkr 99.0.0 is ready to install.',
        checkedAt: Date.now(),
      });
    }

    if (!isTauri()) {
      return setUpdaterState({
        status: 'unsupported',
        message: 'Update checks are only available in installed desktop builds.',
      });
    }

    rememberUpdateCheckAttempt();
    setUpdaterState({
      status: 'checking',
      message: 'Checking for updates...',
      checkedAt: Date.now(),
    });

    try {
      const update = await check();

      if (!update) {
        await replacePendingUpdate(null);

        return silentIfUpToDate
          ? setUpdaterState({
              status: 'idle',
              checkedAt: Date.now(),
            })
          : setUpdaterState({
              status: 'up-to-date',
              message: 'You are already on the latest version.',
              checkedAt: Date.now(),
            });
      }

      await replacePendingUpdate(update);
      return setUpdaterState(buildAvailableState(update));
    } catch (error) {
      const message = getErrorMessage(error);

      if (message.includes('404')) {
        return setUpdaterState({
          status: 'error',
          message: 'No published app updates are available yet.',
          checkedAt: Date.now(),
        });
      }

      return setUpdaterState({
        status: 'error',
        message,
        checkedAt: Date.now(),
      });
    }
  })();

  activeCheckPromise = checkPromise;

  try {
    return await checkPromise;
  } finally {
    if (activeCheckPromise === checkPromise) {
      activeCheckPromise = null;
    }
  }
}

export async function installAvailableUpdate(): Promise<UpdaterState> {
  if (activeInstallPromise) {
    return activeInstallPromise;
  }

  const installPromise = (async () => {
    if (!isTauri()) {
      return setUpdaterState({
        status: 'unsupported',
        message: 'In-app updates are only available in installed desktop builds.',
      });
    }

    let update = pendingUpdate;

    if (!update) {
      const result = await checkForUpdates();
      if (result.status !== 'available' || !pendingUpdate) {
        return result;
      }
      update = pendingUpdate;
    }

    let downloadedBytes = 0;
    let totalBytes: number | undefined;

    try {
      setUpdaterState(
        buildAvailableState(update, {
          status: 'downloading',
          message: `Downloading SubTrkr ${update.version}...`,
          downloadedBytes: 0,
          totalBytes: undefined,
          progressPercent: undefined,
        })
      );

      await update.download((event: DownloadEvent) => {
        if (event.event === 'Started') {
          totalBytes = event.data.contentLength;
          setUpdaterState(
            buildAvailableState(update, {
              status: 'downloading',
              message: `Downloading SubTrkr ${update.version}...`,
              downloadedBytes,
              totalBytes,
              progressPercent: calculateProgressPercent(downloadedBytes, totalBytes),
              checkedAt: updaterState.checkedAt ?? Date.now(),
            })
          );
          return;
        }

        if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength;
          setUpdaterState(
            buildAvailableState(update, {
              status: 'downloading',
              message: `Downloading SubTrkr ${update.version}...`,
              downloadedBytes,
              totalBytes,
              progressPercent: calculateProgressPercent(downloadedBytes, totalBytes),
              checkedAt: updaterState.checkedAt ?? Date.now(),
            })
          );
          return;
        }

        setUpdaterState(
          buildAvailableState(update, {
            status: 'installing',
            message: `Installing SubTrkr ${update.version}...`,
            downloadedBytes,
            totalBytes,
            progressPercent: 100,
            checkedAt: updaterState.checkedAt ?? Date.now(),
          })
        );
      });

      setUpdaterState(
        buildAvailableState(update, {
          status: 'installing',
          message: `Installing SubTrkr ${update.version}...`,
          downloadedBytes,
          totalBytes,
          progressPercent: 100,
          checkedAt: updaterState.checkedAt ?? Date.now(),
        })
      );

      await update.install();
      await replacePendingUpdate(null);

      return setUpdaterState({
        status: 'ready-to-restart',
        availableVersion: update.version,
        releaseNotes: update.body,
        message: `SubTrkr ${update.version} is installed. Restart to finish updating.`,
        checkedAt: Date.now(),
      });
    } catch (error) {
      const message = getErrorMessage(error);
      await replacePendingUpdate(null);

      return setUpdaterState({
        status: 'error',
        availableVersion: update.version,
        releaseNotes: update.body,
        downloadedBytes,
        totalBytes,
        progressPercent: calculateProgressPercent(downloadedBytes, totalBytes),
        message,
        checkedAt: Date.now(),
      });
    }
  })();

  activeInstallPromise = installPromise;

  try {
    return await installPromise;
  } finally {
    if (activeInstallPromise === installPromise) {
      activeInstallPromise = null;
    }
  }
}

export async function restartToApplyUpdate(): Promise<UpdaterState> {
  setUpdaterState({
    ...updaterState,
    status: 'relaunching',
    message: 'Restarting SubTrkr to finish updating...',
  });

  await relaunch();

  return updaterState;
}

export async function checkForUpdatesOnLaunch(): Promise<UpdaterState> {
  if (!shouldRunAutomaticUpdateCheck()) {
    return updaterState;
  }

  return checkForUpdates({ silentIfUpToDate: true });
}
