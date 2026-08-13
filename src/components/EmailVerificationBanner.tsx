import { useState } from 'react';
import { Mail, X, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { resendVerificationEmail } from '../services/auth';

interface EmailVerificationBannerProps {
  email: string;
  onDismiss?: () => void;
}

export default function EmailVerificationBanner({ email, onDismiss }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setError(null);

    try {
      await resendVerificationEmail(email);
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  if (resendSuccess) {
    return (
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--brand-muted)',
          borderBottom: '1px solid var(--brand-primary)'
        }}
      >
        <div className="flex items-center gap-2.5">
          <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--brand-text)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--brand-text)' }}>
            Verification email sent! Check your inbox.
          </span>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="p-1 rounded-md transition-colors duration-200"
            style={{ color: 'var(--brand-text)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="px-4 py-3 flex items-center justify-between gap-3"
      style={{
        backgroundColor: 'var(--accent-amber-muted)',
        borderBottom: '1px solid var(--accent-amber)'
      }}
    >
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-amber)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Please verify your email address.
          {error && (
            <span style={{ color: 'var(--accent-red-text)' }}> {error}</span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleResend}
          disabled={isResending}
          className="text-sm font-semibold transition-colors duration-200 flex items-center gap-1.5 px-3 py-1.5 rounded-md"
          style={{
            color: 'var(--accent-amber-text)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)'
          }}
        >
          {isResending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-3.5 h-3.5" />
              Resend
            </>
          )}
        </button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Dismiss email verification banner"
            className="p-1 rounded-md transition-colors duration-200"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
