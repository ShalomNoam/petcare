/**
 * Israeli mobile numbers.
 * Accepts "050-123-4567", "0501234567", "+972 50 123 4567", "972501234567".
 * Returns E.164 ("+972501234567") or null when invalid.
 */
export function toE164IL(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (digits.startsWith('00')) digits = digits.slice(2);

  let national: string;
  if (digits.startsWith('972')) national = digits.slice(3);
  else if (digits.startsWith('0')) national = digits.slice(1);
  else national = digits;

  if (national.startsWith('0')) national = national.slice(1); // "+972 050..."

  // Israeli mobile: 5X + 7 digits
  if (!/^5\d{8}$/.test(national)) return null;
  return `+972${national}`;
}

/** "+972501234567" → "050-123-4567" */
export function formatILPhone(e164: string): string {
  const n = e164.replace(/^\+?972/, '0');
  return n.length === 10 ? `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}` : e164;
}

/** Wraps a left-to-right value (phone, ID, chip number) so it renders correctly inside Hebrew text. */
export function ltrIsolate(value: string): string {
  return `\u2066${value}\u2069`;
}

/** Validates an Israeli ID number (ת"ז) including the check digit. Empty is valid (optional field). */
export function isValidIsraeliId(id: string): boolean {
  const s = id.trim();
  if (s === '') return true;
  if (!/^\d{5,9}$/.test(s)) return false;
  const padded = s.padStart(9, '0');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(padded[i]) * ((i % 2) + 1);
    if (d > 9) d -= 9;
    sum += d;
  }
  return sum % 10 === 0;
}
