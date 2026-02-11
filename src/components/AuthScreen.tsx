import { useState } from 'react';
import { Mail, Lock, Loader2, CheckCircle, Shield, Sparkles, Eye, EyeOff, KeyRound, Chrome, Github } from 'lucide-react';
import appIcon from '../../src-tauri/assets/icon.svg';
import { signUp, signIn, signInWithOtp, verifyOtp, resetPassword, signInWithGoogle, signInWithGitHub } from '../services/auth';

type AuthMode = 'signin' | 'signup' | 'otp' | 'verify-otp' | 'reset-password';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);

  // Friendly error message helper
  const getFriendlyError = (errorMessage: string): { message: string; isRateLimit: boolean } => {
    const lowerError = errorMessage.toLowerCase();

    // Rate limiting
    if (lowerError.includes('rate limit') || lowerError.includes('too many requests') || lowerError.includes('exceeded')) {
      return { message: 'Too many attempts. Please wait a few minutes and try again.', isRateLimit: true };
    }

    // Invalid credentials
    if (lowerError.includes('invalid login') || lowerError.includes('invalid credentials')) {
      return { message: 'Invalid email or password. Please check and try again.', isRateLimit: false };
    }

    // User not found
    if (lowerError.includes('user not found') || lowerError.includes('no user')) {
      return { message: 'No account found with this email. Would you like to sign up?', isRateLimit: false };
    }

    // Email already in use
    if (lowerError.includes('already registered') || lowerError.includes('already exists')) {
      return { message: 'An account with this email already exists. Try signing in instead.', isRateLimit: false };
    }

    // Weak password
    if (lowerError.includes('password') && (lowerError.includes('weak') || lowerError.includes('short'))) {
      return { message: 'Password is too weak. Use at least 8 characters with numbers and symbols.', isRateLimit: false };
    }

    // Invalid email
    if (lowerError.includes('invalid email') || lowerError.includes('email format')) {
      return { message: 'Please enter a valid email address.', isRateLimit: false };
    }

    // OTP expired
    if (lowerError.includes('expired') || lowerError.includes('otp')) {
      return { message: 'Code has expired. Please request a new one.', isRateLimit: false };
    }

    // Network error
    if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
      return { message: 'Connection error. Please check your internet and try again.', isRateLimit: false };
    }

    return { message: errorMessage, isRateLimit: false };
  };

  // Email validation helper
  const getEmailSuggestion = (emailInput: string): string | null => {
    const commonDomainTypos: Record<string, string> = {
      // Gmail typos
      'gmial.com': 'gmail.com',
      'gmai.com': 'gmail.com',
      'gmil.com': 'gmail.com',
      'gamil.com': 'gmail.com',
      'gnail.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      // Yahoo typos
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'yhoo.com': 'yahoo.com',
      'yahoo.co': 'yahoo.com',
      // Hotmail typos
      'hotmial.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'hotmal.com': 'hotmail.com',
      'hotamil.com': 'hotmail.com',
      // Outlook typos
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com',
      'outlok.co': 'outlook.com',
      'outllook.com': 'outlook.com',
      // iCloud typos
      'iclod.com': 'icloud.com',
      'icoud.com': 'icloud.com',
      'icloud.co': 'icloud.com',
      // Protonmail typos
      'protonmal.com': 'protonmail.com',
      'protonmial.com': 'protonmail.com',
    };

    const parts = emailInput.split('@');
    if (parts.length !== 2) return null;

    const domain = parts[1].toLowerCase();
    const suggestedDomain = commonDomainTypos[domain];

    if (suggestedDomain) {
      return `${parts[0]}@${suggestedDomain}`;
    }

    return null;
  };

  const emailSuggestion = email && email.includes('@') ? getEmailSuggestion(email) : null;

  // Password strength calculator
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' };

    let score = 0;

    // Length checks
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;

    // Character variety
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: 'var(--accent-red)' };
    if (score <= 4) return { score, label: 'Medium', color: 'var(--accent-amber)' };
    return { score, label: 'Strong', color: 'var(--brand-primary)' };
  };

  const passwordStrength = mode === 'signup' ? getPasswordStrength(password) : null;

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setError(null);
        setSuccessMessage('Check your email to confirm your account!');
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      const { message } = getFriendlyError(err.message || 'Authentication failed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signInWithOtp(email);
      setOtpSent(true);
      setMode('verify-otp');
    } catch (err: any) {
      const { message } = getFriendlyError(err.message || 'Failed to send code');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await verifyOtp(email, otpCode);
    } catch (err: any) {
      const { message } = getFriendlyError(err.message || 'Invalid code');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccessMessage('Check your email for password reset instructions!');
    } catch (err: any) {
      const { message } = getFriendlyError(err.message || 'Failed to send reset email');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    setError(null);
    setSocialLoading(provider);

    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithGitHub();
      }
      // Note: OAuth opens in browser, user may close without completing
      // Keep loading state until they return or cancel
    } catch (err: any) {
      const { message } = getFriendlyError(err.message || `Failed to sign in with ${provider}`);
      setError(message);
      setSocialLoading(null);
    }
  };

  const handleCancelSocialAuth = () => {
    setSocialLoading(null);
    setError(null);
  };

  const renderOtpMode = () => (
    <form onSubmit={handleSendOtp} className="space-y-5">
      <div className="stagger-item" style={{ animationDelay: '0.05s' }}>
        <label className="label mb-2 flex items-center gap-2">
          <Mail className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
          Email Address
        </label>
        <div className="relative group">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            required
            autoFocus
            className="input w-full px-4 py-2.5 rounded-lg transition-all duration-200"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.9375rem'
            }}
            placeholder="your@email.com"
            disabled={isLoading}
          />
        </div>

        {/* Email suggestion */}
        {emailSuggestion && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Did you mean{' '}
            <button
              type="button"
              onClick={() => setEmail(emailSuggestion)}
              className="font-semibold transition-colors duration-200"
              style={{ color: 'var(--brand-primary)' }}
            >
              {emailSuggestion}
            </button>
            ?
          </div>
        )}
      </div>

      {error && (
        <div
          className="p-3.5 rounded-lg text-sm flex items-center gap-2 animate-shake"
          style={{
            backgroundColor: 'var(--accent-red-muted)',
            color: 'var(--accent-red)',
            border: '1px solid var(--accent-red)'
          }}
        >
          <div className="w-1 h-full absolute left-0 top-0 bottom-0 rounded-l-lg" style={{ backgroundColor: 'var(--accent-red)' }} />
          <span className="ml-2">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-3.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2.5 stagger-item"
        style={{ animationDelay: '0.1s' }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="tracking-tight">Sending code...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span className="tracking-tight">Send Magic Code</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => setMode('signin')}
        className="btn-secondary w-full py-2.5 rounded-lg text-sm transition-all duration-200 stagger-item"
        style={{ animationDelay: '0.15s' }}
      >
        <span className="tracking-tight">← Back to sign in</span>
      </button>
    </form>
  );

  const renderVerifyOtpMode = () => (
    <form onSubmit={handleVerifyOtp} className="space-y-5">
      {otpSent && (
        <div
          className="p-3.5 rounded-lg text-sm flex items-center gap-2.5 stagger-item"
          style={{
            animationDelay: '0.05s',
            backgroundColor: 'var(--brand-muted)',
            color: 'var(--brand-primary)',
            border: '1px solid var(--brand-primary)'
          }}
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium tracking-tight">Check your email for the 6-digit code</span>
        </div>
      )}

      <div className="stagger-item" style={{ animationDelay: '0.1s' }}>
        <label className="label mb-3 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
          Verification Code
        </label>
        <input
          type="text"
          value={otpCode}
          onChange={(e) => {
            setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
            setError(null);
          }}
          required
          maxLength={6}
          autoFocus
          className="input w-full px-4 py-4 rounded-lg text-center transition-all duration-200"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '2rem',
            letterSpacing: '0.5em',
            fontWeight: 700
          }}
          placeholder="••••••"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div
          className="p-3.5 rounded-lg text-sm flex items-center gap-2 animate-shake"
          style={{
            backgroundColor: 'var(--accent-red-muted)',
            color: 'var(--accent-red)',
            border: '1px solid var(--accent-red)'
          }}
        >
          <div className="w-1 h-full absolute left-0 top-0 bottom-0 rounded-l-lg" style={{ backgroundColor: 'var(--accent-red)' }} />
          <span className="ml-2">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || otpCode.length !== 6}
        className="btn-primary w-full py-3.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2.5 stagger-item"
        style={{ animationDelay: '0.15s' }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="tracking-tight">Verifying...</span>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            <span className="tracking-tight">Verify & Sign In</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode('otp');
          setOtpCode('');
          setOtpSent(false);
        }}
        className="btn-secondary w-full py-2.5 rounded-lg text-sm transition-all duration-200 stagger-item"
        style={{ animationDelay: '0.2s' }}
      >
        <span className="tracking-tight">Resend code</span>
      </button>
    </form>
  );

  const renderResetPasswordMode = () => (
    <form onSubmit={handleResetPassword} className="space-y-5">
      <div className="stagger-item" style={{ animationDelay: '0.05s' }}>
        <label className="label mb-2 flex items-center gap-2">
          <Mail className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
            setSuccessMessage(null);
          }}
          required
          autoFocus
          className="input w-full px-4 py-2.5 rounded-lg transition-all duration-200"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.9375rem'
          }}
          placeholder="your@email.com"
          disabled={isLoading}
        />

        {/* Email suggestion */}
        {emailSuggestion && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Did you mean{' '}
            <button
              type="button"
              onClick={() => setEmail(emailSuggestion)}
              className="font-semibold transition-colors duration-200"
              style={{ color: 'var(--brand-primary)' }}
            >
              {emailSuggestion}
            </button>
            ?
          </div>
        )}
      </div>

      {successMessage && (
        <div
          className="p-3.5 rounded-lg text-sm flex items-center gap-2.5 animate-in"
          style={{
            backgroundColor: 'var(--brand-muted)',
            color: 'var(--brand-primary)',
            border: '1px solid var(--brand-primary)'
          }}
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium tracking-tight">{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          className="p-3.5 rounded-lg text-sm flex items-center gap-2 animate-shake"
          style={{
            backgroundColor: 'var(--accent-red-muted)',
            color: 'var(--accent-red)',
            border: '1px solid var(--accent-red)'
          }}
        >
          <div className="w-1 h-full absolute left-0 top-0 bottom-0 rounded-l-lg" style={{ backgroundColor: 'var(--accent-red)' }} />
          <span className="ml-2">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-3.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2.5 stagger-item"
        style={{ animationDelay: '0.1s' }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="tracking-tight">Sending reset link...</span>
          </>
        ) : (
          <>
            <KeyRound className="w-4 h-4" />
            <span className="tracking-tight">Send Reset Link</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => setMode('signin')}
        className="btn-secondary w-full py-2.5 rounded-lg text-sm transition-all duration-200 stagger-item"
        style={{ animationDelay: '0.15s' }}
      >
        <span className="tracking-tight">← Back to sign in</span>
      </button>
    </form>
  );

  const renderEmailPasswordMode = () => (
    <form onSubmit={handleEmailPassword} className="space-y-5">
      <div className="stagger-item" style={{ animationDelay: '0.05s' }}>
        <label className="label mb-2 flex items-center gap-2">
          <Mail className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
            setSuccessMessage(null);
          }}
          required
          autoFocus
          className="input w-full px-4 py-2.5 rounded-lg transition-all duration-200"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.9375rem'
          }}
          placeholder="your@email.com"
          disabled={isLoading}
        />

        {/* Email suggestion */}
        {emailSuggestion && (
          <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Did you mean{' '}
            <button
              type="button"
              onClick={() => setEmail(emailSuggestion)}
              className="font-semibold transition-colors duration-200"
              style={{ color: 'var(--brand-primary)' }}
            >
              {emailSuggestion}
            </button>
            ?
          </div>
        )}
      </div>

      <div className="stagger-item" style={{ animationDelay: '0.1s' }}>
        <label className="label mb-2 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5" style={{ color: 'var(--brand-primary)' }} />
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
              setSuccessMessage(null);
            }}
            required
            minLength={6}
            className="input w-full px-4 py-2.5 pr-12 rounded-lg transition-all duration-200"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.9375rem'
            }}
            placeholder="••••••••"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200"
            style={{ color: 'var(--text-muted)' }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5 hover:opacity-70" />
            ) : (
              <Eye className="w-5 h-5 hover:opacity-70" />
            )}
          </button>
        </div>

        {/* Password strength meter (signup only) */}
        {mode === 'signup' && password && passwordStrength && (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>Password strength</span>
              <span
                className="font-bold tracking-tight"
                style={{ color: passwordStrength.color }}
              >
                {passwordStrength.label}
              </span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--border-muted)' }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  backgroundColor: passwordStrength.color,
                  width: `${(passwordStrength.score / 6) * 100}%`
                }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
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

      {mode === 'signin' && (
        <div className="stagger-item -mt-2" style={{ animationDelay: '0.12s' }}>
          <button
            type="button"
            onClick={() => setMode('reset-password')}
            className="text-sm font-semibold tracking-tight transition-colors duration-200"
            style={{ color: 'var(--brand-primary)' }}
          >
            Forgot password?
          </button>
        </div>
      )}

      {/* Terms of Service (signup only) */}
      {mode === 'signup' && (
        <div className="stagger-item" style={{ animationDelay: '0.12s' }}>
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded transition-all duration-200 cursor-pointer"
              style={{
                accentColor: 'var(--brand-primary)',
                borderColor: 'var(--border-default)'
              }}
            />
            <span className="text-sm leading-tight" style={{ color: 'var(--text-secondary)' }}>
              I agree to the{' '}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-semibold transition-colors duration-200"
                style={{ color: 'var(--brand-primary)' }}
              >
                Terms of Service
              </a>
              {' '}and{' '}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-semibold transition-colors duration-200"
                style={{ color: 'var(--brand-primary)' }}
              >
                Privacy Policy
              </a>
            </span>
          </label>
        </div>
      )}

      {successMessage && (
        <div
          className="p-3.5 rounded-lg text-sm flex items-center gap-2.5 animate-in"
          style={{
            backgroundColor: 'var(--brand-muted)',
            color: 'var(--brand-primary)',
            border: '1px solid var(--brand-primary)'
          }}
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium tracking-tight">{successMessage}</span>
        </div>
      )}

      {error && (
        <div
          className="p-3.5 rounded-lg text-sm flex items-center gap-2 animate-shake"
          style={{
            backgroundColor: 'var(--accent-red-muted)',
            color: 'var(--accent-red)',
            border: '1px solid var(--accent-red)'
          }}
        >
          <div className="w-1 h-full absolute left-0 top-0 bottom-0 rounded-l-lg" style={{ backgroundColor: 'var(--accent-red)' }} />
          <span className="ml-2">{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || (mode === 'signup' && !agreedToTerms)}
        className="btn-primary w-full py-3.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2.5 stagger-item"
        style={{ animationDelay: '0.15s' }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="tracking-tight">
              {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
            </span>
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            <span className="tracking-tight">
              {mode === 'signup' ? 'Create Account' : 'Sign In'}
            </span>
          </>
        )}
      </button>

      <div className="relative my-6 stagger-item" style={{ animationDelay: '0.2s' }}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '2px solid var(--border-muted)' }} />
        </div>
        <div className="relative flex justify-center text-xs font-semibold tracking-wider">
          <span
            className="px-3 py-1 rounded-full"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-muted)',
              border: '2px solid var(--border-muted)'
            }}
          >
            OR
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMode('otp')}
        className="btn-secondary w-full py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2.5 stagger-item"
        style={{ animationDelay: '0.25s' }}
      >
        <Sparkles className="w-4 h-4" />
        <span className="tracking-tight">Sign in with magic code</span>
      </button>

      {/* Social auth buttons */}
      <div className="grid grid-cols-2 gap-3 stagger-item" style={{ animationDelay: '0.3s' }}>
        <button
          type="button"
          onClick={() => handleSocialAuth('google')}
          disabled={isLoading || socialLoading !== null}
          className="btn-secondary py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
        >
          {socialLoading === 'google' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Chrome className="w-4 h-4" />
          )}
          <span className="tracking-tight text-sm">Google</span>
        </button>
        <button
          type="button"
          onClick={() => handleSocialAuth('github')}
          disabled={isLoading || socialLoading !== null}
          className="btn-secondary py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
        >
          {socialLoading === 'github' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Github className="w-4 h-4" />
          )}
          <span className="tracking-tight text-sm">GitHub</span>
        </button>
      </div>

      <div className="text-center text-sm stagger-item" style={{ animationDelay: '0.35s', color: 'var(--text-secondary)' }}>
        {mode === 'signin' ? (
          <>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="font-bold tracking-tight transition-colors duration-200"
              style={{ color: 'var(--brand-primary)' }}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="font-bold tracking-tight transition-colors duration-200"
              style={{ color: 'var(--brand-primary)' }}
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </form>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div
        className="w-full max-w-md card animate-in"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '2px solid var(--border-default)',
          overflow: 'hidden'
        }}
      >
        {/* Gradient header bar with shimmer */}
        <div
          className="relative h-2 mb-8 -mx-6 -mt-6"
          style={{
            background: 'linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-primary-hover) 100%)',
            boxShadow: '0 4px 14px -3px rgba(34, 197, 94, 0.35)'
          }}
        >
          <div
            className="shimmer absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)'
            }}
          />
        </div>

        {/* Brand icon */}
        <div className="flex justify-center mb-6">
          <div
            className="p-4 rounded-2xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '2px solid var(--border-default)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <img src={appIcon} alt="SubTrkr logo" className="w-10 h-10" />
          </div>
        </div>

        {/* Header text */}
        <div className="mb-8 text-center">
          <h1
            className="font-bold mb-2"
            style={{
              color: 'var(--text-primary)',
              fontSize: '2.25rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.1
            }}
          >
            SubTrkr
          </h1>
          <p
            className="text-sm font-medium tracking-tight"
            style={{ color: 'var(--text-secondary)' }}
          >
            Track your subscriptions and bills
          </p>
        </div>

        {/* Form container with padding - key triggers re-animation on mode change */}
        <div key={mode} className="px-6 pb-6 animate-in">
          {/* Show waiting state when social auth is in progress */}
          {socialLoading ? (
            <div className="space-y-5 py-6">
              <div className="flex justify-center">
                <div
                  className="p-4 rounded-2xl"
                  style={{
                    backgroundColor: socialLoading === 'google' ? '#4285F4' : '#24292e',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
                  }}
                >
                  {socialLoading === 'google' ? (
                    <Chrome className="w-8 h-8" style={{ color: 'white' }} />
                  ) : (
                    <Github className="w-8 h-8" style={{ color: 'white' }} />
                  )}
                </div>
              </div>

              <div className="text-center">
                <h3
                  className="text-xl font-bold mb-2"
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    letterSpacing: '-0.02em'
                  }}
                >
                  Waiting for {socialLoading === 'google' ? 'Google' : 'GitHub'} authentication
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Complete the sign-in process in your browser
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Loader2
                  className="w-5 h-5 animate-spin"
                  style={{ color: 'var(--brand-primary)' }}
                />
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Authenticating...
                </span>
              </div>

              {/* Prominent action buttons */}
              <div className="space-y-3 pt-2">
                <button
                  onClick={handleCancelSocialAuth}
                  className="btn-primary w-full py-3.5 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span className="tracking-tight">← Back to sign-in options</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full" style={{ borderTop: '1px solid var(--border-muted)' }} />
                  </div>
                  <div className="relative flex justify-center text-xs font-semibold">
                    <span
                      className="px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-muted)'
                      }}
                    >
                      Wrong provider?
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSocialLoading(null);
                    handleSocialAuth(socialLoading === 'google' ? 'github' : 'google');
                  }}
                  className="btn-secondary w-full py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {socialLoading === 'google' ? (
                    <>
                      <Github className="w-4 h-4" />
                      <span className="tracking-tight">Switch to GitHub instead</span>
                    </>
                  ) : (
                    <>
                      <Chrome className="w-4 h-4" />
                      <span className="tracking-tight">Switch to Google instead</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-center pt-2" style={{ color: 'var(--text-muted)' }}>
                If the browser didn't open, check your pop-up settings
              </p>
            </div>
          ) : (
            <>
              {mode === 'otp' && renderOtpMode()}
              {mode === 'verify-otp' && renderVerifyOtpMode()}
              {mode === 'reset-password' && renderResetPasswordMode()}
              {(mode === 'signin' || mode === 'signup') && renderEmailPasswordMode()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
