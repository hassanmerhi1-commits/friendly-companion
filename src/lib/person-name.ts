/**
 * Company-wide person-name rule: store UPPER CASE (Angola / bank-file friendly).
 * Collapses internal whitespace. Safe across every PC — does not depend on OS locale UI.
 */
export function normalizePersonName(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-PT');
}