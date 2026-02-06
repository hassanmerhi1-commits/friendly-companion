import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Clock, FileText, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useAbsenceStore } from '@/stores/absence-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { ABSENCE_TYPE_INFO, type AbsenceType, type AbsenceStatus } from '@/types/absence';
import { formatAOA, calculateDailyRate } from '@/lib/angola-labor-law';
import { toast } from 'sonner';

interface AbsenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
  month?: number;
  year?: number;
}

export function AbsenceDialog({ open, onOpenChange, employeeId, month, year }: AbsenceDialogProps) {
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { 
    absences, 
    addAbsence, 
    deleteAbsence, 
    justifyAbsence, 
    markAsUnjustified,
    approveAbsence,
    getAbsencesByEmployee,
    getPendingAbsences
  } = useAbsenceStore();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || '');
  const [absenceType, setAbsenceType] = useState<AbsenceType>('unjustified');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [justificationDoc, setJustificationDoc] = useState('');
  const [activeTab, setActiveTab] = useState('add');

  const t = {
    title: language === 'pt' ? 'Gestão de Ausências' : 'Absence Management',
    addAbsence: language === 'pt' ? 'Registar Ausência' : 'Record Absence',
    pendingList: language === 'pt' ? 'Pendentes' : 'Pending',
    history: language === 'pt' ? 'Histórico' : 'History',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    selectEmployee: language === 'pt' ? 'Selecionar funcionário' : 'Select employee',
    type: language === 'pt' ? 'Tipo de Ausência' : 'Absence Type',
    startDate: language === 'pt' ? 'Data Início' : 'Start Date',
    endDate: language === 'pt' ? 'Data Fim' : 'End Date',
    reason: language === 'pt' ? 'Motivo' : 'Reason',
    justification: language === 'pt' ? 'Documento de Justificação' : 'Justification Document',
    register: language === 'pt' ? 'Registar' : 'Register',
    status: language === 'pt' ? 'Estado' : 'Status',
    days: language === 'pt' ? 'Dias' : 'Days',
    actions: language === 'pt' ? 'Ações' : 'Actions',
    justify: language === 'pt' ? 'Justificar' : 'Justify',
    reject: language === 'pt' ? 'Rejeitar' : 'Reject',
    approve: language === 'pt' ? 'Aprovar' : 'Approve',
    deduction: language === 'pt' ? 'Desconto' : 'Deduction',
    pending: language === 'pt' ? 'Pendente' : 'Pending',
    justified: language === 'pt' ? 'Justificada' : 'Justified',
    unjustified: language === 'pt' ? 'Injustificada' : 'Unjustified',
    approved: language === 'pt' ? 'Aprovada' : 'Approved',
    rejected: language === 'pt' ? 'Rejeitada' : 'Rejected',
    noAbsences: language === 'pt' ? 'Nenhuma ausência registada' : 'No absences recorded',
    noPending: language === 'pt' ? 'Nenhuma ausência pendente' : 'No pending absences',
    legalRef: language === 'pt' ? 'Ref. Legal' : 'Legal Ref.',
    maxDays: language === 'pt' ? 'Máx. dias' : 'Max days',
    paidBy: language === 'pt' ? 'Pago por' : 'Paid by',
    requiresDoc: language === 'pt' ? 'Requer documento' : 'Requires document',
    success: language === 'pt' ? 'Ausência registada com sucesso' : 'Absence recorded successfully',
    justifySuccess: language === 'pt' ? 'Ausência justificada' : 'Absence justified',
    approveSuccess: language === 'pt' ? 'Ausência aprovada' : 'Absence approved',
    rejectSuccess: language === 'pt' ? 'Ausência marcada como injustificada' : 'Absence marked as unjustified',
    deleteSuccess: language === 'pt' ? 'Ausência eliminada' : 'Absence deleted',
    maternityNote: language === 'pt' 
      ? 'Licença de maternidade: 90 dias pagos pelo INSS (Art. 150 LGT)' 
      : 'Maternity leave: 90 days paid by INSS (Art. 150 LGT)',
    paternityNote: language === 'pt'
      ? 'Licença de paternidade: 3 dias pagos pelo empregador (Art. 151 LGT)'
      : 'Paternity leave: 3 days paid by employer (Art. 151 LGT)',
  };

  const getStatusBadge = (status: AbsenceStatus) => {
    const variants: Record<AbsenceStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: t.pending },
      justified: { variant: 'default', label: t.justified },
      unjustified: { variant: 'destructive', label: t.unjustified },
      approved: { variant: 'default', label: t.approved },
      rejected: { variant: 'destructive', label: t.rejected },
    };
    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getAbsenceTypeLabel = (type: AbsenceType) => {
    const info = ABSENCE_TYPE_INFO[type];
    return language === 'pt' ? info.labelPt : info.labelEn;
  };

  const handleAddAbsence = () => {
    if (!selectedEmployeeId) {
      toast.error(language === 'pt' ? 'Selecione um funcionário' : 'Select an employee');
      return;
    }
    if (!startDate || !endDate) {
      toast.error(language === 'pt' ? 'Preencha as datas' : 'Fill in the dates');
      return;
    }

    const typeInfo = ABSENCE_TYPE_INFO[absenceType];
    const isAutoJustified = ['maternity', 'paternity', 'marriage', 'bereavement'].includes(absenceType);
    const needsApproval = ['maternity', 'study_leave'].includes(absenceType);
    
    addAbsence({
      employeeId: selectedEmployeeId,
      type: absenceType,
      status: absenceType === 'unjustified' 
        ? 'unjustified' 
        : (needsApproval ? 'pending' : (isAutoJustified ? 'justified' : 'pending')),
      startDate,
      endDate,
      days: 0, // Will be calculated by the store
      reason,
      justificationDocument: justificationDoc || undefined,
      deductFromSalary: absenceType === 'unjustified' || (!typeInfo.paidByEmployer && !typeInfo.paidByINSS),
    });

    toast.success(t.success);
    setReason('');
    setJustificationDoc('');
    setAbsenceType('unjustified');
  };

  const handleJustify = (absenceId: string) => {
    const doc = prompt(language === 'pt' ? 'Número do documento de justificação:' : 'Justification document number:');
    if (doc) {
      justifyAbsence(absenceId, doc);
      toast.success(t.justifySuccess);
    }
  };

  const handleApprove = (absenceId: string) => {
    approveAbsence(absenceId, 'Admin');
    toast.success(t.approveSuccess);
  };

  const handleReject = (absenceId: string) => {
    markAsUnjustified(absenceId);
    toast.success(t.rejectSuccess);
  };

  const handleDelete = (absenceId: string) => {
    if (confirm(language === 'pt' ? 'Tem certeza que deseja eliminar?' : 'Are you sure you want to delete?')) {
      deleteAbsence(absenceId);
      toast.success(t.deleteSuccess);
    }
  };

  const pendingAbsences = getPendingAbsences();
  const employeeAbsences = selectedEmployeeId && selectedEmployeeId !== 'all'
    ? getAbsencesByEmployee(selectedEmployeeId)
    : absences;

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const selectedTypeInfo = ABSENCE_TYPE_INFO[absenceType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add">
              <Plus className="h-4 w-4 mr-2" />
              {t.addAbsence}
            </TabsTrigger>
            <TabsTrigger value="pending">
              <AlertCircle className="h-4 w-4 mr-2" />
              {t.pendingList} ({pendingAbsences.length})
            </TabsTrigger>
            <TabsTrigger value="history">
              <FileText className="h-4 w-4 mr-2" />
              {t.history}
            </TabsTrigger>
          </TabsList>

          {/* Add Absence Tab */}
          <TabsContent value="add" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.employee}</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectEmployee} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.status === 'active').map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} - {emp.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.type}</Label>
                <Select value={absenceType} onValueChange={(v) => setAbsenceType(v as AbsenceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ABSENCE_TYPE_INFO).map(([type, info]) => (
                      <SelectItem key={type} value={type}>
                        {language === 'pt' ? info.labelPt : info.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.startDate}</Label>
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>{t.endDate}</Label>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                />
              </div>
            </div>

            {/* Type Info Box */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-medium mb-2">{getAbsenceTypeLabel(absenceType)}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {selectedTypeInfo.maxDays && (
                  <div>
                    <span className="text-muted-foreground">{t.maxDays}:</span>{' '}
                    <strong>{selectedTypeInfo.maxDays}</strong>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">{t.paidBy}:</span>{' '}
                  <strong>
                    {selectedTypeInfo.paidByINSS ? 'INSS' : (selectedTypeInfo.paidByEmployer ? (language === 'pt' ? 'Empregador' : 'Employer') : (language === 'pt' ? 'Não pago' : 'Unpaid'))}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.requiresDoc}:</span>{' '}
                  <strong>{selectedTypeInfo.requiresDocument ? (language === 'pt' ? 'Sim' : 'Yes') : (language === 'pt' ? 'Não' : 'No')}</strong>
                </div>
                {selectedTypeInfo.legalReference && (
                  <div>
                    <span className="text-muted-foreground">{t.legalRef}:</span>{' '}
                    <strong>{selectedTypeInfo.legalReference}</strong>
                  </div>
                )}
              </div>
              
              {absenceType === 'maternity' && (
                <p className="mt-2 text-sm text-accent">{t.maternityNote}</p>
              )}
              {absenceType === 'paternity' && (
                <p className="mt-2 text-sm text-accent">{t.paternityNote}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t.reason}</Label>
              <Textarea 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                placeholder={language === 'pt' ? 'Descreva o motivo da ausência...' : 'Describe the reason for absence...'}
              />
            </div>

            {selectedTypeInfo.requiresDocument && (
              <div className="space-y-2">
                <Label>{t.justification}</Label>
                <Input 
                  value={justificationDoc} 
                  onChange={(e) => setJustificationDoc(e.target.value)}
                  placeholder={language === 'pt' ? 'Nº do atestado médico, certidão, etc.' : 'Medical certificate number, certificate, etc.'}
                />
              </div>
            )}

            {selectedEmployee && absenceType === 'unjustified' && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  {language === 'pt' 
                    ? `Desconto estimado: ${formatAOA(calculateDailyRate(selectedEmployee.baseSalary))} por dia`
                    : `Estimated deduction: ${formatAOA(calculateDailyRate(selectedEmployee.baseSalary))} per day`}
                </p>
              </div>
            )}

            <Button onClick={handleAddAbsence} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {t.register}
            </Button>
          </TabsContent>

          {/* Pending Absences Tab */}
          <TabsContent value="pending">
            {pendingAbsences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t.noPending}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.employee}</TableHead>
                    <TableHead>{t.type}</TableHead>
                    <TableHead>{t.startDate}</TableHead>
                    <TableHead>{t.endDate}</TableHead>
                    <TableHead>{t.days}</TableHead>
                    <TableHead>{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAbsences.map((absence) => {
                    const emp = employees.find(e => e.id === absence.employeeId);
                    return (
                      <TableRow key={absence.id}>
                        <TableCell>{emp ? `${emp.firstName} ${emp.lastName}` : '-'}</TableCell>
                        <TableCell>{getAbsenceTypeLabel(absence.type)}</TableCell>
                        <TableCell>{new Date(absence.startDate).toLocaleDateString('pt-AO')}</TableCell>
                        <TableCell>{new Date(absence.endDate).toLocaleDateString('pt-AO')}</TableCell>
                        <TableCell>{absence.days}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleJustify(absence.id)}>
                              {t.justify}
                            </Button>
                            <Button size="sm" variant="default" onClick={() => handleApprove(absence.id)}>
                              {t.approve}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleReject(absence.id)}>
                              {t.reject}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <div className="mb-4">
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder={t.selectEmployee} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'pt' ? 'Todos' : 'All'}</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {employeeAbsences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t.noAbsences}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.employee}</TableHead>
                    <TableHead>{t.type}</TableHead>
                    <TableHead>{t.startDate}</TableHead>
                    <TableHead>{t.endDate}</TableHead>
                    <TableHead>{t.days}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.deduction}</TableHead>
                    <TableHead>{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeAbsences.slice().reverse().map((absence) => {
                    const emp = employees.find(e => e.id === absence.employeeId);
                    const deduction = absence.deductFromSalary && emp
                      ? calculateDailyRate(emp.baseSalary) * absence.days
                      : 0;
                    
                    return (
                      <TableRow key={absence.id}>
                        <TableCell>{emp ? `${emp.firstName} ${emp.lastName}` : '-'}</TableCell>
                        <TableCell>{getAbsenceTypeLabel(absence.type)}</TableCell>
                        <TableCell>{new Date(absence.startDate).toLocaleDateString('pt-AO')}</TableCell>
                        <TableCell>{new Date(absence.endDate).toLocaleDateString('pt-AO')}</TableCell>
                        <TableCell>{absence.days}</TableCell>
                        <TableCell>{getStatusBadge(absence.status)}</TableCell>
                        <TableCell>
                          {deduction > 0 ? (
                            <span className="text-destructive font-medium">-{formatAOA(deduction)}</span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleDelete(absence.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}