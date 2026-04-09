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
