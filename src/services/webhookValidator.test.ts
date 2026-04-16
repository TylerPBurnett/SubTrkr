import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { validateWebhookUrl } from './webhookValidator';

describe('validateWebhookUrl', () => {
  test('accepts and normalizes Discord webhooks', () => {
    const result = validateWebhookUrl(
      'discord',
      '  HTTPS://Discord.com/api/webhooks/123/abc#ignored  ',
    );

    assert.deepEqual(result, {
      ok: true,
      url: 'https://discord.com/api/webhooks/123/abc',
    });
  });

  test('accepts Slack webhooks with query parameters', () => {
    const result = validateWebhookUrl(
      'slack',
      'https://hooks.slack.com/services/T000/B000/XXX?wait=true',
    );

    assert.deepEqual(result, {
      ok: true,
      url: 'https://hooks.slack.com/services/T000/B000/XXX?wait=true',
    });
  });

  test('rejects non-https URLs', () => {
    assert.deepEqual(
      validateWebhookUrl('discord', 'http://discord.com/api/webhooks/123/abc'),
      { ok: false, error: 'Webhook URL must use HTTPS.' },
    );
  });

  test('rejects wrong hostnames', () => {
    assert.deepEqual(
      validateWebhookUrl(
        'discord',
        'https://example.com/api/webhooks/123/abc',
      ),
      {
        ok: false,
        error: 'Discord webhook must be at https://discord.com/...',
      },
    );
  });

  test('rejects wrong path prefixes', () => {
    assert.deepEqual(
      validateWebhookUrl('slack', 'https://hooks.slack.com/not-services/abc'),
      {
        ok: false,
        error:
          'Webhook URL must start with https://hooks.slack.com/services/...',
      },
    );
  });

  test('rejects embedded credentials', () => {
    assert.deepEqual(
      validateWebhookUrl(
        'discord',
        'https://user:pass@discord.com/api/webhooks/123/abc',
      ),
      {
        ok: false,
        error: 'Webhook URL must not contain embedded credentials.',
      },
    );
  });

  test('rejects telegram webhook validation', () => {
    assert.deepEqual(validateWebhookUrl('telegram', 'https://example.com'), {
      ok: false,
      error: 'Telegram does not use a webhook URL.',
    });
  });
});
