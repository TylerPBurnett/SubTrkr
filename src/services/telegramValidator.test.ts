import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { validateTelegramBotToken } from './telegramValidator';

describe('validateTelegramBotToken', () => {
  test('accepts and trims valid tokens', () => {
    const result = validateTelegramBotToken(
      '  4839574812:AAFD39kkdpWt3ywyRZergyOLMaJhac60qc  ',
    );

    assert.deepEqual(result, {
      ok: true,
      token: '4839574812:AAFD39kkdpWt3ywyRZergyOLMaJhac60qc',
    });
  });

  test('rejects empty input', () => {
    assert.deepEqual(validateTelegramBotToken('   '), {
      ok: false,
      error: 'Bot token is required.',
    });
  });

  test('rejects missing colon separator', () => {
    assert.deepEqual(
      validateTelegramBotToken('4839574812AAFD39kkdpWt3ywyRZergyOLMaJhac60qc'),
      {
        ok: false,
        error:
          'Bot token format looks wrong. It should look like 123456789:ABC-DEF... from @BotFather.',
      },
    );
  });

  test('rejects invalid characters', () => {
    assert.deepEqual(
      validateTelegramBotToken('4839574812:AAFD39kkdpWt3ywyRZergyOLMaJhac60q!'),
      {
        ok: false,
        error:
          'Bot token format looks wrong. It should look like 123456789:ABC-DEF... from @BotFather.',
      },
    );
  });

  test('rejects tokens that are too short', () => {
    assert.deepEqual(validateTelegramBotToken('123456:short-token'), {
      ok: false,
      error:
        'Bot token format looks wrong. It should look like 123456789:ABC-DEF... from @BotFather.',
    });
  });
});
