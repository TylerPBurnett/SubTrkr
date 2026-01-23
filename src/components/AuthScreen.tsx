import { useState } from 'react';
import { Mail, Lock, Loader2, CheckCircle } from 'lucide-react';
import { signUp, signIn, signInWithOtp, verifyOtp } from '../services/auth';

type AuthMode = 'signin' | 'signup' | 'otp' | 'verify-otp';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setError(null);
        alert('Check your email to confirm your account!');
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
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
      setError(err.message || 'Failed to send code');
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
      setError(err.message || 'Invalid code');
    } finally {
      setIsLoading(false);
    }
  };

  const renderOtpMode = () => (
    <form onSubmit={handleSendOtp} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Email
        </label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input w-full pl-10 pr-4 py-2 rounded-lg"
            placeholder="Enter your email"
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent-red)' }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending...
          </>
        ) : (
          'Send Code'
        )}
      </button>

      <button
        type="button"
        onClick={() => setMode('signin')}
        className="btn-secondary w-full py-2 rounded-lg text-sm"
      >
        Back to sign in
      </button>
    </form>
  );

  const renderVerifyOtpMode = () => (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      {otpSent && (
        <div
          className="p-3 rounded-lg text-sm flex items-center gap-2"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent-green)' }}
        >
          <CheckCircle className="w-4 h-4" />
          Check your email for the 6-digit code
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          6-Digit Code
        </label>
        <input
          type="text"
          value={otpCode}
          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
          maxLength={6}
          className="input w-full px-4 py-2 rounded-lg text-center text-2xl tracking-widest"
          placeholder="000000"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent-red)' }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || otpCode.length !== 6}
        className="btn-primary w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Verifying...
          </>
        ) : (
          'Verify Code'
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode('otp');
          setOtpCode('');
          setOtpSent(false);
        }}
        className="btn-secondary w-full py-2 rounded-lg text-sm"
      >
        Resend code
      </button>
    </form>
  );

  const renderEmailPasswordMode = () => (
    <form onSubmit={handleEmailPassword} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Email
        </label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input w-full pl-10 pr-4 py-2 rounded-lg"
            placeholder="Enter your email"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Password
        </label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="input w-full pl-10 pr-4 py-2 rounded-lg"
            placeholder="Enter your password"
            disabled={isLoading}
          />
        </div>
      </div>

      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--accent-red)' }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {mode === 'signup' ? 'Creating account...' : 'Signing in...'}
          </>
        ) : mode === 'signup' ? (
          'Create Account'
        ) : (
          'Sign In'
        )}
      </button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '1px solid var(--border-default)' }} />
        </div>
        <div className="relative flex justify-center text-sm">
          <span
            className="px-2"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-muted)' }}
          >
            or
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMode('otp')}
        className="btn-secondary w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
      >
        <Mail className="w-4 h-4" />
        Sign in with email code
      </button>

      <div className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
        {mode === 'signin' ? (
          <>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="font-medium"
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
              className="font-medium"
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
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        className="w-full max-w-md card p-8"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            SubTrkr
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Track your subscriptions and bills
          </p>
        </div>

        {mode === 'otp' && renderOtpMode()}
        {mode === 'verify-otp' && renderVerifyOtpMode()}
        {(mode === 'signin' || mode === 'signup') && renderEmailPasswordMode()}
      </div>
    </div>
  );
}
