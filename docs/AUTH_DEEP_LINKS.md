# Authentication Deep Links

SubTrkr uses deep links (`subtrkr://`) to redirect users back to the app after email verification, password reset, and OAuth flows.

## How It Works

1. User triggers auth flow (signup, password reset, OAuth)
2. Email sent with `subtrkr://auth-callback?code=<token>` link
3. User clicks link → app opens/focuses
4. App exchanges code for session → user signed in

## Implementation

### Deep Link Plugin
- **Rust**: `tauri-plugin-deep-link` in `src-tauri/Cargo.toml`
- **JS**: `@tauri-apps/plugin-deep-link` in `package.json`
- **Scheme**: `subtrkr://` registered in `tauri.conf.json`
- **Permission**: `deep-link:default` in `capabilities/default.json`

### Backend (`src-tauri/src/lib.rs`)
```rust
.plugin(tauri_plugin_deep_link::init())
.setup(|app| {
    app.deep_link().on_open_url(move |event| {
        // Focus window when deep link arrives
        if let Some(window) = handle.get_webview_window("main") {
            let _ = window.set_focus();
        }
    });
    Ok(())
})
```

### Auth Service (`src/services/auth.ts`)
All auth functions use `emailRedirectTo: 'subtrkr://auth-callback'`:
- `signUp()` - email verification
- `signInWithOtp()` - magic links
- `resetPassword()` - password reset
- `signInWithGoogle()` - OAuth redirect
- `signInWithGitHub()` - OAuth redirect
- `resendVerificationEmail()` - email verification

### Frontend Handler (`src/App.tsx`)
```typescript
useEffect(() => {
  async function handleDeepLink(urls: string[]) {
    const url = new URL(urls[0]);
    const code = url.searchParams.get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  }

  getCurrent().then((urls) => urls && handleDeepLink(urls));
  onOpenUrl((urls) => handleDeepLink(urls));
}, []);
```

### Password Recovery (`src/components/SetNewPassword.tsx`)
- Detects `PASSWORD_RECOVERY` event
- Shows modal for user to set new password
- Calls `supabase.auth.updateUser({ password })`

## Supabase Configuration

### Required: Add Redirect URL
`Authentication > URL Configuration > Redirect URLs`:
```
subtrkr://auth-callback
```

### Optional: Update Email Templates
`Authentication > Email Templates` - replace `{{ .SiteURL }}` with `{{ .RedirectTo }}`

## Testing

1. `bun run tauri dev`
2. Sign up with new email
3. Click verification link in email
4. App should open and sign you in automatically

For production builds, deep links work natively without additional setup.
