import { create } from 'zustand';
import { liveGetAll, liveInsert, liveUpdate, onTableSync, onDataChange } from '@/lib/db-live';
import {
  getDaysRemaining,
  getDaysSettled,
  getTotalDaysBought,
  getTotalBuyoutAmount,
  hasCompradoHoliday,
  hasGozadoHoliday,
  hasHolidayScheduled,
  parseBuyoutEntries,
  validateDaysAllocation,
  canBuyHolidayForYear,
  getCurrentHolidayYear,
} from '@/lib/holiday-utils';

export interface HolidayBuyoutEntry {
  id: string;
  days?: number;
  amount: number;
  agreedDate: string;
  note: string;
  registeredAt: string;
  payrollPeriodId?: string;
}

export interface HolidayRecord {
  employeeId: string;
  year: number;
  daysUsed: number;
  startDate?: string;
  endDate?: string;
  holidayMonth?: number;
  subsidyPaidInMonth?: number;
  subsidyPaidInYear?: number;
  notes?: string;
  daysBought?: number;
  buyoutTotalAmount?: number;
  buyoutEntries?: HolidayBuyoutEntry[];
}

export type HolidayStatus =
  | 'pendente'
  | 'registado'
  | 'pago'
  | 'gozado'
  | 'comprado'
  | 'gozado_comprado'
  | 'pago_comprado'
  | 'gozado_pago_comprado'
  | 'registado_comprado'
  | 'registado_pago';

interface HolidayState {
  records: HolidayRecord[];
  isLoaded: boolean;
  loadHolidays: () => Promise<void>;
  addOrUpdateRecord: (record: HolidayRecord) => Promise<{ success: boolean; error?: string }>;
  addBuyout: (
    employeeId: string,
    year: number,
    entry: {
      days?: number;
      amount: number;
      agreedDate: string;
      note: string;
      payrollPeriodId: string;
    },
    daysEntitled: number
  ) => Promise<{ success: boolean; error?: string }>;
  getRecordsForYear: (year: number) => HolidayRecord[];
  getRecordForEmployee: (employeeId: string, year: number) => HolidayRecord | undefined;
  saveRecords: (records: HolidayRecord[]) => Promise<{ success: boolean; errors: string[] }>;
  getEmployeesForSubsidyPayment: (year: number, month: number) => string[];
  markSubsidyPaid: (employeeId: string, year: number, paidInMonth: number, paidInYear: number) => Promise<void>;
  isSubsidyPaid: (employeeId: string, year: number) => boolean;
  hasHolidayRegisteredForYear: (employeeId: string, year: number) => boolean;
  canRegisterHoliday: (employeeId: string, year: number, daysEntitled?: number) => { allowed: boolean; reason?: string };
  autoDetectPaidSubsidies: (
    payrollEntries: { employeeId: string; holidaySubsidy: number; payrollPeriodId: string }[],
    periods: { id: string; year: number; month: number; status: string }[]
  ) => Promise<number>;
  getHolidayStatus: (employeeId: string, year: number) => HolidayStatus;
}

function mapDbRowToHoliday(row: any): HolidayRecord {
  const buyoutEntries = parseBuyoutEntries(row.buyout_entries);
  return {
    employeeId: row.employee_id,
    year: row.year,
    daysUsed: row.days_used || 0,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    holidayMonth: row.start_date ? new Date(row.start_date).getMonth() + 1 : undefined,
    subsidyPaidInMonth: row.subsidy_paid_month || undefined,
    subsidyPaidInYear: row.subsidy_paid_year || undefined,
    notes: row.notes || undefined,
    daysBought: row.days_bought ?? undefined,
    buyoutTotalAmount: row.buyout_total_amount ?? undefined,
    buyoutEntries: buyoutEntries.length > 0 ? buyoutEntries : undefined,
  };
}

function mapHolidayToDbRow(h: HolidayRecord): Record<string, any> {
  const entries = h.buyoutEntries || [];
  const daysBought =
    h.daysBought ??
    entries.reduce((sum, e) => sum + (e.days || 0), 0);
  const buyoutTotal =
    h.buyoutTotalAmount ??
    entries.reduce((sum, e) => sum + (e.amount || 0), 0);

  return {
    id: `${h.employeeId}-${h.year}`,
    employee_id: h.employeeId,
    year: h.year,
    days_used: h.daysUsed,
    start_date: h.startDate || null,
    end_date: h.endDate || null,
    subsidy_paid: h.subsidyPaidInMonth ? 1 : 0,
    subsidy_paid_month: h.subsidyPaidInMonth || null,
    subsidy_paid_year: h.subsidyPaidInYear || null,
    notes: h.notes || null,
    days_bought: daysBought || 0,
    buyout_total_amount: buyoutTotal || 0,
    buyout_entries: entries.length > 0 ? JSON.stringify(entries) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function resolveHolidayStatus(record: HolidayRecord | undefined): HolidayStatus {
  if (!record) return 'pendente';

  const gozado = hasGozadoHoliday(record);
  const comprado = hasCompradoHoliday(record);
  const subsidy = !!record.subsidyPaidInMonth;

  const scheduled = hasHolidayScheduled(record);

  if (gozado && comprado && subsidy) return 'gozado_pago_comprado';
  if (gozado && comprado) return 'gozado_comprado';
  if (comprado && subsidy) return 'pago_comprado';
  if (comprado) return 'comprado';
  if (gozado) return 'gozado';
  if (scheduled && comprado) return 'registado_comprado';
  if (scheduled && subsidy) return 'registado_pago';
  if (subsidy) return 'pago';
  if (scheduled) return 'registado';
  return 'pendente';
}

export const useHolidayStore = create<HolidayState>()((set, get) => ({
  records: [],
  isLoaded: false,

  loadHolidays: async () => {
    try {
      const rows = await liveGetAll<any>('holidays');
      const records = rows.map(mapDbRowToHoliday);
      set({ records, isLoaded: true });
      console.log('[Holidays] Loaded', records.length, 'holiday records from DB');
    } catch (error) {
      console.error('[Holidays] Error loading:', error);
      set({ isLoaded: true });
    }
  },

  addOrUpdateRecord: async (record) => {
    const existingRecord = get().records.find(
      (r) => r.employeeId === record.employeeId && r.year === record.year
    );

    let holidayMonth = record.holidayMonth;
    if (record.startDate && !holidayMonth) {
      holidayMonth = new Date(record.startDate).getMonth() + 1;
    }

    const merged: HolidayRecord = {
      ...(existingRecord || { employeeId: record.employeeId, year: record.year, daysUsed: 0 }),
      ...record,
      holidayMonth,
      subsidyPaidInMonth: record.subsidyPaidInMonth ?? existingRecord?.subsidyPaidInMonth,
      subsidyPaidInYear: record.subsidyPaidInYear ?? existingRecord?.subsidyPaidInYear,
      buyoutEntries: record.buyoutEntries ?? existingRecord?.buyoutEntries,
      daysBought: record.daysBought ?? existingRecord?.daysBought,
      buyoutTotalAmount: record.buyoutTotalAmount ?? existingRecord?.buyoutTotalAmount,
    };

    const daysBought = getTotalDaysBought(merged);
    const entitled = 22;
    const check = validateDaysAllocation(existingRecord, entitled, merged.daysUsed, daysBought);
    if (!check.ok) {
      return { success: false, error: check.message };
    }

    await liveInsert('holidays', mapHolidayToDbRow(merged));
    await get().loadHolidays();
    return { success: true };
  },

  addBuyout: async (employeeId, year, entry, daysEntitled) => {
    if (!canBuyHolidayForYear(year)) {
      return {
        success: false,
        error: `Só pode comprar férias do ano corrente (${getCurrentHolidayYear()}).`,
      };
    }
    if (entry.amount <= 0) {
      return { success: false, error: 'Valor deve ser superior a zero.' };
    }
    if (!entry.note?.trim() || entry.note.trim().length < 3) {
      return { success: false, error: 'Nota do acordo obrigatória (mín. 3 caracteres).' };
    }
    if (!entry.payrollPeriodId?.trim()) {
      return { success: false, error: 'Seleccione o mês da folha onde será pago.' };
    }

    const existing = get().records.find((r) => r.employeeId === employeeId && r.year === year);
    const currentBought = getTotalDaysBought(existing);
    const nextDaysBought = currentBought + (entry.days || 0);
    const daysUsed = existing?.daysUsed || 0;

    const check = validateDaysAllocation(existing, daysEntitled, daysUsed, nextDaysBought);
    if (!check.ok) {
      return { success: false, error: check.message };
    }

    const { usePayrollStore } = await import('./payroll-store');
    const payrollState = usePayrollStore.getState();
    const period = payrollState.periods.find((p) => p.id === entry.payrollPeriodId);
    if (!period) {
      return { success: false, error: 'Período de folha não encontrado.' };
    }
    if (period.year !== getCurrentHolidayYear()) {
      return { success: false, error: 'A folha seleccionada tem de ser do ano corrente.' };
    }
    if (period.status === 'archived') {
      return { success: false, error: 'Período arquivado — escolha outro mês.' };
    }
    if (period.status === 'paid') {
      return { success: false, error: 'Folha já marcada como paga — escolha outro mês ou reabra o período.' };
    }

    const payrollEntry = payrollState.entries.find(
      (e) => e.employeeId === employeeId && e.payrollPeriodId === entry.payrollPeriodId
    );
    if (!payrollEntry) {
      return {
        success: false,
        error: 'Calcule a folha desse mês primeiro (funcionário tem de constar na folha).',
      };
    }

    const newEntry: HolidayBuyoutEntry = {
      id: `buyout-${Date.now()}`,
      days: entry.days,
      amount: entry.amount,
      agreedDate: entry.agreedDate,
      note: entry.note.trim(),
      registeredAt: new Date().toISOString(),
      payrollPeriodId: entry.payrollPeriodId,
    };

    const buyoutEntries = [...(existing?.buyoutEntries || []), newEntry];
    const merged: HolidayRecord = {
      employeeId,
      year,
      daysUsed,
      startDate: existing?.startDate,
      endDate: existing?.endDate,
      holidayMonth: existing?.holidayMonth,
      subsidyPaidInMonth: existing?.subsidyPaidInMonth,
      subsidyPaidInYear: existing?.subsidyPaidInYear,
      notes: existing?.notes,
      buyoutEntries,
      daysBought: nextDaysBought,
      buyoutTotalAmount: buyoutEntries.reduce((s, e) => s + e.amount, 0),
    };

    await liveInsert('holidays', mapHolidayToDbRow(merged));

    const prevBuyout = payrollEntry.holidayBuyoutAmount || 0;
    const prevNote = payrollEntry.holidayBuyoutNote?.trim();
    const buyoutNote = `Compra férias ${year}: ${entry.note.trim()}`;
    await payrollState.updateEntry(payrollEntry.id, {
      holidayBuyoutAmount: prevBuyout + entry.amount,
      holidayBuyoutNote: prevNote ? `${prevNote} | ${buyoutNote}` : buyoutNote,
    });
    await payrollState.loadPayroll();

    await get().loadHolidays();
    return { success: true };
  },

  getRecordsForYear: (year) => get().records.filter((r) => r.year === year),

  getRecordForEmployee: (employeeId, year) =>
    get().records.find((r) => r.employeeId === employeeId && r.year === year),

  saveRecords: async (records) => {
    const errors: string[] = [];

    for (const newRecord of records) {
      const existingRecord = get().records.find(
        (r) => r.employeeId === newRecord.employeeId && r.year === newRecord.year
      );

      let holidayMonth = newRecord.holidayMonth;
      if (newRecord.startDate && !holidayMonth) {
        holidayMonth = new Date(newRecord.startDate).getMonth() + 1;
      }
      const recordWithMonth: HolidayRecord = {
        ...(existingRecord || { employeeId: newRecord.employeeId, year: newRecord.year, daysUsed: 0 }),
        ...newRecord,
        holidayMonth,
        subsidyPaidInMonth: newRecord.subsidyPaidInMonth ?? existingRecord?.subsidyPaidInMonth,
        subsidyPaidInYear: newRecord.subsidyPaidInYear ?? existingRecord?.subsidyPaidInYear,
        buyoutEntries: newRecord.buyoutEntries ?? existingRecord?.buyoutEntries,
        daysBought: newRecord.daysBought ?? existingRecord?.daysBought,
        buyoutTotalAmount: newRecord.buyoutTotalAmount ?? existingRecord?.buyoutTotalAmount,
      };
      await liveInsert('holidays', mapHolidayToDbRow(recordWithMonth));
    }

    await get().loadHolidays();
    return { success: errors.length === 0, errors };
  },

  getEmployeesForSubsidyPayment: (year, month) => {
    const records = get().records;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextMonthYear = month === 12 ? year + 1 : year;
    return records
      .filter((r) => r.holidayMonth === nextMonth && r.year === nextMonthYear && !r.subsidyPaidInMonth)
      .map((r) => r.employeeId);
  },

  markSubsidyPaid: async (employeeId, year, paidInMonth, paidInYear) => {
    const recordId = `${employeeId}-${year}`;
    await liveUpdate('holidays', recordId, {
      subsidy_paid: 1,
      subsidy_paid_month: paidInMonth,
      subsidy_paid_year: paidInYear,
      updated_at: new Date().toISOString(),
    });
    await get().loadHolidays();
  },

  isSubsidyPaid: (employeeId, year) => {
    const record = get().records.find((r) => r.employeeId === employeeId && r.year === year);
    return !!record?.subsidyPaidInMonth;
  },

  hasHolidayRegisteredForYear: (employeeId, year) => {
    const record = get().records.find((r) => r.employeeId === employeeId && r.year === year);
    return !!(record?.startDate || record?.subsidyPaidInMonth || hasCompradoHoliday(record));
  },

  canRegisterHoliday: (employeeId, year, daysEntitled = 22) => {
    const record = get().records.find((r) => r.employeeId === employeeId && r.year === year);
    const remaining = getDaysRemaining(record, daysEntitled);

    if (remaining <= 0 && !record?.startDate) {
      return {
        allowed: false,
        reason: 'Todos os dias deste ano já foram gozados ou comprados.',
      };
    }

    if (record?.subsidyPaidInMonth) {
      return {
        allowed: true,
        reason: `Subsídio já pago (${record.subsidyPaidInMonth}/${record.subsidyPaidInYear})`,
      };
    }

    if (hasCompradoHoliday(record)) {
      return {
        allowed: true,
        reason: `Parcial: ${getDaysSettled(record)}/${daysEntitled} dias — ainda pode gozar ${remaining}`,
      };
    }

    if (record?.startDate) {
      return {
        allowed: true,
        reason: `Férias já registadas: ${new Date(record.startDate).toLocaleDateString('pt-AO')}`,
      };
    }

    return { allowed: true };
  },

  getHolidayStatus: (employeeId, year) => {
    const record = get().records.find((r) => r.employeeId === employeeId && r.year === year);
    return resolveHolidayStatus(record);
  },

  autoDetectPaidSubsidies: async (payrollEntries, periods) => {
    let detected = 0;
    const records = get().records;

    for (const entry of payrollEntries) {
      if (entry.holidaySubsidy <= 0) continue;

      const period = periods.find((p) => p.id === entry.payrollPeriodId);
      if (!period) continue;
      if (period.status !== 'approved' && period.status !== 'paid') continue;

      const subsidyYear = period.year;
      const existing = records.find((r) => r.employeeId === entry.employeeId && r.year === subsidyYear);
      if (existing?.subsidyPaidInMonth) continue;

      await liveInsert(
        'holidays',
        mapHolidayToDbRow({
          employeeId: entry.employeeId,
          year: subsidyYear,
          daysUsed: existing?.daysUsed || 0,
          startDate: existing?.startDate,
          endDate: existing?.endDate,
          holidayMonth: existing?.holidayMonth,
          subsidyPaidInMonth: period.month,
          subsidyPaidInYear: period.year,
          buyoutEntries: existing?.buyoutEntries,
          daysBought: existing?.daysBought,
          buyoutTotalAmount: existing?.buyoutTotalAmount,
          notes: existing?.notes,
        })
      );
      detected++;
    }

    if (detected > 0) {
      await get().loadHolidays();
      console.log(`[Holidays] Auto-detected ${detected} paid subsidies from payroll history`);
    }

    return detected;
  },
}));

let unsubscribe: (() => void) | null = null;

export function initHolidayStoreSync() {
  if (unsubscribe) return;

  const unsubSync = onTableSync('holidays', (table, rows) => {
    console.log('[Holidays] ← PUSH received:', rows.length, 'holidays');
    const records = rows.map(mapDbRowToHoliday);
    useHolidayStore.setState({ records, isLoaded: true });
  });

  const unsubLegacy = onDataChange((table) => {
    if (table === 'holidays') {
      console.log('[Holidays] Legacy notification, refreshing...');
      useHolidayStore.getState().loadHolidays();
    }
  });

  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}

export function cleanupHolidayStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
