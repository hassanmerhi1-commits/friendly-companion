import { create } from 'zustand';
import { liveGetAll, liveInsert, liveUpdate, liveDelete, onTableSync, onDataChange } from '@/lib/db-live';
import { logAudit } from '@/lib/audit-helper';
import { useAuthStore } from '@/stores/auth-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { useDeductionStore } from '@/stores/deduction-store';
import { useLoanStore } from '@/stores/loan-store';
import type { AdvanceRequest, AdvanceRequestFormData, AdvanceRequestStatus } from '@/types/advance-request';

interface AdvanceRequestState {
  requests: AdvanceRequest[];
  isLoaded: boolean;
  loadRequests: () => Promise<void>;
  createRequest: (data: AdvanceRequestFormData) => Promise<{ success: boolean; request?: AdvanceRequest; error?: string }>;
  updateRequest: (
    id: string,
    patch: Partial<
      Pick<
        AdvanceRequest,
        | 'requestedAmount'
        | 'reason'
        | 'installments'
        | 'monthlyAmount'
        | 'deductFromPeriodId'
        | 'requestDate'
        | 'employeeId'
      >
    >
  ) => Promise<{ success: boolean; error?: string }>;
  approveRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
  rejectRequest: (id: string, rejectionReason: string) => Promise<{ success: boolean; error?: string }>;
  deleteRequest: (id: string) => Promise<{ success: boolean; error?: string }>;
  getRequestsForEmployee: (employeeId: string) => AdvanceRequest[];
}

function mapDbRow(row: any): AdvanceRequest {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name || '',
    employeeNumber: row.employee_number || '',
    branchId: row.branch_id || '',
    branchName: row.branch_name || '',
    position: row.position || '',
    hireDate: row.hire_date || '',
    baseSalary: Number(row.base_salary) || 0,
    mealAllowance: Number(row.meal_allowance) || 0,
    transportAllowance: Number(row.transport_allowance) || 0,
    amountOwed: Number(row.amount_owed) || 0,
    requestedAmount: Number(row.requested_amount) || 0,
    reason: row.reason || '',
    installments: Math.max(1, Number(row.installments) || 1),
    monthlyAmount: Number(row.monthly_amount) || 0,
    deductFromPeriodId: row.deduct_from_period_id || undefined,
    status: (row.status as AdvanceRequestStatus) || 'pending',
    requestedByUserId: row.requested_by_user_id || undefined,
    requestedByName: row.requested_by_name || undefined,
    reviewedByUserId: row.reviewed_by_user_id || undefined,
    reviewedByName: row.reviewed_by_name || undefined,
    reviewedAt: row.reviewed_at || undefined,
    rejectionReason: row.rejection_reason || undefined,
    deductionId: row.deduction_id || undefined,
    requestDate: row.request_date || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

function mapToDbRow(req: AdvanceRequest): Record<string, unknown> {
  return {
    id: req.id,
    employee_id: req.employeeId,
    employee_name: req.employeeName,
    employee_number: req.employeeNumber,
    branch_id: req.branchId || null,
    branch_name: req.branchName || null,
    position: req.position || null,
    hire_date: req.hireDate || null,
    base_salary: req.baseSalary,
    meal_allowance: req.mealAllowance,
    transport_allowance: req.transportAllowance,
    amount_owed: req.amountOwed,
    requested_amount: req.requestedAmount,
    reason: req.reason,
    installments: req.installments,
    monthly_amount: req.monthlyAmount,
    deduct_from_period_id: req.deductFromPeriodId || null,
    status: req.status,
    requested_by_user_id: req.requestedByUserId || null,
    requested_by_name: req.requestedByName || null,
    reviewed_by_user_id: req.reviewedByUserId || null,
    reviewed_by_name: req.reviewedByName || null,
    reviewed_at: req.reviewedAt || null,
    rejection_reason: req.rejectionReason || null,
    deduction_id: req.deductionId || null,
    request_date: req.requestDate,
    created_at: req.createdAt,
    updated_at: req.updatedAt,
  };
}

/** Open debt: all unpaid deductions + active loans for this employee. */
export function computeEmployeeAmountOwed(employeeId: string): number {
  const deductions = useDeductionStore.getState().deductions.filter(
    (d) => d.employeeId === employeeId && !d.isFullyPaid
  );
  const loans = useLoanStore
    .getState()
    .loans.filter((l) => l.employeeId === employeeId && l.status === 'active');
  const dedSum = deductions.reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0);
  const loanSum = loans.reduce((s, l) => s + (Number(l.remainingAmount) || 0), 0);
  return Math.round((dedSum + loanSum) * 100) / 100;
}

function buildEmployeeSnapshot(employeeId: string) {
  const emp = useEmployeeStore.getState().employees.find((e) => e.id === employeeId);
  if (!emp) return null;
  const branch = useBranchStore.getState().branches.find((b) => b.id === emp.branchId);
  return {
    employeeName: `${emp.firstName} ${emp.lastName}`.trim(),
    employeeNumber: emp.employeeNumber || '',
    branchId: emp.branchId || '',
    branchName: branch?.name || '',
    position: emp.position || emp.category || '',
    hireDate: emp.hireDate || '',
    baseSalary: Number(emp.baseSalary) || 0,
    mealAllowance: Number(emp.mealAllowance) || 0,
    transportAllowance: Number(emp.transportAllowance) || 0,
    amountOwed: computeEmployeeAmountOwed(employeeId),
  };
}

export const useAdvanceRequestStore = create<AdvanceRequestState>()((set, get) => ({
  requests: [],
  isLoaded: false,

  loadRequests: async () => {
    try {
      const rows = await liveGetAll<any>('advance_requests');
      set({ requests: rows.map(mapDbRow), isLoaded: true });
      console.log('[AdvanceRequest] Loaded', rows.length, 'requests');
    } catch (error) {
      console.error('[AdvanceRequest] Error loading:', error);
      set({ isLoaded: true });
    }
  },

  createRequest: async (data) => {
    if (!data.employeeId) return { success: false, error: 'Funcionário obrigatório' };
    if (!data.reason?.trim()) return { success: false, error: 'Motivo obrigatório' };
    const amount = Number(data.requestedAmount) || 0;
    if (amount <= 0) return { success: false, error: 'Valor deve ser maior que zero' };

    const snap = buildEmployeeSnapshot(data.employeeId);
    if (!snap) return { success: false, error: 'Funcionário não encontrado' };

    const installments = Math.max(1, Number(data.installments) || 1);
    const monthlyAmount =
      data.monthlyAmount && data.monthlyAmount > 0
        ? data.monthlyAmount
        : Math.ceil((amount / installments) * 100) / 100;

    const user = useAuthStore.getState().currentUser;
    const now = new Date().toISOString();
    const request: AdvanceRequest = {
      id: crypto.randomUUID(),
      employeeId: data.employeeId,
      ...snap,
      requestedAmount: amount,
      reason: data.reason.trim(),
      installments,
      monthlyAmount,
      deductFromPeriodId: data.deductFromPeriodId || undefined,
      status: 'pending',
      requestedByUserId: user?.id,
      requestedByName: user?.fullName || user?.username,
      requestDate: data.requestDate || now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };

    const ok = await liveInsert('advance_requests', mapToDbRow(request));
    if (!ok) return { success: false, error: 'Erro ao guardar pedido' };

    await get().loadRequests();
    logAudit({
      action: 'advance_request_created',
      entityType: 'advance_request',
      entityId: request.id,
      employeeId: request.employeeId,
      description: `Pedido de adiantamento: ${request.employeeName} — ${amount} AOA`,
      newValue: {
        requestedAmount: amount,
        reason: request.reason,
        amountOwed: request.amountOwed,
      },
    });
    return { success: true, request };
  },

  updateRequest: async (id, patch) => {
    const current = get().requests.find((r) => r.id === id);
    if (!current) return { success: false, error: 'Pedido não encontrado' };
    if (current.status !== 'pending') {
      return { success: false, error: 'Só pedidos pendentes podem ser editados' };
    }

    let next: AdvanceRequest = { ...current, updatedAt: new Date().toISOString() };

    if (patch.employeeId && patch.employeeId !== current.employeeId) {
      const snap = buildEmployeeSnapshot(patch.employeeId);
      if (!snap) return { success: false, error: 'Funcionário não encontrado' };
      next = { ...next, employeeId: patch.employeeId, ...snap };
    }

    if (patch.requestedAmount !== undefined) {
      const amount = Number(patch.requestedAmount) || 0;
      if (amount <= 0) return { success: false, error: 'Valor deve ser maior que zero' };
      next.requestedAmount = amount;
    }
    if (patch.reason !== undefined) {
      if (!String(patch.reason).trim()) return { success: false, error: 'Motivo obrigatório' };
      next.reason = String(patch.reason).trim();
    }
    if (patch.installments !== undefined) {
      next.installments = Math.max(1, Number(patch.installments) || 1);
    }
    if (patch.monthlyAmount !== undefined && Number(patch.monthlyAmount) > 0) {
      next.monthlyAmount = Number(patch.monthlyAmount);
    } else if (patch.requestedAmount !== undefined || patch.installments !== undefined) {
      next.monthlyAmount = Math.ceil((next.requestedAmount / next.installments) * 100) / 100;
    }
    if (patch.deductFromPeriodId !== undefined) {
      next.deductFromPeriodId = patch.deductFromPeriodId || undefined;
    }
    if (patch.requestDate !== undefined) {
      next.requestDate = patch.requestDate;
    }

    // Refresh owed snapshot on edit
    next.amountOwed = computeEmployeeAmountOwed(next.employeeId);

    const { id: _id, ...dbFields } = mapToDbRow(next) as any;
    const ok = await liveUpdate('advance_requests', id, dbFields);
    if (!ok) return { success: false, error: 'Erro ao actualizar pedido' };

    await get().loadRequests();
    logAudit({
      action: 'advance_request_updated',
      entityType: 'advance_request',
      entityId: id,
      employeeId: next.employeeId,
      description: `Pedido de adiantamento actualizado: ${next.employeeName}`,
      previousValue: {
        requestedAmount: current.requestedAmount,
        reason: current.reason,
        installments: current.installments,
      },
      newValue: {
        requestedAmount: next.requestedAmount,
        reason: next.reason,
        installments: next.installments,
      },
    });
    return { success: true };
  },

  approveRequest: async (id) => {
    const current = get().requests.find((r) => r.id === id);
    if (!current) return { success: false, error: 'Pedido não encontrado' };
    if (current.status !== 'pending') {
      return { success: false, error: 'Pedido já foi processado' };
    }
    if (current.requestedAmount <= 0) {
      return { success: false, error: 'Valor inválido' };
    }

    const user = useAuthStore.getState().currentUser;
    const now = new Date().toISOString();

    // Option A: create salary_advance deduction immediately
    const deduction = await useDeductionStore.getState().addDeduction({
      employeeId: current.employeeId,
      type: 'salary_advance',
      description: `Adiantamento aprovado: ${current.reason}`.slice(0, 500),
      totalAmount: current.requestedAmount,
      monthlyAmount: current.monthlyAmount || current.requestedAmount,
      date: current.requestDate || now.slice(0, 10),
      installments: current.installments,
      deductFromPeriodId: current.deductFromPeriodId,
      schedulingMode: 'parallel',
    });

    const updated: AdvanceRequest = {
      ...current,
      status: 'approved',
      reviewedByUserId: user?.id,
      reviewedByName: user?.fullName || user?.username,
      reviewedAt: now,
      deductionId: deduction.id,
      rejectionReason: undefined,
      updatedAt: now,
    };

    const { id: _id, ...dbFields } = mapToDbRow(updated) as any;
    const ok = await liveUpdate('advance_requests', id, dbFields);
    if (!ok) return { success: false, error: 'Erro ao aprovar pedido' };

    await get().loadRequests();
    logAudit({
      action: 'advance_request_approved',
      entityType: 'advance_request',
      entityId: id,
      employeeId: current.employeeId,
      description: `Adiantamento aprovado: ${current.employeeName} — ${current.requestedAmount} AOA`,
      previousValue: { status: 'pending' },
      newValue: {
        status: 'approved',
        deductionId: deduction.id,
        requestedAmount: current.requestedAmount,
      },
    });
    return { success: true };
  },

  rejectRequest: async (id, rejectionReason) => {
    const current = get().requests.find((r) => r.id === id);
    if (!current) return { success: false, error: 'Pedido não encontrado' };
    if (current.status !== 'pending') {
      return { success: false, error: 'Pedido já foi processado' };
    }
    const reason = String(rejectionReason || '').trim();
    if (!reason) return { success: false, error: 'Indique o motivo da rejeição' };

    const user = useAuthStore.getState().currentUser;
    const now = new Date().toISOString();
    const updated: AdvanceRequest = {
      ...current,
      status: 'rejected',
      reviewedByUserId: user?.id,
      reviewedByName: user?.fullName || user?.username,
      reviewedAt: now,
      rejectionReason: reason,
      updatedAt: now,
    };

    const { id: _id, ...dbFields } = mapToDbRow(updated) as any;
    const ok = await liveUpdate('advance_requests', id, dbFields);
    if (!ok) return { success: false, error: 'Erro ao rejeitar pedido' };

    await get().loadRequests();
    logAudit({
      action: 'advance_request_rejected',
      entityType: 'advance_request',
      entityId: id,
      employeeId: current.employeeId,
      description: `Adiantamento rejeitado: ${current.employeeName} — ${reason}`,
      previousValue: { status: 'pending' },
      newValue: { status: 'rejected', rejectionReason: reason },
    });
    return { success: true };
  },

  deleteRequest: async (id) => {
    const current = get().requests.find((r) => r.id === id);
    if (!current) return { success: false, error: 'Pedido não encontrado' };
    if (current.status === 'approved') {
      return { success: false, error: 'Não pode eliminar um pedido já aprovado' };
    }
    const ok = await liveDelete('advance_requests', id);
    if (!ok) return { success: false, error: 'Erro ao eliminar' };
    await get().loadRequests();
    logAudit({
      action: 'advance_request_deleted',
      entityType: 'advance_request',
      entityId: id,
      employeeId: current.employeeId,
      description: `Pedido de adiantamento eliminado: ${current.employeeName}`,
      previousValue: { status: current.status, requestedAmount: current.requestedAmount },
    });
    return { success: true };
  },

  getRequestsForEmployee: (employeeId) =>
    get().requests.filter((r) => r.employeeId === employeeId),
}));

let unsubscribe: (() => void) | null = null;

export function initAdvanceRequestStoreSync() {
  if (unsubscribe) return;

  const unsubSync = onTableSync('advance_requests', (_table, rows) => {
    useAdvanceRequestStore.setState({
      requests: (rows || []).map(mapDbRow),
      isLoaded: true,
    });
  });

  const unsubLegacy = onDataChange((table) => {
    if (table === 'advance_requests') {
      useAdvanceRequestStore.getState().loadRequests();
    }
  });

  unsubscribe = () => {
    unsubSync();
    unsubLegacy();
  };
}

export function cleanupAdvanceRequestStoreSync() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
