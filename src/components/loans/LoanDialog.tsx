import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Plus, History, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';
import { useLoanStore, type Loan } from '@/stores/loan-store';
import { formatAOA } from '@/lib/angola-labor-law';
import { toast } from 'sonner';

interface LoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
}

export function LoanDialog({ open, onOpenChange, employeeId }: LoanDialogProps) {
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { loans, addLoan, getActiveLoansByEmployee, getTotalDeductionForEmployee, isLoaded, loadLoans } = useLoanStore();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || '');
  const [loanType, setLoanType] = useState<'advance' | 'loan'>('advance');
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('1');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('add');

  // Load loans if not loaded
  useState(() => {
    if (!isLoaded) {
      loadLoans();
    }
  });

  const monthlyDeduction = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const inst = parseInt(installments) || 1;
    return amt / inst;
  }, [amount, installments]);

  const activeEmployees = employees.filter(e => e.status === 'active');
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const employeeLoans = selectedEmployeeId ? getActiveLoansByEmployee(selectedEmployeeId) : [];
  const totalCurrentDeduction = selectedEmployeeId ? getTotalDeductionForEmployee(selectedEmployeeId) : 0;

  const handleSubmit = async () => {
    if (!selectedEmployeeId) {
      toast.error(language === 'pt' ? 'Selecione um funcionário' : 'Select an employee');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(language === 'pt' ? 'Insira um valor válido' : 'Enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addLoan({
        employeeId: selectedEmployeeId,
        type: loanType,
        amount: parseFloat(amount),
        monthlyDeduction,
        installments: parseInt(installments),
        reason,
        approvedBy: 'Admin', // TODO: Get from auth
        approvedAt: new Date().toISOString(),
        startDate: new Date().toISOString(),
      });

      if (result.success) {
        toast.success(language === 'pt' ? 'Empréstimo registado com sucesso!' : 'Loan registered successfully!');
        setAmount('');
        setInstallments('1');
        setReason('');
        setActiveTab('history');
      } else {
        toast.error(result.error || 'Error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = {
    title: language === 'pt' ? 'Gestão de Empréstimos e Adiantamentos' : 'Loans & Advances Management',
    addNew: language === 'pt' ? 'Novo Registo' : 'New Record',
    history: language === 'pt' ? 'Histórico' : 'History',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    selectEmployee: language === 'pt' ? 'Selecionar funcionário' : 'Select employee',
    type: language === 'pt' ? 'Tipo' : 'Type',
    advance: language === 'pt' ? 'Adiantamento' : 'Advance',
    loan: language === 'pt' ? 'Empréstimo' : 'Loan',
    amount: language === 'pt' ? 'Valor' : 'Amount',
    installments: language === 'pt' ? 'Parcelas' : 'Installments',
    monthlyDeduction: language === 'pt' ? 'Dedução Mensal' : 'Monthly Deduction',
    reason: language === 'pt' ? 'Motivo' : 'Reason',
    submit: language === 'pt' ? 'Registar' : 'Register',
    status: language === 'pt' ? 'Estado' : 'Status',
    active: language === 'pt' ? 'Ativo' : 'Active',
    paid: language === 'pt' ? 'Pago' : 'Paid',
    remaining: language === 'pt' ? 'Restante' : 'Remaining',
    paid_installments: language === 'pt' ? 'Parcelas Pagas' : 'Paid Installments',
    noLoans: language === 'pt' ? 'Nenhum empréstimo registado' : 'No loans registered',
    currentDeduction: language === 'pt' ? 'Dedução Mensal Atual' : 'Current Monthly Deduction',
  };

  const getStatusBadge = (status: Loan['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">{t.active}</Badge>;
      case 'paid':
        return <Badge variant="secondary">{t.paid}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription>
            {language === 'pt' 
              ? 'Registe adiantamentos salariais ou empréstimos a funcionários' 
              : 'Register salary advances or loans to employees'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="add">
              <Plus className="h-4 w-4 mr-2" />
              {t.addNew}
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              {t.history}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.employee}</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectEmployee} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.type}</Label>
                <Select value={loanType} onValueChange={(v) => setLoanType(v as 'advance' | 'loan')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">{t.advance}</SelectItem>
                    <SelectItem value="loan">{t.loan}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t.amount} (AOA)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label>{t.installments}</Label>
                <Select value={installments} onValueChange={setInstallments}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? (language === 'pt' ? 'parcela' : 'installment') : (language === 'pt' ? 'parcelas' : 'installments')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label>{t.reason}</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={language === 'pt' ? 'Motivo do empréstimo ou adiantamento...' : 'Reason for loan or advance...'}
                  rows={2}
                />
              </div>
            </div>

            {/* Monthly deduction preview */}
            {amount && parseFloat(amount) > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t.monthlyDeduction}:</span>
                    <span className="text-lg font-bold text-destructive">-{formatAOA(monthlyDeduction)}</span>
                  </div>
                  {selectedEmployeeId && totalCurrentDeduction > 0 && (
                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                      <span className="text-sm text-muted-foreground">{t.currentDeduction}:</span>
                      <span className="text-sm font-medium text-orange-500">-{formatAOA(totalCurrentDeduction)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {t.submit}
            </Button>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {/* Employee filter for history */}
            <div className="mb-4">
              <Label>{t.employee}</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectEmployee} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  {activeEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Loans table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.employee}</TableHead>
                    <TableHead>{t.type}</TableHead>
                    <TableHead className="text-right">{t.amount}</TableHead>
                    <TableHead className="text-right">{t.remaining}</TableHead>
                    <TableHead className="text-center">{t.installments}</TableHead>
                    <TableHead>{t.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(selectedEmployeeId ? loans.filter(l => l.employeeId === selectedEmployeeId) : loans)
                    .slice(0, 20)
                    .map(loan => {
                      const emp = employees.find(e => e.id === loan.employeeId);
                      return (
                        <TableRow key={loan.id}>
                          <TableCell>
                            {emp ? `${emp.firstName} ${emp.lastName}` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {loan.type === 'advance' ? t.advance : t.loan}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatAOA(loan.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatAOA(loan.remainingAmount)}
                          </TableCell>
                          <TableCell className="text-center">
                            {loan.paidInstallments}/{loan.installments}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(loan.status)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {loans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t.noLoans}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
