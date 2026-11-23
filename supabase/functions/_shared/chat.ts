/**
 * The consultation agent: builds the pet context, calls Claude with a
 * structured {reply, triage_level} answer, then applies the hard safety rules.
 */
import type Anthropic from '@anthropic-ai/sdk';

import { callStructured } from './claude.ts';
import { enforceRules, type AgentAnswer, type TriageLevel } from './safety.ts';
import { SYSTEM_PROMPT } from './system-prompt.generated.ts';

export const CHAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'triage_level'],
  properties: {
    reply: { type: 'string' },
    triage_level: { anyOf: [{ type: 'string', enum: ['urgent', 'soon', 'monitor'] }, { type: 'null' }] },
  },
} as const;

export type PetProfile = {
  name: string;
  species: string;
  breed: string | null;
  sex: string;
  age: string;
  neutered: boolean | null;
  weightKg: number | null;
  alerts: { kind: string; title: string; details: string | null }[];
  medications: { name: string; dosage: string | null; frequency: string | null }[];
};

const SPECIES_HE: Record<string, string> = { dog: 'כלב', cat: 'חתול', rabbit: 'ארנב', bird: 'ציפור', other: 'חיה' };
const SEX_HE: Record<string, string> = { male: 'זכר', female: 'נקבה', unknown: 'מין לא ידוע' };
const ALERT_HE: Record<string, string> = { allergy: 'אלרגיה', chronic: 'מחלה כרונית', anesthesia: 'תגובה להרדמה', behavior: 'התנהגות', other: 'הערה' };

export function petContext(p: PetProfile): string {
  const lines = [
    `שם: ${p.name}`,
    `סוג: ${SPECIES_HE[p.species] ?? p.species}${p.breed ? ` (${p.breed})` : ''}`,
    `מין: ${SEX_HE[p.sex] ?? p.sex}${p.neutered === true ? ', מעוקר/מסורס' : p.neutered === false ? ', לא מעוקר/מסורס' : ''}`,
    `גיל: ${p.age}`,
    `משקל אחרון: ${p.weightKg ? `${p.weightKg} ק"ג` : 'לא ידוע'}`,
    `התראות רפואיות: ${p.alerts.length ? p.alerts.map((a) => `${ALERT_HE[a.kind] ?? a.kind}: ${a.title}${a.details ? ` (${a.details})` : ''}`).join('; ') : 'אין'}`,
    `תרופות קבועות: ${p.medications.length ? p.medications.map((m) => [m.name, m.dosage, m.frequency].filter(Boolean).join(' ')).join('; ') : 'אין'}`,
  ];
  return `## פרופיל החיה שהשיחה עליה\n${lines.join('\n')}\n\nהמידע הוזן על ידי הבעלים או נלקח ממסמכים. אל תחזור עליו כולו בתשובה, רק מה שרלוונטי.`;
}

export type HistoryMessage = { role: 'user' | 'assistant'; content: string };

/** Max previous messages sent as context. */
const HISTORY_LIMIT = 20;

export async function runChat(
  client: Anthropic,
  profile: PetProfile,
  history: HistoryMessage[],
  userText: string,
): Promise<AgentAnswer & { forced: boolean }> {
  const recent = history.slice(-HISTORY_LIMIT);
  // The API requires the first message to be from the user.
  while (recent.length && recent[0].role !== 'user') recent.shift();

  const answer = await callStructured<{ reply: string; triage_level: TriageLevel | null }>(client, {
    system: `${SYSTEM_PROMPT}\n\n${petContext(profile)}`,
    schema: CHAT_SCHEMA as unknown as Record<string, unknown>,
    effort: 'medium',
    maxTokens: 4000,
    messages: [
      ...recent.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userText },
    ],
  });
  return enforceRules(userText, answer);
}
