import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Eye, EyeOff, Lock, AlertCircle, X } from 'lucide-react';
import { supabase } from '../services/supabase';

interface SetNewPasswordProps {
  onComplete: () => void;
  onDismiss: () => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'var(--accent-red)' };
  if (score <= 4) return { score, label: 'Fair', color: 'var(--accent-orange)' };
  if (score <= 5) return { score, label: 'Good', color: 'var(--accent-blue)' };
  return { score, label: 'Strong', color: 'var(--accent-green)' };
}

export default function SetNewPassword({ onComplete, onDismiss }: SetNewPasswordProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = password.length >= 8 && passwordsMatch && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      onComplete();
    } catch (err: any) {
      console.error('Failed to update password:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            backgroundColor: 'var(--bg-base)',
          }}
        >
          <Dialog.Content
            ref={contentRef}
            aria-modal="true"
            className="relative w-full max-w-md p-8 rounded-2xl shadow-xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
            }}
            onOpenAutoFocus={(event) => {
              // The password field owns initial focus; keep that behaviour
              // instead of pulling focus to the close button.
              if (contentRef.current?.contains(document.activeElement)) {
                event.preventDefault();
              }
            }}
          >
            {/* Dismiss */}
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close without setting a password"
              className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center justify-center mb-6">
              <div
                className="p-3 rounded-full"
                style={{
                  backgroundColor: 'var(--brand-muted)',
                }}
              >
                <Lock className="w-6 h-6" style={{ color: 'var(--brand-primary)' }} />
              </div>
            </div>

            <Dialog.Title
              className="text-2xl font-bold text-center mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              Set New Password
            </Dialog.Title>
            <Dialog.Description
              className="text-center mb-6"
              style={{ color: 'var(--text-secondary)' }}
            >
              Choose a strong password for your account
            </Dialog.Description>

            {/* Error message */}
            {error && (
              <div
                className="mb-4 p-3 rounded-lg flex items-start gap-2"
                style={{
                  backgroundColor: 'var(--accent-red-muted)',
                  border: '1px solid var(--accent-red)',
                }}
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent-red)' }} />
                <span style={{ color: 'var(--accent-red)' }}>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                    }}
                    placeholder="Enter new password"
                    required
                    autoFocus
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                    style={{
                      color: 'var(--text-muted)',
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {password && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Password strength:
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: passwordStrength.color }}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ backgroundColor: 'var(--bg-hover)' }}
                    >
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          backgroundColor: passwordStrength.color,
                          width: `${(passwordStrength.score / 6) * 100}%`
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className={password.length >= 8 ? 'font-medium' : ''}>
                        {password.length >= 8 ? '✓' : '○'} 8+ chars
                      </span>
                      <span className={/[A-Z]/.test(password) ? 'font-medium' : ''}>
                        {/[A-Z]/.test(password) ? '✓' : '○'} uppercase
                      </span>
                      <span className={/[0-9]/.test(password) ? 'font-medium' : ''}>
                        {/[0-9]/.test(password) ? '✓' : '○'} number
                      </span>
                      <span className={/[^a-zA-Z0-9]/.test(password) ? 'font-medium' : ''}>
                        {/[^a-zA-Z0-9]/.test(password) ? '✓' : '○'} special char
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 rounded-xl transition-all duration-200 outline-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      border: confirmPassword && !passwordsMatch
                        ? '1px solid var(--accent-red)'
                        : '1px solid var(--border-default)',
                    }}
                    placeholder="Confirm new password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                    style={{
                      color: 'var(--text-muted)',
                    }}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--accent-red)' }}>
                    Passwords do not match
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: canSubmit ? 'var(--brand-primary)' : 'var(--bg-muted)',
                  color: canSubmit ? 'var(--text-inverse)' : 'var(--text-muted)',
                }}
              >
                {isSubmitting ? 'Updating Password...' : 'Set New Password'}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
