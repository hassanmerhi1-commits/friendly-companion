/**
 * Pages with frozen top toolbar + internal table scroll (Folha, Funcionários, Deduções).
 * Uses viewport height so it works regardless of parent scroll container.
 */
export const FIXED_TOOLBAR_PAGE =
  'flex flex-col h-[calc(100dvh-7.5rem)] max-h-[calc(100dvh-7.5rem)] min-h-0 overflow-hidden';

/** Attendance: fill parent flex shell (navbar + tabs); table scrolls inside tab panel only. */
export const ATTENDANCE_PAGE = 'flex flex-col flex-1 min-h-0 h-full w-full overflow-hidden';
