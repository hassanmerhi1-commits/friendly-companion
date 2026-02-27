import { useState, useMemo } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useDeductionStore, getDeductionTypeLabel } from '@/stores/deduction-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { formatAOA } from '@/lib/angola-labor-law';
import { useLanguage } from '@/lib/i18n';
import type { Deduction, DeductionType, DeductionFormData } from '@/types/deduction';
import { Wallet, Package, Plus, Trash2, CheckCircle, Pencil, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Deductions() {
  const { t, language } = useLanguage();
  const { deductions, addDeduction, updateDeduction, deleteDeduction } = useDeductionStore();
  const { periods } = usePayrollStore();
  const { employees } = useEmployeeStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [formData, setFormData] = useState<DeductionFormData>({
    employeeId: '',
    type: 'salary_advance',
    description: '',
    totalAmount: 0,
    date: new Date().toISOString().split('T')[0],
    installments: 1,
  });

  const filteredDeductions = filterType === 'all' 
    ? deductions 
    : deductions.filter(d => d.type === filterType);

  const pendingDeductions = deductions.filter(d => !d.isFullyPaid);
  const totalPending = pendingDeductions.reduce((sum, d) => sum + d.remainingAmount, 0);

  const monthlyAmount = formData.installments > 0 ? formData.totalAmount / formData.installments : formData.totalAmount;

  const resetForm = () => {
    setFormData({
      employeeId: '',
      type: 'salary_advance',
      description: '',
      totalAmount: 0,
      date: new Date().toISOString().split('T')[0],
      installments: 1,
    });
  };

  const handleAddDeduction = () => {
    if (!formData.employeeId || !formData.totalAmount || !formData.description) {
      toast.error(language === 'pt' ? 'Preencha os campos obrigatórios' : 'Fill in required fields');
      return;
    }
    addDeduction(formData);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success(language === 'pt' ? 'Desconto registado com sucesso!' : 'Deduction registered successfully!');
  };

  const handleEditClick = (deduction: Deduction) => {
    setEditingDeduction(deduction);
    setFormData({
      employeeId: deduction.employeeId,
      type: deduction.type,
      description: deduction.description,
      totalAmount: deduction.totalAmount,
      date: deduction.date,
      installments: deduction.installments || 1,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateDeduction = async () => {
    if (!editingDeduction) return;
    if (!formData.totalAmount || !formData.description) {
      toast.error(language === 'pt' ? 'Preencha os campos obrigatórios' : 'Fill in required fields');
      return;
    }
    
    const newMonthlyAmount = formData.totalAmount / formData.installments;
    const newRemainingAmount = formData.totalAmount - (editingDeduction.installmentsPaid * newMonthlyAmount);
    
    await updateDeduction(editingDeduction.id, {
      employeeId: formData.employeeId,
      type: formData.type as DeductionType,
      description: formData.description,
      totalAmount: formData.totalAmount,
      amount: newMonthlyAmount,
      date: formData.date,
      installments: formData.installments,
      remainingAmount: Math.max(0, newRemainingAmount),
      isFullyPaid: newRemainingAmount <= 0,
    });
    setIsEditDialogOpen(false);
    setEditingDeduction(null);
    resetForm();
    toast.success(language === 'pt' ? 'Desconto actualizado com sucesso!' : 'Deduction updated successfully!');
  };

  const handleDelete = (deduction: Deduction) => {
    deleteDeduction(deduction.id);
    toast.success(language === 'pt' ? 'Desconto removido' : 'Deduction removed');
  };

  const getEmployee = (id: string) => employees.find(e => e.id === id);

  const monthNames = language === 'pt'
    ? ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const getPeriodLabel = (periodId?: string) => {
    if (!periodId) return '';
    const p = periods.find((x) => x.id === periodId);
    if (!p) return periodId;
    return `${monthNames[p.month - 1]} ${p.year}`;
  };

  const pageTitle = language === 'pt' ? 'Deduções' : 'Deductions';
  const pageSubtitle = language === 'pt' 
    ? 'Adiantamentos salariais, perdas no armazém e outras deduções' 
    : 'Salary advances, warehouse losses and other deductions';
  const addDeductionLabel = language === 'pt' ? 'Novo Desconto' : 'New Deduction';

  const deductionTypes: { value: DeductionType; icon: typeof Wallet }[] = [
    { value: 'salary_advance', icon: Wallet },
    { value: 'warehouse_loss', icon: Package },
    { value: 'unjustified_absence', icon: Wallet },
    { value: 'loan', icon: Wallet },
    { value: 'disciplinary', icon: Wallet },
    { value: 'other', icon: Wallet },
  ];

  const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);
  const selectedEmployee = activeEmployees.find(e => e.id === formData.employeeId);

  // Inline form fields
  const deductionFormFields = (
    <div className="grid gap-4 py-4">
      {/* Searchable Employee Combobox */}
      <div className="space-y-2">
        <Label>{language === 'pt' ? 'Funcionário *' : 'Employee *'}</Label>
        <Popover open={employeeSearchOpen} onOpenChange={setEmployeeSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={employeeSearchOpen}
              className="w-full justify-between font-normal"
              disabled={!!editingDeduction}
            >
              {selectedEmployee
                ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                : (language === 'pt' ? 'Pesquisar funcionário...' : 'Search employee...')}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder={language === 'pt' ? 'Pesquisar por nome...' : 'Search by name...'} />
              <CommandList>
                <CommandEmpty>{language === 'pt' ? 'Nenhum funcionário encontrado.' : 'No employee found.'}</CommandEmpty>
                <CommandGroup>
                  {activeEmployees.map((emp) => (
                    <CommandItem
                      key={emp.id}
                      value={`${emp.firstName} ${emp.lastName}`}
                      onSelect={() => {
                        setFormData(prev => ({ ...prev, employeeId: emp.id }));
                        setEmployeeSearchOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", formData.employeeId === emp.id ? "opacity-100" : "opacity-0")} />
                      {emp.firstName} {emp.lastName}
                      {emp.department && <span className="ml-auto text-xs text-muted-foreground">{emp.department}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-2">
        <Label>{language === 'pt' ? 'Tipo de Desconto *' : 'Deduction Type *'}</Label>
        <Select 
          value={formData.type} 
          onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as DeductionType }))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {deductionTypes.map(({ value }) => (
              <SelectItem key={value} value={value}>
                {getDeductionTypeLabel(value, language)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{language === 'pt' ? 'Valor Total (AOA) *' : 'Total Amount (AOA) *'}</Label>
          <Input
            type="number"
            value={formData.totalAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{language === 'pt' ? 'Data' : 'Date'}</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>
      </div>
      
      {/* Flexible Installments - free numeric input */}
      <div className="space-y-2">
        <Label>{language === 'pt' ? 'Número de Prestações' : 'Number of Installments'}</Label>
        <Input
          type="number"
          min={1}
          value={formData.installments}
          onChange={(e) => setFormData(prev => ({ ...prev, installments: Math.max(1, Number(e.target.value)) }))}
          placeholder={language === 'pt' ? 'Ex: 1, 6, 24...' : 'E.g.: 1, 6, 24...'}
        />
        {formData.installments === 1 && (
          <p className="text-xs text-muted-foreground">{language === 'pt' ? 'Pagamento único' : 'Single payment'}</p>
        )}
      </div>

      {/* Show calculated monthly amount */}
      {formData.installments > 1 && formData.totalAmount > 0 && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {language === 'pt' ? 'Desconto mensal:' : 'Monthly deduction:'}
            </span>
            <span className="font-semibold text-destructive">
              {formatAOA(monthlyAmount)}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">
              {language === 'pt' ? 'Durante:' : 'Over:'}
            </span>
            <span className="font-medium">
              {formData.installments} {language === 'pt' ? 'meses' : 'months'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>{language === 'pt' ? 'Descrição *' : 'Description *'}</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={language === 'pt' ? 'Motivo do desconto...' : 'Reason for deduction...'}
        />
      </div>
    </div>
  );

  return (
    <TopNavLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageSubtitle}</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={resetForm}>
                <Plus className="h-4 w-4" />
                {addDeductionLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{addDeductionLabel}</DialogTitle>
              </DialogHeader>
              {deductionFormFields}
              <Button onClick={handleAddDeduction} className="w-full">
                {addDeductionLabel}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'pt' ? 'Total Pendente' : 'Total Pending'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatAOA(totalPending)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'pt' ? 'Adiantamentos' : 'Advances'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deductions.filter(d => d.type === 'salary_advance' && !d.isFullyPaid).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'pt' ? 'Perdas Armazém' : 'Warehouse Losses'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {deductions.filter(d => d.type === 'warehouse_loss' && !d.isFullyPaid).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'pt' ? 'Concluídos' : 'Completed'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {deductions.filter(d => d.isFullyPaid).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant={filterType === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilterType('all')}
          >
            {language === 'pt' ? 'Todos' : 'All'}
          </Button>
          <Button 
            variant={filterType === 'salary_advance' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilterType('salary_advance')}
          >
            <Wallet className="h-4 w-4 mr-1" />
            {language === 'pt' ? 'Adiantamentos' : 'Advances'}
          </Button>
          <Button 
            variant={filterType === 'warehouse_loss' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilterType('warehouse_loss')}
          >
            <Package className="h-4 w-4 mr-1" />
            {language === 'pt' ? 'Perdas Armazém' : 'Warehouse'}
          </Button>
          <Button 
            variant={filterType === 'loan' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilterType('loan')}
          >
            <Wallet className="h-4 w-4 mr-1" />
            {language === 'pt' ? 'Empréstimos' : 'Loans'}
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'pt' ? 'Funcionário' : 'Employee'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Tipo' : 'Type'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Descrição' : 'Description'}</TableHead>
                  <TableHead className="text-right">{language === 'pt' ? 'Total' : 'Total'}</TableHead>
                  <TableHead className="text-right">{language === 'pt' ? 'Mensal' : 'Monthly'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Progresso' : 'Progress'}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="text-right">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeductions.map((deduction) => {
                  const employee = getEmployee(deduction.employeeId);
                  const progressPercent = deduction.installments > 0 
                    ? (deduction.installmentsPaid / deduction.installments) * 100 
                    : 0;
                  
                  return (
                    <TableRow key={deduction.id}>
                      <TableCell>
                        <div className="font-medium">
                          {employee ? `${employee.firstName} ${employee.lastName}` : 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {employee?.department}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={deduction.type === 'salary_advance' ? 'default' : 'secondary'}>
                          {getDeductionTypeLabel(deduction.type, language)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{deduction.description}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAOA(deduction.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {formatAOA(deduction.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{deduction.installmentsPaid}/{deduction.installments}</span>
                            <span>{formatAOA(deduction.remainingAmount)}</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        {deduction.isFullyPaid ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {language === 'pt' ? 'Pago' : 'Paid'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            {language === 'pt' ? 'Em curso' : 'In progress'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleEditClick(deduction)}
                            title={language === 'pt' ? 'Editar' : 'Edit'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDelete(deduction)}
                            title={language === 'pt' ? 'Apagar' : 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingDeduction(null);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{language === 'pt' ? 'Editar Desconto' : 'Edit Deduction'}</DialogTitle>
            </DialogHeader>
            {deductionFormFields}
            {editingDeduction && editingDeduction.installmentsPaid > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                {language === 'pt' 
                  ? `Atenção: ${editingDeduction.installmentsPaid} prestação(ões) já foram pagas.`
                  : `Note: ${editingDeduction.installmentsPaid} installment(s) have already been paid.`}
              </div>
            )}
            <Button onClick={handleUpdateDeduction} className="w-full">
              {language === 'pt' ? 'Guardar Alterações' : 'Save Changes'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </TopNavLayout>
  );
}
