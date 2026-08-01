import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';
import { openUrl } from '@tauri-apps/plugin-opener';

const AUTH_REDIRECT_URL = 'subtrkr://auth-callback';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: AUTH_REDIRECT_URL,
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: AUTH_REDIRECT_URL,
    }
  });
  if (error) throw error;
}

export async function verifyOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Permanently deletes the signed-in user's account via the `delete-account`
 * edge function. The user id is never sent -- the function resolves it from the
 * access token supabase-js attaches to the request.
 *
 * Returns a result object rather than throwing so the caller can distinguish a
 * backend failure (function not deployed yet, network down) from success and
 * message accordingly.
 */
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });

  if (error) {
    const detail =
      (error as any)?.context?.body?.error ||
      (error as any)?.context?.body?.message ||
      error.message;
    return { success: false, error: detail };
  }
  if (data?.error) {
    return { success: false, error: data.error };
  }
  return data ?? { success: true };
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: AUTH_REDIRECT_URL,
  });
  if (error) throw error;
}

export async function signInWithGoogle() {
  // For Tauri: Get OAuth URL without auto-redirect, then open in external browser
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: AUTH_REDIRECT_URL,
      skipBrowserRedirect: true, // Don't redirect in webview
    },
  });

  if (error) throw error;

  // Open OAuth URL in system browser (not webview)
  if (data?.url) {
    await openUrl(data.url);
  }
}

export async function signInWithGitHub() {
  // For Tauri: Get OAuth URL without auto-redirect, then open in external browser
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: AUTH_REDIRECT_URL,
      skipBrowserRedirect: true, // Don't redirect in webview
    },
  });

  if (error) throw error;

  // Open OAuth URL in system browser (not webview)
  if (data?.url) {
    await openUrl(data.url);
  }
}

export async function resendVerificationEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: AUTH_REDIRECT_URL,
    },
  });
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
