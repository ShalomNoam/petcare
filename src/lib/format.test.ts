import assert from 'node:assert/strict';
import { test } from 'node:test';

import { daysUntil, formatAge, formatDate, maskDateInput, parseDate, parseTime, relativeDays } from './format.ts';

const NOW = new Date(2026, 10, 23); // 23/11/2026

test('formats and parses dates', () => {
  assert.equal(formatDate('2026-03-07'), '07/03/2026');
  assert.equal(parseDate('7/3/2026'), '2026-03-07');
  assert.equal(parseDate('07.03.26'), '2026-03-07');
  assert.equal(parseDate('31/02/2026'), null);
  assert.equal(parseDate('abc'), null);
  assert.equal(maskDateInput('07032026'), '07/03/2026');
  assert.equal(maskDateInput('070'), '07/0');
});

test('parses times', () => {
  assert.deepEqual(parseTime('09:30'), [9, 30]);
  assert.equal(parseTime('25:00'), null);
});

test('computes age in Hebrew', () => {
  assert.equal(formatAge('2020-01-10', NOW), '6 שנים');
  assert.equal(formatAge('2026-08-01', NOW), '3 חודשים');
  assert.equal(formatAge('2025-05-20', NOW), 'שנה ו-6 חודשים');
  assert.equal(formatAge('2025-09-20', NOW), 'שנה וחודשיים');
  assert.equal(formatAge('2024-08-23', NOW), 'שנתיים ו-3 חודשים');
  assert.equal(formatAge('2026-10-23', NOW), 'חודש');
  assert.equal(formatAge('2026-11-02', NOW), '3 שבועות');
  assert.equal(formatAge('2027-01-01', NOW), null);
  assert.equal(formatAge(null, NOW), null);
});

test('relative days', () => {
  assert.equal(daysUntil('2026-11-28', NOW), 5);
  assert.equal(relativeDays('2026-11-28', NOW), 'בעוד 5 ימים');
  assert.equal(relativeDays('2026-11-23', NOW), 'היום');
  assert.equal(relativeDays('2026-11-24', NOW), 'מחר');
  assert.equal(relativeDays('2026-11-20', NOW), 'לפני 3 ימים');
});
