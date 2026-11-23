/**
 * One place for every Claude call (Anthropic SDK). Used by the Edge Functions
 * (Deno, resolved through each function's deno.json) and by the Node tests.
 *
 * The API key lives only in the server environment (Supabase secret
 * ANTHROPIC_API_KEY). It is never shipped in the app.
 */
import Anthropic from '@anthropic-ai/sdk';

/** Model used for both document extraction and the consultation agent. */
export const MODEL = 'claude-opus-5-5';

export function makeClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
}

export class ClaudeError extends Error {
  readonly reason: 'refusal' | 'max_tokens' | 'invalid_json' | 'no_text';
  constructor(reason: ClaudeError['reason'], message: string) {
    super(message);
    this.reason = reason;
  }
}

type StructuredRequest = {
  system: string;
  messages: Anthropic.Beta.BetaMessageParam[];
  /** JSON schema of the answer (every object: additionalProperties false). */
  schema: Record<string, unknown>;
  effort?: 'low' | 'medium' | 'high';
  maxTokens?: number;
};

/**
 * Calls Claude with structured outputs (`output_config.format`), so the reply
 * is guaranteed to be JSON matching `schema`. Refusals fall back server-side
 * to another model ("server-side fallback" beta).
 */
export async function callStructured<T>(client: Anthropic, req: StructuredRequest): Promise<T> {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: req.maxTokens ?? 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: req.system,
    messages: req.messages,
    output_config: {
      effort: req.effort ?? 'medium',
      format: { type: 'json_schema', schema: req.schema },
    },
  });

  if (response.stop_reason === 'refusal') {
    throw new ClaudeError('refusal', 'הבקשה נדחתה על ידי מסנני הבטיחות.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new ClaudeError('max_tokens', 'התשובה ארוכה מדי.');
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  if (!text) throw new ClaudeError('no_text', 'לא התקבלה תשובה.');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ClaudeError('invalid_json', 'התשובה לא הייתה בפורמט הצפוי.');
  }
}
