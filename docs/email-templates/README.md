# SubTrkr Email Templates

Professional, branded email templates using your actual brand colors (#22c55e green gradient).

## Design Features

✅ **Your Brand Colors** - Green gradient (#22c55e → #16a34a) throughout
✅ **Clean & Modern** - Subtle decorative elements, rounded corners, card-based design
✅ **Mobile Responsive** - Works perfectly on all devices and email clients
✅ **Deep Link Ready** - Uses `{{ .RedirectTo }}` for `subtrkr://` URLs
✅ **Professional Typography** - System fonts with proper hierarchy and spacing
✅ **Contextual Info Boxes** - Security warnings, tips, and helpful information

## Installation Instructions

Go to: **https://supabase.com/dashboard/project/bpgsfyallqqvvtjorybl/auth/templates**

### 1. Confirm Signup
- **Subject**: `Welcome to SubTrkr — Verify Your Email`
- **Sender Name**: `SubTrkr`
- **HTML**: Copy from `confirm-signup.html`

### 2. Reset Password
- **Subject**: `Reset Your SubTrkr Password`
- **Sender Name**: `SubTrkr`
- **HTML**: Copy from `reset-password.html`

### 3. Magic Link (Sign In with OTP)
- **Subject**: `Sign In to SubTrkr`
- **Sender Name**: `SubTrkr`
- **HTML**: Copy from `magic-link.html`

### 4. Change Email Address
- **Subject**: `Confirm Your New Email — SubTrkr`
- **Sender Name**: `SubTrkr`
- **HTML**: Copy from `change-email.html`

## Color Palette Used

All templates use your actual SubTrkr brand colors:

- **Primary Green**: `#22c55e` (--brand-primary)
- **Darker Green**: `#16a34a` (--brand-primary-hover)
- **Light Green BG**: `#f0fdf4` (--brand-muted)
- **Green Text**: `#166534` (--brand-text)
- **Accent Colors**: Blue (#3b82f6), Amber (#f59e0b), Red (#ef4444)
- **Text**: `#171717` (primary), `#525252` (secondary)
- **Backgrounds**: `#ffffff` (cards), `#f5f5f5` (footer)

## Template Structure

Each template includes:
- **Header** - Green gradient with decorative circles and emoji icon
- **Content** - Clear message with prominent CTA button
- **Info/Warning Box** - Contextual information with colored backgrounds
- **Footer** - SubTrkr badge + fallback link in monospace
- **Shadows** - Subtle card elevation matching your app design

## Testing

After updating:
1. Trigger each auth flow in your app
2. Check email in inbox
3. Verify branding looks correct
4. Test deep links open the app
5. Check mobile rendering

## Variables Available

Supabase template variables:
- `{{ .RedirectTo }}` - Deep link URL with auth token
- `{{ .Email }}` - User's email address
- `{{ .TokenHash }}` - Verification/reset token hash
- `{{ .Token }}` - Magic link 6-digit code (OTP only)

## Optional: Custom SMTP

For emails from `noreply@subtrkr.com`:

1. Go to **Authentication > Settings > SMTP Settings**
2. Configure with your email provider (SendGrid, Mailgun, etc.)
3. Set sender as `SubTrkr <noreply@subtrkr.com>`

This removes "via Supabase" from email headers.
