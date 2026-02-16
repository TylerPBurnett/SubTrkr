# Email Templates

Professional, branded email templates for all Supabase auth flows.

## Features

- **Brand Colors**: Green gradient (#22c55e → #16a34a)
- **Logo**: Inline SVG (white on green background)
- **Modern Design**: Card-based, rounded corners, subtle shadows
- **Mobile Responsive**: Works on all devices
- **Deep Link Ready**: Uses `{{ .RedirectTo }}` for `subtrkr://` URLs

## Templates

Location: `docs/email-templates/`

1. **confirm-signup.html** - Email verification
2. **reset-password.html** - Password reset
3. **magic-link.html** - Passwordless sign-in
4. **change-email.html** - Email change confirmation

## Installation

Go to: https://supabase.com/dashboard/project/bpgsfyallqqvvtjorybl/auth/templates

For each template:
1. Click template name
2. Update **Sender Name** to `SubTrkr`
3. Update **Subject** (see below)
4. Copy HTML from file and paste
5. Save

### Subject Lines

- **Confirm Signup**: `Welcome to SubTrkr — Verify Your Email`
- **Reset Password**: `Reset Your SubTrkr Password`
- **Magic Link**: `Sign In to SubTrkr`
- **Change Email**: `Confirm Your New Email — SubTrkr`

## Design Elements

- Green gradient header with floating circle decorations
- 64x76px white logo
- Prominent green CTA buttons with shadow
- Color-coded info boxes (green security, amber warnings, blue tips, red alerts)
- Monospace fallback links
- Footer with SubTrkr badge

## Testing

1. Trigger auth flow in app
2. Check email inbox
3. Verify branding and logo
4. Test deep link opens app

## Optional: Custom SMTP

For emails from `noreply@subtrkr.com`:

`Authentication > Settings > SMTP Settings` - configure with SendGrid, Mailgun, etc.
