import type { TerminationReason } from '@/types/hr';

export type EmployeeExitReason = TerminationReason;

export const EMPLOYEE_EXIT_REASONS: EmployeeExitReason[] = [
  'dismissal',
  'voluntary',
  'contract_end',
  'retirement',
  'mutual_agreement',
];

export function getExitReasonLabel(reason: EmployeeExitReason, language: string): string {
  const labels: Record<EmployeeExitReason, { pt: string; en: string }> = {
    dismissal: { pt: 'Despedimento', en: 'Dismissal' },
    voluntary: { pt: 'Pedido do trabalhador', en: 'Voluntary resignation' },
    contract_end: { pt: 'Fim de contrato', en: 'Contract end' },
    retirement: { pt: 'Reforma / aposentação', en: 'Retirement' },
    mutual_agreement: { pt: 'Acordo de mútuo consentimento', en: 'Mutual agreement' },
  };
  const row = labels[reason];
  return language === 'pt' ? row.pt : row.en;
}

export function formatFormerEmployeeBlockMessage(
  employee: {
    firstName: string;
    lastName: string;
    exitDate?: string;
    exitNote?: string;
  },
  language: string
): string {
  const name = `${employee.firstName} ${employee.lastName}`.trim();
  const datePart =
    employee.exitDate &&
    (language === 'pt'
      ? ` Saída em ${new Date(employee.exitDate).toLocaleDateString('pt-AO')}.`
      : ` Left on ${new Date(employee.exitDate).toLocaleDateString('en-GB')}.`);
  const notePart =
    employee.exitNote && employee.exitNote.trim()
      ? (language === 'pt' ? ` Motivo: ${employee.exitNote.trim()}` : ` Reason: ${employee.exitNote.trim()}`)
      : '';
  if (language === 'pt') {
    return `${name} já saiu da empresa.${datePart || ''}${notePart} Use «Recontratar» no dossier ou lista de arquivados para reactivar o mesmo registo.`;
  }
  return `${name} already left the company.${datePart || ''}${notePart} Use Rehire on the archived list to reactivate the same record.`;
}
