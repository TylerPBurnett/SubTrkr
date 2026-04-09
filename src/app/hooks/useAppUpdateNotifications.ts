import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { checkForUpdatesOnLaunch } from '@/services/updater';

interface UseAppUpdateNotificationsOptions {
  session: Session | null;
  appVersion: string;
  onInstallNow: () => void;
}

export function useAppUpdateNotifications({
  session,
  appVersion,
  onInstallNow,
}: UseAppUpdateNotificationsOptions) {
  useEffect(() => {
    if (!session) {
      return;
    }

    checkForUpdatesOnLaunch()
      .then((updateResult) => {
        if (
          updateResult.status === 'available' &&
          updateResult.availableVersion
        ) {
          toast.info(`SubTrkr ${updateResult.availableVersion} is available`, {
            description: `v${appVersion} → v${updateResult.availableVersion}`,
            duration: 15000,
            action: {
              label: 'Install now',
              onClick: onInstallNow,
            },
          });
        }
      })
      .catch((updateError) => {
        console.warn('Automatic update check failed:', updateError);
      });
  }, [appVersion, onInstallNow, session]);
}
