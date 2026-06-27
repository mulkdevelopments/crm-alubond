'use client';

import {
  formatNumberForInput,
  parseFormattedNumber,
  sanitizeFormattedNumberInput,
} from '@/lib/utils';

type FormattedDecimalInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  maxFractionDigits?: number;
};

export function FormattedDecimalInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  className,
  maxFractionDigits = 2,
}: FormattedDecimalInputProps) {
  function handleBlur() {
    const parsed = parseFormattedNumber(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      onChange(formatNumberForInput(parsed, maxFractionDigits));
      return;
    }
    if (!value.trim()) onChange('');
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(event) => onChange(sanitizeFormattedNumberInput(event.target.value))}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
