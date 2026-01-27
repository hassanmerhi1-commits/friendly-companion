import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDeductionStore, getDeductionTypeLabel } from '@/stores/deduction-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { formatAOA } from '@/lib/angola-labor-law';
import { useLanguage } from '@/lib/i18n';
import type { Deduction, DeductionType, DeductionFormData } from '@/types/deduction';
import { Wallet, Package, Plus, Trash2, CheckCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export default function Deductions() {
  const { t, language } = useLanguage();
  const { deductions, addDeduction, updateDeduction, deleteDeduction } = useDeductionStore();
  const { periods } = usePayrollStore();
  const { employees } = useEmployeeStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<Deduction | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState<Partial<DeductionFormData>>({
    employeeId: '',
    type: 'salary_advance',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    installments: 1,
  });

  const filteredDeductions = filterType === 'all' 
    ? deductions 
    : deductions.filter(d => d.type === filterType);

  const pendingDeductions = deductions.filter(d => !d.isApplied);
  const totalPending = pendingDeductions.reduce((sum, d) => sum + d.amount, 0);

  const resetForm = () => {
    setFormData({
      employeeId: '',
      type: 'salary_advance',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      installments: 1,
    });
  };

  const handleAddDeduction = () => {
    if (!formData.employeeId || !formData.amount || !formData.description) {
      toast.error(language === 'pt' ? 'Preencha os campos obrigatórios' : 'Fill in required fields');
      return;
    }
    addDeduction(formData as DeductionFormData);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success(language === 'pt' ? 'Desconto registado com sucesso!' : 'Deduction registered successfully!');
  };

  const handleEditClick = (deduction: Deduction) => {
    // Deductions remain editable (even if applied) to support corrections.
    setEditingDeduction(deduction);
    setFormData({
      employeeId: deduction.employeeId,
      type: deduction.type,
      description: deduction.description,
      amount: deduction.amount,
      date: deduction.date,
      installments: deduction.installments || 1,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateDeduction = async () => {
    if (!editingDeduction) return;
    if (!formData.amount || !formData.description) {
      toast.error(language === 'pt' ? 'Preencha os campos obrigatórios' : 'Fill in required fields');
      return;
    }
    await updateDeduction(editingDeduction.id, {
      employeeId: formData.employeeId,
      type: formData.type as DeductionType,
      description: formData.description,
      amount: formData.amount,
      date: formData.date,
      installments: formData.installments,
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

  const pageTitle = language === 'pt' ? 'Descontos' : 'Deductions';
  const pageSubtitle = language === 'pt' 
    ? 'Adiantamentos salariais, perdas no armazém e outros descontos' 
    : 'Salary advances, warehouse losses and other deductions';
  const addDeductionLabel = language === 'pt' ? 'Novo Desconto' : 'New Deduction';

  const deductionTypes: { value: DeductionType; icon: typeof Wallet }[] = [
    { value: 'salary_advance', icon: Wallet },
    { value: 'warehouse_loss', icon: Package },
    { value: 'loan', icon: Wallet },
    { value: 'disciplinary', icon: Wallet },
    { value: 'other', icon: Wallet },
  ];

  // Inline form fields to avoid re-creating function component on every render (causes focus loss)
  const deductionFormFields = (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label>{language === 'pt' ? 'Funcionário *' : 'Employee *'}</Label>
        <Select 
          value={formData.employeeId} 
          onValueChange={(v) => setFormData(prev => ({ ...prev, employeeId: v }))}
          disabled={!!editingDeduction}
        >
          <SelectTrigger><SelectValue placeholder={language === 'pt' ? 'Seleccione' : 'Select'} /></SelectTrigger>
          <SelectContent>
            {employees.filter(e => e.status === 'active').map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <Label>{language === 'pt' ? 'Valor (AOA) *' : 'Amount (AOA) *'}</Label>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
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
      {(formData.type === 'salary_advance' || formData.type === 'loan') && (
        <div className="space-y-2">
          <Label>{language === 'pt' ? 'Prestações' : 'Installments'}</Label>
          <Select 
            value={String(formData.installments || 1)} 
            onValueChange={(v) => setFormData(prev => ({ ...prev, installments: Number(v) }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
    <MainLayout>
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
                {deductions.filter(d => d.type === 'salary_advance' && !d.isApplied).length}
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
                {deductions.filter(d => d.type === 'warehouse_loss' && !d.isApplied).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'pt' ? 'Aplicados' : 'Applied'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {deductions.filter(d => d.isApplied).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
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
                  <TableHead>{language === 'pt' ? 'Data' : 'Date'}</TableHead>
                  <TableHead className="text-right">{language === 'pt' ? 'Valor' : 'Amount'}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead>{language === 'pt' ? 'Folha' : 'Payroll'}</TableHead>
                  <TableHead className="text-right">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeductions.map((deduction) => {
                  const employee = getEmployee(deduction.employeeId);
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
                      <TableCell>{new Date(deduction.date).toLocaleDateString('pt-AO')}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">
                        {formatAOA(deduction.amount)}
                        {deduction.installments && deduction.installments > 1 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({deduction.currentInstallment}/{deduction.installments})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {deduction.isApplied ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {language === 'pt' ? 'Aplicado' : 'Applied'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t.common.pending}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {deduction.payrollPeriodId ? (
                          <span className="text-sm text-muted-foreground">{getPeriodLabel(deduction.payrollPeriodId)}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
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
            <Button onClick={handleUpdateDeduction} className="w-full">
              {language === 'pt' ? 'Guardar Alterações' : 'Save Changes'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
