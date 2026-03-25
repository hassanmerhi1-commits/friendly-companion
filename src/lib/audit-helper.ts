/**
 * Audit Helper - Centralized audit logging utility
 * Captures who, when, what, and before/after for every change
 */

import { useAuditStore } from '@/stores/audit-store';
import { useAuthStore } from '@/stores/auth-store';
import type { AuditAction, AuditLogEntry } from '@/types/audit';

type EntityType = AuditLogEntry['entityType'];

interface AuditParams {
  action: AuditAction;
  entityType: EntityType;
  entityId: string;
  employeeId?: string;
  periodId?: string;
  description: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  correctionReason?: string;
}

/**
 * Compute only the changed fields between two objects.
 * Returns { before: {...}, after: {...} } with only differing keys.
 */
export function computeDiff(
  previous: Record<string, any> | undefined,
  current: Record<string, any> | undefined
): { before?: Record<string, any>; after?: Record<string, any> } {
  if (!previous || !current) return { before: previous, after: current };

  const before: Record<string, any> = {};
  const after: Record<string, any> = {};
  let hasDiff = false;

  // Check all keys in current
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  for (const key of allKeys) {
    // Skip internal/timestamp fields
    if (['createdAt', 'updatedAt', 'created_at', 'updated_at'].includes(key)) continue;
    
    const prev = previous[key];
    const curr = current[key];
    
    if (JSON.stringify(prev) !== JSON.stringify(curr)) {
      before[key] = prev;
      after[key] = curr;
      hasDiff = true;
    }
  }

  if (!hasDiff) return {};
  return { before, after };
}

/**
 * Log an audit action. Automatically captures the current user.
 */
export function logAudit(params: AuditParams): void {
  const { currentUser } = useAuthStore.getState();
  const { logAction } = useAuditStore.getState();

  // If previous/new values provided, compute diff to store only changes
  let previousValue = params.previousValue;
  let newValue = params.newValue;

  if (previousValue && newValue) {
    const diff = computeDiff(previousValue, newValue);
    if (!diff.before && !diff.after) return; // No actual changes
    previousValue = diff.before;
    newValue = diff.after;
  }

  logAction({
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    employeeId: params.employeeId,
    periodId: params.periodId,
    description: `[${currentUser?.username || 'Sistema'}] ${params.description}`,
    previousValue,
    newValue,
    correctionReason: params.correctionReason,
  });
}

/**
 * Format a field name for display (camelCase → readable)
 */
export function formatFieldName(field: string): string {
  const fieldLabels: Record<string, string> = {
    firstName: 'Nome',
    lastName: 'Apelido',
    baseSalary: 'Salário Base',
    mealAllowance: 'Subsídio Alimentação',
    transportAllowance: 'Subsídio Transporte',
    familyAllowance: 'Abono de Família',
    monthlyBonus: 'Bónus Mensal',
    otherAllowances: 'Outros Subsídios',
    department: 'Departamento',
    position: 'Cargo',
    status: 'Estado',
    contractType: 'Tipo Contrato',
    contractEndDate: 'Fim Contrato',
    branchId: 'Filial',
    phone: 'Telefone',
    email: 'Email',
    address: 'Morada',
    bankName: 'Banco',
    bankAccountNumber: 'Conta Bancária',
    iban: 'IBAN',
    nif: 'NIF',
    inssNumber: 'Nº INSS',
    absenceDays: 'Dias de Falta',
    justifiedAbsenceDays: 'Faltas Justificadas',
    delayHours: 'Horas de Atraso',
    totalDeduction: 'Dedução Total',
    amount: 'Montante',
    totalAmount: 'Montante Total',
    installments: 'Prestações',
    installmentsPaid: 'Prestações Pagas',
    remainingAmount: 'Montante Restante',
    description: 'Descrição',
    type: 'Tipo',
    reason: 'Motivo',
    companyName: 'Nome da Empresa',
  };
  return fieldLabels[field] || field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}
