const TELEGRAM_BOT_TOKEN_RE = /^\d+:[A-Za-z0-9_-]{30,}$/;

export type TelegramBotTokenValidationResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

export function validateTelegramBotToken(
  rawToken: string,
): TelegramBotTokenValidationResult {
  const token = rawToken.trim();

  if (!token) {
    return { ok: false, error: 'Bot token is required.' };
  }

  if (!TELEGRAM_BOT_TOKEN_RE.test(token)) {
    return {
      ok: false,
      error:
        'Bot token format looks wrong. It should look like 123456789:ABC-DEF... from @BotFather.',
    };
  }

  return { ok: true, token };
}
