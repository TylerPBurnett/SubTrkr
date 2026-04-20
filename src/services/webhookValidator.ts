import type { NotificationChannelType } from '@/types';

/**
 * Strict allowlist of permitted webhook destinations per channel type.
 * Only HTTPS, only known provider hostnames, only expected path prefixes.
 *
 * IMPORTANT: The `send-notifications` edge function MUST mirror this allowlist.
 * Any change here requires a corresponding update server-side.
 */
const WEBHOOK_ALLOWLIST = {
  discord: { hostname: 'discord.com', pathPrefix: '/api/webhooks/' },
  slack: { hostname: 'hooks.slack.com', pathPrefix: '/services/' },
} as const;

export type WebhookValidationResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export function validateWebhookUrl(
  channel: NotificationChannelType,
  rawUrl: string,
): WebhookValidationResult {
  if (channel === 'telegram') {
    return { ok: false, error: 'Telegram does not use a webhook URL.' };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { ok: false, error: 'Webhook URL is required.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Webhook URL is not a valid URL.' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Webhook URL must use HTTPS.' };
  }

  if (parsed.username || parsed.password) {
    return {
      ok: false,
      error: 'Webhook URL must not contain embedded credentials.',
    };
  }

  const expected = WEBHOOK_ALLOWLIST[channel];
  if (parsed.hostname.toLowerCase() !== expected.hostname) {
    const label = channel === 'discord' ? 'Discord' : 'Slack';
    return {
      ok: false,
      error: `${label} webhook must be at https://${expected.hostname}/...`,
    };
  }

  if (!parsed.pathname.startsWith(expected.pathPrefix)) {
    return {
      ok: false,
      error: `Webhook URL must start with https://${expected.hostname}${expected.pathPrefix}...`,
    };
  }

  parsed.hash = '';
  return { ok: true, url: parsed.toString() };
}
