/**
 * Parses a user-entered amount string, accepting both '.' and ',' as decimal separator.
 * Use this instead of parseFloat() for all values coming from TextInput fields.
 */
export function parseAmount(input: string | undefined | null): number {
  if (!input || typeof input !== 'string') return NaN;
  const normalized = input.trim().replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? NaN : parsed;
}

/** Formats a Date as YYYY-MM-DD in local time (toISOString() would use UTC and can shift the day). */
export function toLocalDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parses YYYY-MM-DD as a local date (new Date('YYYY-MM-DD') would parse it as UTC midnight). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}
