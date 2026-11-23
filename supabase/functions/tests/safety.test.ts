// Safety-net tests (no API calls, free). Run: npm run test:agent
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { containsDosage, detectEmergency, DISCLAIMER, enforceRules } from '../_shared/safety.ts';

describe('detectEmergency', () => {
  const emergencies = [
    'הכלב שלי אכל חפיסה של שוקולד מריר לפני חצי שעה',
    'נראה לי שהיא בלעה כדור אקמול שנפל על הרצפה',
    'החתול נושם עם פה פתוח ולא נושם טוב',
    'קשה לו לנשום והחניכיים כחולות',
    'הכלב התחיל לפרכס ועכשיו לא מגיב',
    'הכלבה נדרסה על ידי אופניים',
    'הבטן שלו נפוחה והוא מנסה להקיא ולא יוצא כלום',
    'החתול מתאמץ לעשות פיפי ולא מצליח לעשות פיפי מאתמול',
    'יש לו שלשול עם דם',
  ];
  for (const text of emergencies) {
    test(`flags: ${text}`, () => assert.ok(detectEmergency(text).length > 0));
  }

  const notEmergencies = [
    'הכלב הקיא פעם אחת הבוקר ועכשיו הוא אוכל ומשחק כרגיל',
    'החתולה מגרדת את האוזן כבר כמה ימים',
    'כמה פעמים ביום להאכיל גור בן 3 חודשים?',
    'נרשמנו לקורס אילוף, יש טיפים?',
    'הוא אוהב לשחק עם קרסול שלי',
  ];
  for (const text of notEmergencies) {
    test(`does not flag: ${text}`, () => assert.deepEqual(detectEmergency(text), []));
  }
});

describe('enforceRules', () => {
  test('forces urgent and replaces a reassuring answer when there is an emergency sign', () => {
    const r = enforceRules('הכלב אכל שוקולד', { reply: 'זה כנראה בסדר, תעקבו.', triage_level: 'monitor' });
    assert.equal(r.triage_level, 'urgent');
    assert.ok(r.forced);
    assert.ok(r.reply.includes('מיון וטרינרי'));
    assert.ok(!r.reply.includes('כנראה בסדר'));
  });

  test('keeps a correct urgent answer from the model', () => {
    const r = enforceRules('הכלב אכל שוקולד', { reply: 'לפנות עכשיו למיון וטרינרי.', triage_level: 'urgent' });
    assert.equal(r.triage_level, 'urgent');
    assert.equal(r.forced, false);
  });

  test('never lowers a level', () => {
    const r = enforceRules('הוא מגרד קצת', { reply: 'כדאי לקבוע תור.', triage_level: 'soon' });
    assert.equal(r.triage_level, 'soon');
  });

  test('removes dosage advice', () => {
    assert.ok(containsDosage('אפשר לתת 250 מ"ג פעמיים ביום'));
    assert.ok(containsDosage('לתת לו אקמול'));
    const r = enforceRules('כמה לתת לו?', { reply: 'תן לו 10mg לק"ג.', triage_level: 'monitor' });
    assert.ok(!containsDosage(r.reply));
    assert.equal(r.triage_level, 'soon');
  });

  test('always adds the disclaimer', () => {
    const r = enforceRules('כמה לטייל עם כלב?', { reply: 'פעמיים-שלוש ביום.', triage_level: null });
    assert.ok(r.reply.includes(DISCLAIMER));
    assert.equal(r.triage_level, null);
  });
});
