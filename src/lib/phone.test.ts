// Run with: npm test   (Node's built-in test runner, native TypeScript)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatILPhone, isValidIsraeliId, toE164IL } from './phone.ts';

test('normalizes Israeli mobile numbers to E.164', () => {
  for (const input of ['0501234567', '050-123-4567', '+972 50 123 4567', '972501234567', '+972-050-1234567', '00972501234567']) {
    assert.equal(toE164IL(input), '+972501234567', input);
  }
});

test('rejects non-mobile and malformed numbers', () => {
  for (const input of ['', '03-1234567', '050123456', '05012345678', '+1 415 555 1234', 'abc']) {
    assert.equal(toE164IL(input), null, input);
  }
});

test('formats for display', () => {
  assert.equal(formatILPhone('+972501234567'), '050-123-4567');
});

test('validates Israeli ID check digit', () => {
  assert.equal(isValidIsraeliId(''), true);
  assert.equal(isValidIsraeliId('000000018'), true);
  assert.equal(isValidIsraeliId('123456782'), true);
  assert.equal(isValidIsraeliId('123456789'), false);
  assert.equal(isValidIsraeliId('12a'), false);
});
