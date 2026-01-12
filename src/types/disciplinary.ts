export type DisciplinaryType = 'advertencia_escrita' | 'suspensao' | 'processo_disciplinar';
export type DisciplinaryStatus = 'pendente' | 'resolvido' | 'escalado' | 'arquivado';

export interface DisciplinaryRecord {
  id: string;
  employeeId: string;
  type: DisciplinaryType;
  status: DisciplinaryStatus;
  date: string;
  description: string;
  duration?: number; // dias de suspensão
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  resolution?: string;
  resolutionDate?: string;
}

export const DISCIPLINARY_TYPE_LABELS: Record<DisciplinaryType, string> = {
  advertencia_escrita: 'Advertência Escrita',
  suspensao: 'Suspensão',
  processo_disciplinar: 'Processo Disciplinar',
};

export const DISCIPLINARY_STATUS_LABELS: Record<DisciplinaryStatus, string> = {
  pendente: 'Pendente',
  resolvido: 'Resolvido',
  escalado: 'Escalado',
  arquivado: 'Arquivado',
};
