# Authentication System

**Last Updated:** 2026-02-15
**Status:** Production

## Overview

SubTrkr uses Supabase Auth for authentication with support for multiple auth methods optimized for Tauri desktop apps. Session state is managed in React with localStorage persistence, and all database access is protected by Row Level Security (RLS) policies.

## Quick Reference

### Key Files
```
src/services/
├── supabase.ts          # Supabase client config (lines 10-16)
├── auth.ts              # All auth operations
└── database.ts          # getUserId() helper (lines 25-31)

src/components/
├── AuthScreen.tsx       # Complete auth UI (all modes)
├── AccountSettings.tsx  # Profile & sign out
└── EmailVerificationBanner.tsx

src/App.tsx              # Session state management (lines 50, 114-128, 130-135)
```

### Auth Methods
- **Email/Password** - Traditional sign up/sign in
- **Magic Link (OTP)** - Passwordless 6-digit code via email
- **OAuth** - Google & GitHub (opens in system browser)

## Architecture

### Session Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ App Launch                                                   │
│ App.tsx:114-118                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  Check session
         ┌────────────────┴────────────────┐
         │                                  │
    Session exists?                   No session
         │                                  │
         ▼                                  ▼
    Load data (130-135)            Show AuthScreen (361-363)
    ├─ Maintenance jobs                    │
    ├─ Fetch items/categories              │
    ├─ Seed categories                     │
    ├─ Check updates                 User authenticates
    ├─ Send notifications                  │
    └─ Subscribe realtime                  ▼
         │                      onAuthStateChange fires (121-127)
         │                                  │
         │                                  ▼
         │                          Set session state
         │                                  │
         └──────────────────────────────────┘
                         │
                         ▼
                   App running
                         │
                  Sign out (AccountSettings.tsx:22-28)
                         │
                         ▼
               Session cleared → Show AuthScreen
```

### Supabase Client Configuration

**File:** `src/services/supabase.ts:10-16`

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,    // Auto-refresh before expiry
    persistSession: true,      // Survive app restarts
    storage: localStorage,     // Works in Tauri webview
  },
});
```

**Environment Variables:**
- `VITE_SUPABASE_URL` - Project URL
- `VITE_SUPABASE_ANON_KEY` - Anonymous public key

### Session State Management

**File:** `src/App.tsx`

**State Declaration (line 50):**
```typescript
const [session, setSession] = useState<Session | null>(null);
```

**Initialization (lines 114-128):**
```typescript
useEffect(() => {
  // Get initial session
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
    setAuthLoading(false);
  });

  // Subscribe to auth state changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

**Data Loading Trigger (lines 130-135):**
```typescript
useEffect(() => {
  if (session) {
    loadData(); // Fetch user data when authenticated
  }
}, [session, loadData]);
```

## Authentication Methods

### 1. Email/Password

**Sign Up:** `src/services/auth.ts:11-15`
```typescript
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}
```

**Sign In:** `src/services/auth.ts:17-21`
```typescript
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email, password
  });
  if (error) throw error;
  return data;
}
```

**Features:**
- Password strength meter (signup only)
- Email verification required
- Password reset via email

### 2. Magic Link (OTP)

**Request Code:** `src/services/auth.ts:23-31`
```typescript
export async function signInWithOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // Auto-create account
    }
  });
  if (error) throw error;
}
```

**Verify Code:** `src/services/auth.ts:33-41`
```typescript
export async function verifyOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });
  if (error) throw error;
  return data;
}
```

**Flow:**
1. User enters email → Send 6-digit code
2. User enters code → Verify & authenticate

### 3. OAuth (Google & GitHub)

**Tauri-Optimized Implementation:** `src/services/auth.ts:55-89`

```typescript
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}`,
      skipBrowserRedirect: true, // Don't redirect in webview
    },
  });

  if (error) throw error;

  // Open OAuth URL in system browser (not webview)
  if (data?.url) {
    await openUrl(data.url); // Tauri plugin
  }
}
```

**Why `skipBrowserRedirect: true`?**
- Tauri webviews don't support OAuth redirects reliably
- Opens in user's default browser for better UX
- Redirects back to app via custom URL scheme

### 4. Password Reset

**File:** `src/services/auth.ts:48-53`

```typescript
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}`,
  });
  if (error) throw error;
}
```

### 5. Sign Out

**File:** `src/services/auth.ts:43-46`

```typescript
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
```

**Used in:** `src/components/AccountSettings.tsx:22-28`

## Database Integration

### getUserId Helper

**File:** `src/services/database.ts:25-31`

```typescript
async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}
```

**Usage Pattern:**
All database service functions call `getUserId()` first:

```typescript
export async function getItems(): Promise<ItemWithCategory[]> {
  const userId = await getUserId(); // ← Ensures authenticated

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', userId);

  // ...
}
```

### Row Level Security (RLS)

**Standard Pattern:**
```sql
CREATE POLICY "Users can only access their own data"
ON items
FOR ALL
USING ((SELECT auth.uid()) = user_id);
```

**Why `(SELECT auth.uid())`?**
- Wrapped in SELECT for better query planner performance
- Documented in MEMORY.md as the standard RLS pattern

**Protected Tables:**
- `items` - Subscriptions/bills
- `categories` - User categories
- `payments` - Payment history
- `notification_channels` - Notification settings
- `notification_preferences` - User preferences
- `notification_log` - Notification history

## UI Components

### AuthScreen

**File:** `src/components/AuthScreen.tsx`
**Purpose:** Complete authentication interface with all methods

**Modes:**
- `signin` - Email/password sign in
- `signup` - Create new account
- `otp` - Request magic code
- `verify-otp` - Enter 6-digit code
- `reset-password` - Password recovery

**UX Features:**

1. **Email Typo Detection (lines 69-114)**
   - Detects common domain typos (gmial.com → gmail.com)
   - Suggests correction with one-click fix

2. **Password Strength Meter (lines 119-137)**
   - Only shown during signup
   - Checks: length, uppercase, numbers, special chars
   - Visual indicator: Weak (red) → Medium (amber) → Strong (green)

3. **Friendly Error Messages (lines 22-66)**
   - Rate limiting: "Too many attempts. Please wait..."
   - Invalid credentials: "Invalid email or password..."
   - User not found: "No account found. Would you like to sign up?"
   - Network errors: "Connection error. Check your internet..."

4. **Social Auth Loading State (lines 899-994)**
   - Shows provider logo while waiting
   - "Complete the sign-in process in your browser"
   - Option to switch providers
   - Cancel and return to main auth

5. **Terms of Service Checkbox (lines 655-690)**
   - Required for signup only
   - Must be checked before account creation

### AccountSettings

**File:** `src/components/AccountSettings.tsx`
**Purpose:** User profile and sign out

**Features:**
- Display current user email (lines 10, 14-19)
- App version display (line 7, 79-81)
- Check for updates button (lines 30-40, 88-101)
- Sign out button (lines 22-28, 108-115)

### EmailVerificationBanner

**File:** Referenced in `src/App.tsx:485-490`
**Purpose:** Prompt users to verify their email after signup

**Display Logic:**
```typescript
{session?.user && !session.user.email_confirmed_at && !emailBannerDismissed && (
  <EmailVerificationBanner
    email={session.user.email || ''}
    onDismiss={() => setEmailBannerDismissed(true)}
  />
)}
```

## Real-time Integration

### Auth-Gated Realtime Subscriptions

**File:** `src/App.tsx:162-182`

```typescript
useEffect(() => {
  if (!session) return; // ← Only subscribe when authenticated

  const channel = supabase
    .channel('db-changes')
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'items'
    }, () => debouncedLoadData())
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'categories'
    }, () => debouncedLoadData())
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'payments'
    }, () => debouncedLoadData())
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [session, debouncedLoadData]);
```

**Benefits:**
- Automatic unsubscribe on sign out
- No memory leaks
- No unauthorized channel access

## Security Considerations

### ✅ Implemented

1. **Auto Token Refresh** - Tokens refreshed before expiry
2. **Session Persistence** - Survives app restarts
3. **RLS on All Tables** - Database-level access control
4. **getUserId() Pattern** - Prevents auth bypass in code
5. **Email Verification** - Required for new accounts
6. **OAuth Browser Isolation** - Opens in system browser (Tauri security)
7. **Error Sanitization** - Friendly messages, no sensitive info leaked
8. **HTTPS Only** - Supabase enforces HTTPS

### ⚠️ Known Issues (from MEMORY.md)

- **Leaked password protection disabled** - See Supabase auth advisory

### Best Practices

1. **Never store passwords in code**
   - Use environment variables for API keys
   - `.env` file is gitignored

2. **Always use getUserId() helper**
   - Don't call `supabase.auth.getUser()` directly in database functions
   - Ensures consistent error handling

3. **Trust RLS policies**
   - Don't duplicate access checks in application code
   - Let the database enforce security

4. **Handle auth state changes**
   - Always check `session` before authenticated operations
   - Use `onAuthStateChange` for real-time updates

## Testing Auth Flow

### Manual Testing Checklist

- [ ] Sign up with email/password
- [ ] Verify email link works
- [ ] Sign in with verified account
- [ ] Sign out and confirm session cleared
- [ ] Password reset flow
- [ ] Magic link (OTP) sign in
- [ ] Google OAuth (opens in browser)
- [ ] GitHub OAuth (opens in browser)
- [ ] Session persists after app restart
- [ ] Data loads correctly after auth
- [ ] Realtime updates only work when authenticated
- [ ] Sign out clears all state

### Common Issues

**Problem:** OAuth doesn't redirect back to app
**Solution:** Check `redirectTo` URL matches app origin

**Problem:** Session not persisting
**Solution:** Ensure localStorage is available in Tauri webview

**Problem:** "Not authenticated" errors
**Solution:** Check RLS policies are enabled and correct

**Problem:** Realtime not working
**Solution:** Verify subscription only starts after session exists

## Future Improvements

Potential enhancements (not yet implemented):

- [ ] Multi-factor authentication (MFA)
- [ ] Passkey/WebAuthn support
- [ ] Session timeout warnings
- [ ] Concurrent session management
- [ ] Account deletion flow
- [ ] Email change with re-verification
- [ ] Social account linking

## Related Documentation

- [TIMEZONE_IMPLEMENTATION.md](./TIMEZONE_IMPLEMENTATION.md) - User timezone handling
- [TELEGRAM_ARCHITECTURE.md](./TELEGRAM_ARCHITECTURE.md) - Notification system auth
- [../notifications/NOTIFICATION_SETUP.md](../notifications/NOTIFICATION_SETUP.md) - Per-user notifications

## Debugging

### Check Current Session

```typescript
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data.session);
console.log('User:', data.session?.user);
```

### Check User

```typescript
const { data, error } = await supabase.auth.getUser();
console.log('User ID:', data.user?.id);
console.log('Email:', data.user?.email);
console.log('Email Verified:', data.user?.email_confirmed_at);
```

### Monitor Auth Changes

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event); // SIGNED_IN, SIGNED_OUT, etc.
  console.log('Session:', session);
});
```

### Common Auth Events

- `SIGNED_IN` - User logged in
- `SIGNED_OUT` - User logged out
- `TOKEN_REFRESHED` - Token auto-refreshed
- `USER_UPDATED` - User profile changed
- `PASSWORD_RECOVERY` - Password reset initiated

---

**Questions?** Check Supabase Auth docs: https://supabase.com/docs/guides/auth
