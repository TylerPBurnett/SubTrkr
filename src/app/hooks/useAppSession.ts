import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getCurrent as getCurrentDeepLinks, onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { toast } from 'sonner';
import { supabase } from '@/services/supabase';

export function useAppSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function handleDeepLink(urls: string[]) {
      for (const urlStr of urls) {
        try {
          if (!urlStr.startsWith('subtrkr://auth-callback')) {
            console.warn('Rejected deep link with invalid path:', urlStr);
            continue;
          }

          const url = new URL(urlStr);
          const error = url.searchParams.get('error');
          if (error) {
            const errorDescription = url.searchParams.get('error_description');
            toast.error(
              errorDescription || 'Authentication failed. Please try again.',
            );
            return;
          }

          const code = url.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            return;
          }

          const hashParams = new URLSearchParams(url.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        } catch (error) {
          console.error('Deep link auth error:', error);
          toast.error('Failed to complete sign-in. Please try again.');
        }
      }
    }

    getCurrentDeepLinks()
      .then((urls) => {
        if (urls && urls.length > 0) {
          void handleDeepLink(urls);
        }
      })
      .catch(() => {});

    let unlisten: (() => void) | undefined;
    onOpenUrl((urls) => {
      void handleDeepLink(urls);
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => unlisten?.();
  }, []);

  return {
    session,
    authLoading,
    showPasswordRecovery,
    setShowPasswordRecovery,
  };
}
