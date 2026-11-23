/**
 * Server-side safety net for the vet-chat agent.
 *
 * The model classifies urgency itself (see system-prompt.md). This file adds
 * deterministic rules on top, so a red-flag message is ALWAYS answered as
 * "urgent", even if the model under-classifies it. It never lowers a level.
 *
 * Pure TypeScript with no imports: used by the Edge Function (Deno), by the
 * app's demo mode, and by the Node tests.
 */

export type TriageLevel = 'urgent' | 'soon' | 'monitor';

const RANK: Record<TriageLevel, number> = { monitor: 0, soon: 1, urgent: 2 };

/** Emergency signs. Matching any of these forces "urgent". Keep in sync with system-prompt.md. */
export const EMERGENCY_PATTERNS: { label: string; pattern: RegExp }[] = [
  {
    label: 'הרעלה / בליעת חומר רעיל',
    // An eating verb followed (within a few words) by a toxin, or a toxin word that is dangerous on its own.
    pattern: /(אכל|אכלה|בלע|בלעה|טרף|טרפה|ליקק|ליקקה|לעס|לעסה|שתה|שתתה)[^.?!\n]{0,40}(שוקולד|ענבים|צימוקים|קסיליטול|מסטיק|בצל|שום|רעל|כדור|תרופ|אקמול|נורופן|אדוויל|פרצטמול|חומר ניקוי|אקונומיקה|סוללה|מחט|נוזל קירור)|הרעל|רעל עכברים|רעל חולדות|קסיליטול|נמלת התהלוכה|אנטיפריז|נוזל קירור/,
  },
  { label: 'קושי בנשימה', pattern: /לא נוש[םמ]|קשה לו לנשום|קשה לה לנשום|קושי (ב)?נשימה|נשימה (כבדה|מהירה|מאומצת)|מתנש[םפ]|נחנק|נחנקת|חנק|לשון כחולה|חניכיים כחולות|כחלון/ },
  { label: 'פרכוסים או איבוד הכרה', pattern: /פרכוס|פירכוס|מפרכס|מתפרכס|התקף|איבד(ה)? הכרה|התעלף|התעלפה|לא מגיב|לא מגיבה|מחוסר הכרה|(?<![\u0590-\u05FF])(קורס|קורסת|קרס|קרסה)(?![\u0590-\u05FF])/ },
  { label: 'דימום חמור או טראומה', pattern: /דימום (חזק|כבד|שלא נעצר)|מדמם הרבה|מדממת הרבה|נדרס|נדרסה|דרסו|נפל(ה)? מגובה|נפל(ה)? מקומה|פגיעת רכב|נשיכה עמוקה|שבר פתוח/ },
  { label: 'בטן נפוחה עם ניסיונות הקאה', pattern: /בטן (נפוחה|תפוחה|קשה)|ניסיונות הקאה בלי|מנסה להקיא ולא|מתנפח|פיתול קיבה/ },
  { label: 'חסימת שתן', pattern: /לא (מצליח|מצליחה) לעשות פיפי|לא משתין|לא משתינה|מתאמץ (לעשות )?פיפי|חסימת שתן|דם בשתן ולא/ },
  { label: 'מכת חום', pattern: /מכת חום|נשאר(ה)? ברכב|התחמם(ה)? מאוד|חום גבוה מאוד/ },
  { label: 'הקאה או שלשול עם דם', pattern: /הקאה עם דם|מקיא דם|מקיאה דם|שלשול עם דם|צואה שחורה|דם בהקאה/ },
  { label: 'המלטה בקושי', pattern: /המלטה.*(תקוע|קושי|יותר משעה)|לידה.*(תקוע|קושי)/ },
  { label: 'כאב חריף', pattern: /צורח מכאב|צורחת מכאב|כאב (חזק|חריף) מאוד|לא (יכול|יכולה) לעמוד|משותק|משותקת|גוררת? רגליים/ },
];

/** Returns the emergency signs found in a message (empty when none). */
export function detectEmergency(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ');
  return EMERGENCY_PATTERNS.filter(({ pattern }) => pattern.test(normalized)).map(({ label }) => label);
}

/** The higher of two levels; null means "not a symptom question". */
export function maxLevel(a: TriageLevel | null, b: TriageLevel | null): TriageLevel | null {
  if (!a) return b;
  if (!b) return a;
  return RANK[a] >= RANK[b] ? a : b;
}

/** Dosage / prescription language the agent must never produce. */
const DOSAGE_PATTERN = /\d+(\.\d+)?\s?(מ"ג|מ״ג|מג|mg|מ"ל|מ״ל|מל|ml|קפסולות|כדורים|טיפות)(?![\u0590-\u05FFa-z])|(מ"ג|מ״ג|mg)\s?לק"ג|לתת לו (אקמול|נורופן|אספירין|אדוויל|פרצטמול|איבופרופן)|לתת לה (אקמול|נורופן|אספירין|אדוויל|פרצטמול|איבופרופן)/i;

export function containsDosage(text: string): boolean {
  return DOSAGE_PATTERN.test(text);
}

export const DISCLAIMER = 'אני עוזר דיגיטלי ולא תחליף לווטרינר.';

export const URGENT_FALLBACK =
  'זה נשמע כמו מצב חירום. פנו עכשיו למיון וטרינרי או לווטרינר תורן. אל תחכו לראות אם זה עובר, ואל תתנו תרופות או טיפול ביתי בלי הנחיה של וטרינר. אם אפשר, התקשרו בדרך כדי שיתכוננו להגעתכם.';

export type AgentAnswer = { reply: string; triage_level: TriageLevel | null };

/**
 * Applies the hard rules to a model answer:
 *  1. Emergency signs in the user's message → level is forced to "urgent",
 *     and the reply is replaced by the fixed referral text if the model did not
 *     already classify it as urgent (no reassurance, no further questions).
 *  2. A reply containing dosages is replaced (no medication advice).
 *  3. The disclaimer is always present.
 */
export function enforceRules(userText: string, answer: AgentAnswer): AgentAnswer & { forced: boolean } {
  const emergencies = detectEmergency(userText);
  let { reply, triage_level } = answer;
  let forced = false;

  if (emergencies.length > 0 && triage_level !== 'urgent') {
    triage_level = 'urgent';
    reply = URGENT_FALLBACK;
    forced = true;
  }

  if (containsDosage(reply)) {
    reply =
      'אני לא יכול להמליץ על תרופות או מינונים. רק וטרינר שבדק את החיה יכול לקבוע טיפול תרופתי. ' +
      (triage_level === 'urgent' ? URGENT_FALLBACK : 'כדאי לשאול את הווטרינר המטפל.');
    triage_level = maxLevel(triage_level, 'soon');
    forced = true;
  }

  if (!reply.includes('תחליף לווטרינר')) {
    reply = `${reply.trim()}\n\n${DISCLAIMER}`;
  }

  return { reply, triage_level, forced };
}
