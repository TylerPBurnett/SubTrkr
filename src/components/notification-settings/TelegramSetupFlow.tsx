import { Check, Link2, Loader2 } from 'lucide-react';

interface TelegramSetupFlowProps {
  botName: string;
  botToken: string;
  polling: boolean;
  saving: boolean;
  step: 1 | 2;
  verifying: boolean;
  onBack: () => void;
  onCancel: () => void;
  onDetectChat: () => void;
  onTokenChange: (value: string) => void;
  onVerify: () => void;
}

export function TelegramSetupFlow({
  botName,
  botToken,
  polling,
  saving,
  step,
  verifying,
  onBack,
  onCancel,
  onDetectChat,
  onTokenChange,
  onVerify,
}: TelegramSetupFlowProps) {
  return (
    <div className="mt-3 space-y-3">
      {step === 1 && (
        <div
          className="p-3 rounded-lg text-sm space-y-3"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div>
            <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Step 1: Create Your Bot
            </p>
            <ol className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <li>1. Open Telegram and search for <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>@BotFather</code></li>
              <li>2. Send <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>/newbot</code> and follow the prompts</li>
              <li>3. Copy the bot token BotFather gives you</li>
            </ol>
          </div>
          <input
            type="text"
            value={botToken}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder="Paste your bot token here"
            className="input w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button
              onClick={onVerify}
              disabled={!botToken.trim() || verifying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#0088cc', color: 'white' }}
            >
              {verifying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Verify Bot
            </button>
            <button
              onClick={onCancel}
              className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div
          className="p-3 rounded-lg text-sm space-y-3"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div
            className="flex items-center gap-2 p-2 rounded-lg"
            style={{
              backgroundColor: 'var(--accent-green)15',
              color: 'var(--accent-green)',
            }}
          >
            <Check className="w-4 h-4" />
            <span className="text-xs font-medium">Bot verified: {botName}</span>
          </div>
          <div>
            <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Step 2: Link Your Account
            </p>
            <ol className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <li>1. Open Telegram and find your bot (<strong>{botName}</strong>)</li>
              <li>2. Send <code className="px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-hover)' }}>/start</code> to it</li>
              <li>3. Come back here and click the button below</li>
            </ol>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDetectChat}
              disabled={polling || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#0088cc', color: 'white' }}
            >
              {polling || saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Link2 className="w-3.5 h-3.5" />
              )}
              {polling ? 'Detecting...' : saving ? 'Connecting...' : 'I sent /start'}
            </button>
            <button
              onClick={onBack}
              className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Back
            </button>
            <button
              onClick={onCancel}
              className="btn-secondary px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
