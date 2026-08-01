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

          // PKCE only: the callback must carry an auth code. Tokens supplied
          // directly in the URL fragment are ignored — any local process could
          // forge one and swap the user onto an attacker-controlled account.
          const code = url.searchParams.get('code');
          if (!code) {
            console.warn('Rejected deep link without an auth code:', urlStr);
            toast.error(
              'Could not complete sign-in. Request a new link and open it on this computer.',
            );
            continue;
          }

          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            // The PKCE verifier lives in this install's localStorage, so a link
            // opened on another device or browser can never be exchanged here.
            console.error('Deep link code exchange failed:', exchangeError);
            toast.error(
              'Could not complete sign-in. Request a new link and open it on this computer.',
            );
            return;
          }

          // With PKCE, supabase-js may only emit SIGNED_IN for a recovery code,
          // so fall back to the type hint Supabase puts on the redirect.
          if (url.searchParams.get('type') === 'recovery') {
            setShowPasswordRecovery(true);
          }
          return;
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
