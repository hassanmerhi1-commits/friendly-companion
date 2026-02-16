import { create } from 'zustand';
import { liveGetAll, liveInsert, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';

export interface OvertimePaymentEntry {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  hourlyRate: number;
  hoursWorked: number;
  overtimeType: 'normal' | 'night' | 'holiday';
  rate: number; // multiplier (1.5, 1.75, 2.0)
  amount: number;
}

export interface OvertimePayment {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  branchId: string;
  branchName: string;
  entries: OvertimePaymentEntry[];
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

interface OvertimePaymentStore {
  payments: OvertimePayment[];
  isLoaded: boolean;
  loadPayments: () => Promise<void>;
  addPayment: (payment: Omit<OvertimePayment, 'id' | 'createdAt'>) => Promise<OvertimePayment>;
  deletePayment: (id: string) => Promise<void>;
  getPaymentsByDate: (date: string) => OvertimePayment[];
  getPaymentsByBranch: (branchId: string) => OvertimePayment[];
  getPaymentsByEmployee: (employeeId: string) => OvertimePayment[];
  getPaymentsByPeriod: (startDate: string, endDate: string) => OvertimePayment[];
}

function mapDbRowToPayment(row: any): OvertimePayment {
  return {
    id: row.id,
    date: row.date,
    branchId: row.branch_id || '',
    branchName: row.branch_name || '',
    entries: row.entries ? JSON.parse(row.entries) : [],
    totalAmount: row.total_amount || 0,
    notes: row.notes || undefined,
    createdAt: row.created_at || '',
  };
}

function mapPaymentToDbRow(p: OvertimePayment): Record<string, any> {
  return {
    id: p.id,
    date: p.date,
    branch_id: p.branchId,
    branch_name: p.branchName,
    entries: JSON.stringify(p.entries),
    total_amount: p.totalAmount,
    notes: p.notes || null,
    created_at: p.createdAt,
  };
}

export const useOvertimePaymentStore = create<OvertimePaymentStore>()((set, get) => ({
  payments: [],
  isLoaded: false,

  loadPayments: async () => {
    try {
      const rows = await liveGetAll<any>('overtime_payments');
      const payments = rows.map(mapDbRowToPayment);
      set({ payments, isLoaded: true });
      console.log('[OvertimePayments] Loaded', payments.length, 'records');
    } catch (error) {
      console.error('[OvertimePayments] Error loading:', error);
      set({ isLoaded: true });
    }
  },

  addPayment: async (data) => {
    const now = new Date().toISOString();
    const payment: OvertimePayment = {
      ...data,
      id: `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
    };

    await liveInsert('overtime_payments', mapPaymentToDbRow(payment));
    return payment;
  },

  deletePayment: async (id) => {
    await liveDelete('overtime_payments', id);
  },

  getPaymentsByDate: (date) =>
    get().payments.filter(p => p.date === date),

  getPaymentsByBranch: (branchId) =>
    get().payments.filter(p => p.branchId === branchId),

  getPaymentsByEmployee: (employeeId) =>
    get().payments.filter(p => p.entries.some(e => e.employeeId === employeeId)),

  getPaymentsByPeriod: (startDate, endDate) =>
    get().payments.filter(p => p.date >= startDate && p.date <= endDate),
}));

// Sync
let unsubscribe: (() => void) | null = null;

export function initOvertimePaymentSync() {
  if (unsubscribe) return;

  const unsubSync = onTableSync('overtime_payments', (_, rows) => {
    const payments = rows.map(mapDbRowToPayment);
    useOvertimePaymentStore.setState({ payments, isLoaded: true });
  });

  const unsubLegacy = onDataChange((table) => {
    if (table === 'overtime_payments') {
      useOvertimePaymentStore.getState().loadPayments();
    }
  });

  unsubscribe = () => { unsubSync(); unsubLegacy(); };
}

export function cleanupOvertimePaymentSync() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}
