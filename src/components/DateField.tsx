import { useState } from 'react';

import { formatDate, maskDateInput, parseDate } from '@/lib/format';

import { TextField } from './TextField';

type Props = {
  label: string;
  /** ISO "YYYY-MM-DD" or null */
  value: string | null;
  onChange: (iso: string | null) => void;
  optional?: boolean;
  hint?: string;
  error?: string | null;
};

/** Date input typed as DD/MM/YYYY (slashes inserted automatically). */
export function DateField({ label, value, onChange, optional, hint, error }: Props) {
  const [text, setText] = useState(formatDate(value));
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastValue, setLastValue] = useState(value);

  // Keep in sync when the value is set from outside (e.g. loaded record).
  if (value !== lastValue) {
    setLastValue(value);
    if (parseDate(text) !== value) setText(formatDate(value));
  }

  return (
    <TextField
      label={label}
      optional={optional}
      hint={hint ?? 'יום/חודש/שנה'}
      placeholder="DD/MM/YYYY"
      keyboardType="number-pad"
      ltr
      value={text}
      maxLength={10}
      onChangeText={(raw) => {
        const masked = maskDateInput(raw);
        setText(masked);
        if (masked === '') {
          setLocalError(null);
          onChange(null);
          return;
        }
        const iso = parseDate(masked);
        if (iso) {
          setLocalError(null);
          onChange(iso);
        } else if (masked.length === 10) {
          setLocalError('תאריך לא תקין');
        }
      }}
      onBlur={() => {
        if (text && !parseDate(text)) setLocalError('תאריך לא תקין');
      }}
      error={error ?? localError}
    />
  );
}
