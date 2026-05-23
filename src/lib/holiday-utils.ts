import type { Employee } from '@/types/employee';
import type { HolidayBuyoutEntry, HolidayRecord } from '@/stores/holiday-store';

export const DEFAULT_ANNUAL_LEAVE_DAYS = 22;

export function getCurrentHolidayYear(): number {
  return new Date().getFullYear();
}

/** Compra de férias só no ano civil corrente */
export function canBuyHolidayForYear(year: number): boolean {
  return year === getCurrentHolidayYear();
}

export function parseBuyoutEntries(raw: unknown): HolidayBuyoutEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as HolidayBuyoutEntry[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getTotalDaysBought(record?: HolidayRecord | null): number {
  if (!record) return 0;
  if (record.daysBought != null && record.daysBought > 0) return record.daysBought;
  return (record.buyoutEntries || []).reduce((sum, e) => sum + (e.days || 0), 0);
}

export function getTotalBuyoutAmount(record?: HolidayRecord | null): number {
  if (!record) return 0;
  if (record.buyoutTotalAmount != null && record.buyoutTotalAmount > 0) {
    return record.buyoutTotalAmount;
  }
  return (record.buyoutEntries || []).reduce((sum, e) => sum + (e.amount || 0), 0);
}

export function getDaysSettled(record?: HolidayRecord | null): number {
  return (record?.daysUsed || 0) + getTotalDaysBought(record);
}

export function getDaysRemaining(record: HolidayRecord | undefined | null, daysEntitled: number): number {
  return Math.max(0, daysEntitled - getDaysSettled(record));
}

/** Gozou férias: só quando há dias gozados registados (não basta ter datas no mapa) */
export function hasGozadoHoliday(record?: HolidayRecord | null): boolean {
  if (!record) return false;
  return (record.daysUsed || 0) > 0;
}

/** Férias programadas no mapa/guia mas ainda sem dias gozados */
export function hasHolidayScheduled(record?: HolidayRecord | null): boolean {
  if (!record || hasGozadoHoliday(record)) return false;
  return !!(record.startDate && record.endDate);
}

export function hasCompradoHoliday(record?: HolidayRecord | null): boolean {
  return getTotalBuyoutAmount(record) > 0 || (record?.buyoutEntries?.length || 0) > 0;
}

export type HolidayBadge = 'pendente' | 'registado' | 'gozado' | 'comprado' | 'subsídio_pago';

export function getHolidayBadges(
  record: HolidayRecord | undefined | null,
  subsidyPaid: boolean
): HolidayBadge[] {
  const badges: HolidayBadge[] = [];
  if (hasGozadoHoliday(record)) badges.push('gozado');
  if (hasCompradoHoliday(record)) badges.push('comprado');
  if (subsidyPaid) badges.push('subsídio_pago');
  if (hasHolidayScheduled(record)) badges.push('registado');
  if (badges.length === 0) badges.push('pendente');
  return badges;
}

/**
 * Entitlement for mapa de férias (aligned with PrintableHolidayMap / Lei 12/23 practice).
 */
export function calculateHolidayEntitlement(emp: Employee, selectedYear: number): {
  daysEntitled: number;
  isFirstYear: boolean;
  yearsWorked: number;
  monthsWorked: number;
} {
  const hireDate = new Date(emp.hireDate);
  const referenceDate = new Date(selectedYear, 0, 1);

  let yearsWorked = 0;
  let monthsWorked = 0;
  let isFirstYear = false;
  let daysEntitled = 0;

  const wasHiredBeforeYear = hireDate < referenceDate;

  if (wasHiredBeforeYear) {
    const hireYear = hireDate.getFullYear();
    if (hireYear < selectedYear - 1) {
      daysEntitled = DEFAULT_ANNUAL_LEAVE_DAYS;
      yearsWorked = selectedYear - hireYear;
    } else {
      isFirstYear = true;
      const monthsInPreviousYear = 12 - hireDate.getMonth();
      daysEntitled = Math.min(DEFAULT_ANNUAL_LEAVE_DAYS, Math.max(6, monthsInPreviousYear * 2));
      monthsWorked = monthsInPreviousYear;
    }
  } else {
    isFirstYear = true;
    const vestingDate = new Date(selectedYear, 6, 1);
    const today = new Date();
    if (today >= vestingDate && hireDate < vestingDate) {
      const monthsWorkedFirstHalf = Math.max(0, 6 - hireDate.getMonth());
      daysEntitled = Math.min(DEFAULT_ANNUAL_LEAVE_DAYS, Math.max(6, monthsWorkedFirstHalf * 2));
      monthsWorked = monthsWorkedFirstHalf;
    }
  }

  return { daysEntitled, isFirstYear, yearsWorked, monthsWorked };
}

export function validateDaysAllocation(
  record: HolidayRecord | undefined | null,
  daysEntitled: number,
  nextDaysUsed: number,
  nextDaysBought: number
): { ok: boolean; message?: string } {
  const settled = nextDaysUsed + nextDaysBought;
  if (settled > daysEntitled) {
    return {
      ok: false,
      message: `Total gozado + comprado (${settled}) excede o direito (${daysEntitled} dias).`,
    };
  }
  return { ok: true };
}
