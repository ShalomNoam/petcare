/** Date and age helpers. Dates in the DB are ISO "YYYY-MM-DD"; the UI shows "DD/MM/YYYY". */

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "2026-03-07" → "07/03/2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** "7/3/2026", "07.03.26", "07/03/2026" → "2026-03-07"; null when invalid. */
export function parseDate(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += year > 50 ? 1900 : 2000;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return toIsoDate(d);
}

/** Auto-inserts slashes while typing a date: "0703" → "07/03". */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "HH:MM" validation → [h, m] or null */
export function parseTime(input: string): [number, number] | null {
  const m = input.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? [h, min] : null;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Age in Hebrew: "6 שנים", "שנה ו-3 חודשים", "5 חודשים", "3 שבועות". */
export function formatAge(birthIso: string | null, now = new Date()): string | null {
  if (!birthIso) return null;
  const birth = new Date(`${birthIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth > now) return null;

  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months -= 1;
  const years = Math.floor(months / 12);
  const rem = months % 12;

  if (years === 0 && months === 0) {
    const weeks = Math.floor((now.getTime() - birth.getTime()) / (7 * 86400000));
    return weeks <= 1 ? 'שבוע' : `${weeks} שבועות`;
  }
  const y = years === 1 ? 'שנה' : years === 2 ? 'שנתיים' : `${years} שנים`;
  const mo = rem === 1 ? 'חודש' : rem === 2 ? 'חודשיים' : `${rem} חודשים`;
  if (years === 0) return mo;
  if (rem === 0 || years >= 3) return y;
  return `${y} ו${/^\d/.test(mo) ? '-' : ''}${mo}`;
}

/** Whole days from today to the given date (negative = past). */
export function daysUntil(iso: string, now = new Date()): number {
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

/** "היום", "מחר", "בעוד 5 ימים", "לפני 3 ימים" */
export function relativeDays(iso: string, now = new Date()): string {
  const n = daysUntil(iso, now);
  if (n === 0) return 'היום';
  if (n === 1) return 'מחר';
  if (n === -1) return 'אתמול';
  if (n > 1) return n === 2 ? 'בעוד יומיים' : `בעוד ${n} ימים`;
  return n === -2 ? 'לפני יומיים' : `לפני ${-n} ימים`;
}

export function formatKg(kg: number): string {
  return `${Number(kg).toLocaleString('he-IL', { maximumFractionDigits: 2 })} ק"ג`;
}
