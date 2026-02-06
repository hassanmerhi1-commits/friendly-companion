import { create } from 'zustand';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';

/**
 * Loan/Advance Management Store
 */

export type LoanStatus = 'active' | 'paid' | 'cancelled';

export interface Loan {
  id: string;
  employeeId: string;
  type: 'advance' | 'loan';
  amount: number;
  remainingAmount: number;
  monthlyDeduction: number;
  installments: number;
  paidInstallments: number;
  reason: string;
  approvedBy: string;
  approvedAt: string;
  status: LoanStatus;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  payrollPeriodId?: string;
  paidAt: string;
}

interface LoanState {
  loans: Loan[];
  payments: LoanPayment[];
  isLoaded: boolean;
  
  loadLoans: () => Promise<void>;
  addLoan: (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt' | 'remainingAmount' | 'paidInstallments' | 'status'>) => Promise<{ success: boolean; loan?: Loan; error?: string }>;
  updateLoan: (id: string, data: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  recordPayment: (loanId: string, amount: number, payrollPeriodId?: string) => Promise<void>;
  getActiveLoansByEmployee: (employeeId: string) => Loan[];
  getTotalDeductionForEmployee: (employeeId: string) => number;
  getLoanById: (id: string) => Loan | undefined;
}

function mapDbRowToLoan(row: any): Loan {
  return {
    id: row.id,
    employeeId: row.employee_id,
    type: row.type,
    amount: row.amount,
    remainingAmount: row.remaining_amount,
    monthlyDeduction: row.monthly_deduction,
    installments: row.installments,
    paidInstallments: row.paid_installments,
    reason: row.reason,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLoanToDbRow(loan: Loan): Record<string, any> {
  return {
    id: loan.id,
    employee_id: loan.employeeId,
    type: loan.type,
    amount: loan.amount,
    remaining_amount: loan.remainingAmount,
    monthly_deduction: loan.monthlyDeduction,
    installments: loan.installments,
    paid_installments: loan.paidInstallments,
    reason: loan.reason,
    approved_by: loan.approvedBy,
    approved_at: loan.approvedAt,
    status: loan.status,
    start_date: loan.startDate,
    end_date: loan.endDate,
    created_at: loan.createdAt,
    updated_at: loan.updatedAt,
  };
}

function mapDbRowToPayment(row: any): LoanPayment {
  return {
    id: row.id,
    loanId: row.loan_id,
    amount: row.amount,
    payrollPeriodId: row.payroll_period_id,
    paidAt: row.paid_at,
  };
}

export const useLoanStore = create<LoanState>()((set, get) => ({
  loans: [],
  payments: [],
  isLoaded: false,
  
  loadLoans: async () => {
    try {
      const [loanRows, paymentRows] = await Promise.all([
        liveGetAll<any>('loans'),
        liveGetAll<any>('loan_payments'),
      ]);
      
      const loans = loanRows.map(mapDbRowToLoan);
      const payments = paymentRows.map(mapDbRowToPayment);
      
      set({ loans, payments, isLoaded: true });
      console.log('[Loans] Loaded', loans.length, 'loans and', payments.length, 'payments');
    } catch (error) {
      console.error('[Loans] Error loading:', error);
      set({ isLoaded: true });
    }
  },
  
  addLoan: async (loanData) => {
    const now = new Date().toISOString();
    const loan: Loan = {
      ...loanData,
      id: crypto.randomUUID(),
      remainingAmount: loanData.amount,
      paidInstallments: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    
    const dbRow = mapLoanToDbRow(loan);
    const success = await liveInsert('loans', dbRow);
    
    if (!success) {
      return { success: false, error: 'Erro ao guardar empréstimo' };
    }
    
    set(state => ({
      loans: [...state.loans, loan],
    }));
    
    return { success: true, loan };
  },
  
  updateLoan: async (id, data) => {
    const loan = get().loans.find(l => l.id === id);
    if (!loan) return;
    
    const updated: Loan = {
      ...loan,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    const dbRow = mapLoanToDbRow(updated);
    const { id: _, ...updateData } = dbRow;
    await liveUpdate('loans', id, updateData);
    
    set(state => ({
      loans: state.loans.map(l => l.id === id ? updated : l),
    }));
  },
  
  deleteLoan: async (id) => {
    await liveDelete('loans', id);
    set(state => ({
      loans: state.loans.filter(l => l.id !== id),
      payments: state.payments.filter(p => p.loanId !== id),
    }));
  },
  
  recordPayment: async (loanId, amount, payrollPeriodId) => {
    const loan = get().loans.find(l => l.id === loanId);
    if (!loan) return;
    
    const payment: LoanPayment = {
      id: crypto.randomUUID(),
      loanId,
      amount,
      payrollPeriodId,
      paidAt: new Date().toISOString(),
    };
    
    await liveInsert('loan_payments', {
      id: payment.id,
      loan_id: payment.loanId,
      amount: payment.amount,
      payroll_period_id: payment.payrollPeriodId,
      paid_at: payment.paidAt,
    });
    
    const newRemaining = Math.max(0, loan.remainingAmount - amount);
    const newPaidInstallments = loan.paidInstallments + 1;
    const newStatus: LoanStatus = newRemaining <= 0 ? 'paid' : 'active';
    
    await get().updateLoan(loanId, {
      remainingAmount: newRemaining,
      paidInstallments: newPaidInstallments,
      status: newStatus,
      endDate: newStatus === 'paid' ? new Date().toISOString() : undefined,
    });
    
    set(state => ({
      payments: [...state.payments, payment],
    }));
  },
  
  getActiveLoansByEmployee: (employeeId) => {
    return get().loans.filter(l => l.employeeId === employeeId && l.status === 'active');
  },
  
  getTotalDeductionForEmployee: (employeeId) => {
    return get().getActiveLoansByEmployee(employeeId)
      .reduce((sum, loan) => sum + loan.monthlyDeduction, 0);
  },
  
  getLoanById: (id) => {
    return get().loans.find(l => l.id === id);
  },
}));

// Sync subscription
let unsubscribe: (() => void) | null = null;

export function initLoanStoreSync() {
  if (unsubscribe) return;
  
  const unsubSync = onTableSync('loans', (table, rows) => {
    console.log('[Loans] ← PUSH received:', rows.length, 'loans');
    const loans = rows.map(mapDbRowToLoan);
    useLoanStore.setState(state => ({ ...state, loans, isLoaded: true }));
  });
  
  const unsubLegacy = onDataChange((table) => {
    if (table === 'loans' || table === 'loan_payments') {
      useLoanStore.getState().loadLoans();
    }
  });
  
  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}
