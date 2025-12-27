/**
 * Absence Types based on Lei Geral do Trabalho (Lei n.º 12/23)
 * Tipos de Ausência/Faltas
 */

export type AbsenceType = 
  | 'unjustified'        // Falta injustificada - deducted from salary
  | 'sick_leave'         // Doença comum - justified with medical certificate
  | 'work_accident'      // Acidente de trabalho
  | 'maternity'          // Licença de maternidade (90 dias - Art. 150)
  | 'paternity'          // Licença de paternidade (3 dias - Art. 151)
  | 'marriage'           // Casamento (8 dias - Art. 173)
  | 'bereavement'        // Falecimento de familiar (2-5 dias)
  | 'study_leave'        // Licença para estudos
  | 'union_activity'     // Actividade sindical
  | 'court_summons'      // Intimação judicial
  | 'blood_donation'     // Doação de sangue (1 dia)
  | 'other_justified';   // Outras faltas justificadas

export type AbsenceStatus = 
  | 'pending'            // Pendente - aguardando justificação
  | 'justified'          // Justificada - documento apresentado
  | 'unjustified'        // Injustificada - será descontada
  | 'approved'           // Aprovada (para licenças como maternidade)
  | 'rejected';          // Rejeitada - justificação não aceite

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  status: AbsenceStatus;
  startDate: string;      // ISO date string
  endDate: string;        // ISO date string
  days: number;           // Total working days absent
  reason: string;         // Description/reason
  justificationDocument?: string;  // Document reference/number
  justificationDate?: string;      // Date justification was provided
  approvedBy?: string;    // Who approved (for leaves)
  approvedDate?: string;  // When approved
  notes?: string;         // Additional notes
  deductFromSalary: boolean;  // Whether to deduct from salary
  salaryDeductionAmount?: number; // Calculated deduction amount
  createdAt: string;
  updatedAt: string;
}

// Absence type details with legal references
export const ABSENCE_TYPE_INFO: Record<AbsenceType, {
  labelPt: string;
  labelEn: string;
  maxDays?: number;
  paidByEmployer: boolean;
  paidByINSS: boolean;
  requiresDocument: boolean;
  legalReference?: string;
}> = {
  unjustified: {
    labelPt: 'Falta Injustificada',
    labelEn: 'Unjustified Absence',
    paidByEmployer: false,
    paidByINSS: false,
    requiresDocument: false,
    legalReference: 'Art. 168 LGT'
  },
  sick_leave: {
    labelPt: 'Doença Comum',
    labelEn: 'Sick Leave',
    paidByEmployer: true, // First days
    paidByINSS: true,     // After certain period
    requiresDocument: true,
    legalReference: 'Art. 171 LGT'
  },
  work_accident: {
    labelPt: 'Acidente de Trabalho',
    labelEn: 'Work Accident',
    paidByEmployer: true,
    paidByINSS: true,
    requiresDocument: true,
    legalReference: 'Art. 172 LGT'
  },
  maternity: {
    labelPt: 'Licença de Maternidade',
    labelEn: 'Maternity Leave',
    maxDays: 90, // 3 months
    paidByEmployer: false,
    paidByINSS: true,
    requiresDocument: true,
    legalReference: 'Art. 150 LGT - 90 dias'
  },
  paternity: {
    labelPt: 'Licença de Paternidade',
    labelEn: 'Paternity Leave',
    maxDays: 3,
    paidByEmployer: true,
    paidByINSS: false,
    requiresDocument: true,
    legalReference: 'Art. 151 LGT - 3 dias'
  },
  marriage: {
    labelPt: 'Casamento',
    labelEn: 'Marriage Leave',
    maxDays: 8,
    paidByEmployer: true,
    paidByINSS: false,
    requiresDocument: true,
    legalReference: 'Art. 173 LGT - 8 dias'
  },
  bereavement: {
    labelPt: 'Falecimento de Familiar',
    labelEn: 'Bereavement Leave',
    maxDays: 5, // 2-5 days depending on relationship
    paidByEmployer: true,
    paidByINSS: false,
    requiresDocument: true,
    legalReference: 'Art. 173 LGT'
  },
  study_leave: {
    labelPt: 'Licença para Estudos',
    labelEn: 'Study Leave',
    paidByEmployer: false,
    paidByINSS: false,
    requiresDocument: true,
    legalReference: 'Art. 175 LGT'
  },
  union_activity: {
    labelPt: 'Actividade Sindical',
    labelEn: 'Union Activity',
    paidByEmployer: true,
    paidByINSS: false,
    requiresDocument: true,
    legalReference: 'Art. 174 LGT'
  },
  court_summons: {
    labelPt: 'Intimação Judicial',
    labelEn: 'Court Summons',
    paidByEmployer: true,
    paidByINSS: false,
    requiresDocument: true,
    legalReference: 'Art. 173 LGT'
  },
  blood_donation: {
    labelPt: 'Doação de Sangue',
    labelEn: 'Blood Donation',
    maxDays: 1,
    paidByEmployer: true,
    paidByINSS: false,
    requiresDocument: true,
    legalReference: 'Art. 173 LGT'
  },
  other_justified: {
    labelPt: 'Outras Faltas Justificadas',
    labelEn: 'Other Justified Absences',
    paidByEmployer: true,
    paidByINSS: false,
    requiresDocument: true,
    legalReference: 'Art. 173 LGT'
  }
};