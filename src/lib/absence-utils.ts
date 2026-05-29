import type { Absence } from '@/types/absence';

/** Leave types shown on dashboard / attendance */
export const DASHBOARD_LEAVE_TYPES = [
  'maternity',
  'paternity',
  'sick_leave',
  'work_accident',
  'marriage',
  'bereavement',
] as const;

/** Leave types stored on payroll recibos (informational, no deduction) */
export const PAYROLL_LEAVE_TYPES = [
  'maternity',
  'paternity',
  'marriage',
  'bereavement',
  'sick_leave',
] as const;

export interface LeaveNotePayload {
  type: string;
  days: number;
  startDate: string;
  endDate: string;
  /** True if still on leave on the reference date (payroll month end or today). */
  active: boolean;
}

/** Parse YYYY-MM-DD in local calendar (avoids UTC timezone shifts). */
export function parseDateOnly(dateStr: string): Date {
  const iso = dateStr.split('T')[0];
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setHours(23, 59, 59, 999);
  return x;
}

export function isAbsenceActiveOnDate(
  absence: Pick<Absence, 'startDate' | 'endDate'>,
  onDate: Date
): boolean {
  const start = startOfDay(parseDateOnly(absence.startDate));
  const end = endOfDay(parseDateOnly(absence.endDate));
  const day = startOfDay(onDate);
  return start <= day && end >= day;
}

export function isAbsenceActiveToday(absence: Pick<Absence, 'startDate' | 'endDate'>): boolean {
  return isAbsenceActiveOnDate(absence, new Date());
}

export function absenceOverlapsRange(
  absence: Pick<Absence, 'startDate' | 'endDate'>,
  rangeStart: string,
  rangeEnd: string
): boolean {
  const start = parseDateOnly(rangeStart);
  const end = parseDateOnly(rangeEnd);
  const absStart = parseDateOnly(absence.startDate);
  const absEnd = parseDateOnly(absence.endDate);
  return absStart <= end && absEnd >= start;
}

export function isPayrollLeaveAbsence(absence: Pick<Absence, 'status' | 'type'>): boolean {
  return (
    (absence.status === 'approved' || absence.status === 'justified') &&
    (PAYROLL_LEAVE_TYPES as readonly string[]).includes(absence.type)
  );
}

export function isDashboardLeaveAbsence(absence: Pick<Absence, 'status' | 'type'>): boolean {
  return (
    (absence.status === 'approved' || absence.status === 'justified') &&
    (DASHBOARD_LEAVE_TYPES as readonly string[]).includes(absence.type)
  );
}

export function getPayrollPeriodEndDate(year: number, month: number): Date {
  return endOfDay(new Date(year, month, 0));
}

export function getMonthDateRange(year: number, month: number): { monthStart: string; monthEnd: string } {
  return {
    monthStart: new Date(year, month - 1, 1).toISOString().split('T')[0],
    monthEnd: new Date(year, month, 0).toISOString().split('T')[0],
  };
}

/** Build payroll leave_notes JSON for one employee and period. */
export function buildPayrollLeaveNotes(
  employeeId: string,
  periodYear: number,
  periodMonth: number,
  absences: Absence[]
): string | undefined {
  const { monthStart, monthEnd } = getMonthDateRange(periodYear, periodMonth);
  const referenceDate = getPayrollPeriodEndDate(periodYear, periodMonth);

  const empLeaves = absences.filter(
    (a) =>
      a.employeeId === employeeId &&
      isPayrollLeaveAbsence(a) &&
      absenceOverlapsRange(a, monthStart, monthEnd)
  );

  if (empLeaves.length === 0) return undefined;

  const payloads: LeaveNotePayload[] = empLeaves.map((l) => ({
    type: l.type,
    days: l.days,
    startDate: l.startDate,
    endDate: l.endDate,
    active: isAbsenceActiveOnDate(l, referenceDate),
  }));

  return JSON.stringify(payloads);
}

export function parseLeaveNotes(json?: string | null): LeaveNotePayload[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as LeaveNotePayload[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((l) => ({
      ...l,
      active: l.active === true,
    }));
  } catch {
    return [];
  }
}

export function leaveNotesAreEqual(a?: string | null, b?: string | null): boolean {
  return (a || '') === (b || '');
}
