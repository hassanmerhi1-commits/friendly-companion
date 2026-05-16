/**
 * Pages with frozen top toolbar + internal table scroll (Folha, Funcionários, Deduções).
 * Uses viewport height so it works regardless of parent scroll container.
 */
export const FIXED_TOOLBAR_PAGE =
  'flex flex-col h-[calc(100dvh-7.5rem)] max-h-[calc(100dvh-7.5rem)] min-h-0 overflow-hidden';
