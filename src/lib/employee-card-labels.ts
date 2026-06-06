import type { ContractType, EmployeeStatus } from '@/types/employee';
import type { Employee } from '@/types/employee';

export type CardLanguage = 'pt' | 'en';

export function getEmployeeCardQrValue(employee: Employee, companyName: string): string {
  const company = (companyName || 'PayrollAO').trim().slice(0, 40);
  return `PayrollAO|${company}|${employee.employeeNumber}|${employee.id}`;
}

export function getCardIssueDates(language: CardLanguage): { issued: string; validUntil: string } {
  const now = new Date();
  const issued = now.toLocaleDateString(language === 'pt' ? 'pt-AO' : 'en-US');
  const validUntil = new Date(now.getFullYear(), 11, 31).toLocaleDateString(
    language === 'pt' ? 'pt-AO' : 'en-US'
  );
  return { issued, validUntil };
}

export function getStatusLabel(status: EmployeeStatus, language: CardLanguage): string {
  const pt: Record<EmployeeStatus, string> = {
    active: 'ACTIVO',
    inactive: 'INACTIVO',
    on_leave: 'DE LICENÇA',
    terminated: 'CESSADO',
    pending_approval: 'PENDENTE',
  };
  const en: Record<EmployeeStatus, string> = {
    active: 'ACTIVE',
    inactive: 'INACTIVE',
    on_leave: 'ON LEAVE',
    terminated: 'TERMINATED',
    pending_approval: 'PENDING',
  };
  return language === 'pt' ? pt[status] : en[status];
}

export function getContractTypeLabel(type: ContractType, language: CardLanguage): string {
  const pt: Record<ContractType, string> = {
    permanent: 'Efectivo',
    fixed_term: 'Prazo Determinado',
    part_time: 'Tempo Parcial',
    probation: 'Período de Experiência',
    colaborador: 'Colaborador',
  };
  const en: Record<ContractType, string> = {
    permanent: 'Permanent',
    fixed_term: 'Fixed Term',
    part_time: 'Part Time',
    probation: 'Probation',
    colaborador: 'Collaborator',
  };
  return language === 'pt' ? pt[type] : en[type];
}

export function getCardLabels(language: CardLanguage) {
  const pt = language === 'pt';
  return {
    front: pt ? 'FRENTE' : 'FRONT',
    back: pt ? 'VERSO' : 'BACK',
    idCard: pt ? 'CARTÃO DE IDENTIFICAÇÃO' : 'IDENTIFICATION CARD',
    position: pt ? 'Cargo' : 'Position',
    department: pt ? 'Depto' : 'Dept',
    number: pt ? 'Nº' : 'No.',
    headquarters: pt ? 'Sede Principal' : 'Head Office',
    idDocument: 'BI',
    hireDate: pt ? 'Admissão' : 'Hired',
    emergency: pt ? 'Emergência' : 'Emergency',
    notSet: pt ? '—' : '—',
    issued: pt ? 'Emitido' : 'Issued',
    validUntil: pt ? 'Válido' : 'Valid',
    disclaimer1: pt
      ? 'Uso exclusivo do portador. Perda: contactar RH.'
      : 'Holder only. If lost, contact HR.',
    disclaimer2: '',
    cutHint: pt
      ? 'Recorte pelas linhas externas do cartão após impressão.'
      : 'Cut along the outer edges after printing.',
    batchFronts: pt ? 'Frentes — imprimir esta página' : 'Fronts — print this page',
    batchBacks: pt ? 'Versos — alinhar com frentes (frente e verso)' : 'Backs — align with fronts (duplex)',
  };
}
