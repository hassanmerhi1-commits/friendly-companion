/** Canonical employee job categories (company-defined list). */

export function normalizeCategoryKey(value: string): string {
  return value.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-PT');
}

export function formatCategoryLabel(value: string): string {
  const cleaned = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((w) => {
      if (!w) return w;
      const lower = w.toLocaleLowerCase('pt-PT');
      return lower.charAt(0).toLocaleUpperCase('pt-PT') + lower.slice(1);
    })
    .join(' ');
}

/** Merge case variants into one label per key (prefer Title Case). */
export function dedupeCategories(values: string[]): string[] {
  const map = new Map<string, string>();
  for (const raw of values) {
    const label = formatCategoryLabel(raw);
    if (!label) continue;
    const key = normalizeCategoryKey(label);
    if (!map.has(key)) map.set(key, label);
  }
  return [...map.values()].sort((a, b) => a.localeCompare(b, 'pt'));
}

export function parseCategoriesSetting(raw: string | string[] | undefined | null): string[] {
  if (Array.isArray(raw)) return dedupeCategories(raw);
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return dedupeCategories(parsed.map(String));
  } catch {
    // legacy comma-separated
  }
  return dedupeCategories(trimmed.split(',').map((s) => s.trim()).filter(Boolean));
}

export function serializeCategoriesSetting(categories: string[]): string {
  return JSON.stringify(dedupeCategories(categories));
}

/** If value matches a list entry ignoring case, return that canonical label. */
export function resolveCategoryLabel(value: string | undefined, catalog: string[]): string {
  const label = formatCategoryLabel(value || '');
  if (!label) return '';
  const key = normalizeCategoryKey(label);
  const found = catalog.find((c) => normalizeCategoryKey(c) === key);
  return found || label;
}