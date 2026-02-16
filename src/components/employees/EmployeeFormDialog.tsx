import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, User, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { DEPARTMENTS, ANGOLA_BANKS, type Employee, type EmployeeFormData, type ContractType, type PaymentMethod } from '@/types/employee';
import { toast } from 'sonner';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

const defaultFormData: EmployeeFormData = {
  photoUrl: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  dateOfBirth: '',
  nationality: 'Angolana',
  bilheteIdentidade: '',
  nif: '',
  inssNumber: '',
  employeeNumber: '',
  department: '',
  position: '',
  contractType: 'permanent',
  hireDate: new Date().toISOString().split('T')[0],
  baseSalary: 0,
  mealAllowance: 0,
  transportAllowance: 0,
  otherAllowances: 0,
  familyAllowance: 0,
  monthlyBonus: 0,
  holidaySubsidy: 0,
  paymentMethod: 'bank_transfer',
  bankName: '',
  bankAccountNumber: '',
  isRetired: false,
};

export function EmployeeFormDialog({ open, onOpenChange, employee }: EmployeeFormDialogProps) {
  const { t, language } = useLanguage();
  const { addEmployee, updateEmployee } = useEmployeeStore();
  const { branches } = useBranchStore();
  const [formData, setFormData] = useState<EmployeeFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('personal');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        photoUrl: employee.photoUrl || '',
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        address: employee.address,
        dateOfBirth: employee.dateOfBirth,
        nationality: employee.nationality,
        bilheteIdentidade: employee.bilheteIdentidade,
        nif: employee.nif,
        inssNumber: employee.inssNumber,
        employeeNumber: employee.employeeNumber,
        department: employee.department,
        position: employee.position,
        contractType: employee.contractType,
        hireDate: employee.hireDate,
        contractEndDate: employee.contractEndDate,
        baseSalary: employee.baseSalary,
        mealAllowance: employee.mealAllowance,
        transportAllowance: employee.transportAllowance,
        otherAllowances: employee.otherAllowances,
        familyAllowance: employee.familyAllowance || 0,
        monthlyBonus: employee.monthlyBonus || 0,
        holidaySubsidy: employee.holidaySubsidy || 0,
        branchId: employee.branchId,
        paymentMethod: employee.paymentMethod,
        bankName: employee.bankName,
        bankAccountNumber: employee.bankAccountNumber,
        iban: employee.iban,
        isRetired: employee.isRetired,
      });
    } else {
      setFormData(defaultFormData);
    }
    setActiveTab('personal');
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (employee) {
      const result = await updateEmployee(employee.id, formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
    } else {
      const result = await addEmployee(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
    }
    
    toast.success(t.employeeForm.success);
    onOpenChange(false);
  };

  const updateField = <K extends keyof EmployeeFormData>(field: K, value: EmployeeFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter menos de 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateField('photoUrl', base64);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    updateField('photoUrl', '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {employee ? t.employeeForm.editTitle : t.employeeForm.addTitle}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">{t.employeeForm.personalInfo}</TabsTrigger>
              <TabsTrigger value="employment">{t.employeeForm.employmentInfo}</TabsTrigger>
              <TabsTrigger value="compensation">{t.employeeForm.compensation}</TabsTrigger>
              <TabsTrigger value="banking">{t.employeeForm.banking}</TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-4">
              {/* Profile Photo Section */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-primary/20">
                    <AvatarImage src={formData.photoUrl} alt="Foto do funcionário" />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  {formData.photoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <Label className="text-sm font-medium">Foto do Funcionário</Label>
                  <p className="text-xs text-muted-foreground mb-2">JPG, PNG ou GIF. Máximo 2MB.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {formData.photoUrl ? 'Alterar Foto' : 'Carregar Foto'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.employees.firstName}</Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.employees.lastName}</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.employees.email}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.employees.phone}</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.settings.address}</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.employeeForm.dateOfBirth}</Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField('dateOfBirth', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.employeeForm.nationality}</Label>
                  <Input
                    value={formData.nationality}
                    onChange={(e) => updateField('nationality', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.employeeForm.bi}</Label>
                  <Input
                    value={formData.bilheteIdentidade}
                    onChange={(e) => updateField('bilheteIdentidade', e.target.value)}
                    placeholder="000123456LA789"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.employeeForm.nif}</Label>
                  <Input
                    value={formData.nif}
                    onChange={(e) => updateField('nif', e.target.value)}
                    placeholder="5000123456"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.employeeForm.inssNumber}</Label>
                <Input
                  value={formData.inssNumber}
                  onChange={(e) => updateField('inssNumber', e.target.value)}
                  placeholder="INSS-2024-001234"
                />
              </div>
            </TabsContent>

            {/* Employment Tab */}
            <TabsContent value="employment" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'pt' ? 'Filial' : 'Branch'}</Label>
                  <Select
                    value={formData.branchId || ''}
                    onValueChange={(v) => updateField('branchId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'pt' ? 'Selecionar filial' : 'Select branch'} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name} ({branch.city})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.employees.department}</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(v) => updateField('department', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.employees.department} />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.employees.position}</Label>
                <Input
                  value={formData.position}
                  onChange={(e) => updateField('position', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.employees.contract}</Label>
                  <Select
                    value={formData.contractType}
                    onValueChange={(v) => updateField('contractType', v as ContractType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">{t.employees.permanent}</SelectItem>
                      <SelectItem value="fixed_term">{t.employees.fixedTerm}</SelectItem>
                      <SelectItem value="part_time">{t.employees.partTime}</SelectItem>
                      <SelectItem value="probation">{t.employees.probation}</SelectItem>
                      <SelectItem value="colaborador">{t.employees.colaborador}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.employees.hireDate}</Label>
                  <Input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => updateField('hireDate', e.target.value)}
                    required
                  />
                </div>
              </div>

              {formData.contractType === 'fixed_term' && (
                <div className="space-y-2">
                  <Label>{t.employeeForm.contractEndDate}</Label>
                  <Input
                    type="date"
                    value={formData.contractEndDate || ''}
                    onChange={(e) => updateField('contractEndDate', e.target.value)}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isRetired}
                  onCheckedChange={(v) => updateField('isRetired', v)}
                />
                <Label>{t.employeeForm.isRetired}</Label>
              </div>
            </TabsContent>

            {/* Compensation Tab */}
            <TabsContent value="compensation" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.employees.baseSalary} (Kz)</Label>
                  <Input
                    type="number"
                    value={formData.baseSalary}
                    onChange={(e) => updateField('baseSalary', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'pt' ? 'Abono Familiar (Kz)' : 'Family Allowance (Kz)'}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.familyAllowance || 0}
                    onChange={(e) => updateField('familyAllowance', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'pt' ? 'Valor fixo mensal do abono familiar' : 'Fixed monthly family allowance amount'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'pt' ? 'Bónus Mensal (Kz)' : 'Monthly Bonus (Kz)'}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.monthlyBonus || 0}
                    onChange={(e) => updateField('monthlyBonus', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'pt' ? 'Valor fixo do bónus mensal garantido' : 'Fixed guaranteed monthly bonus amount'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'pt' ? 'Subsídio de Férias (Kz)' : 'Holiday Subsidy (Kz)'}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.holidaySubsidy || 0}
                    onChange={(e) => updateField('holidaySubsidy', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    {language === 'pt' ? 'Valor fixo do subsídio de férias (definido por funcionário)' : 'Fixed holiday subsidy amount (per employee)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t.employees.mealAllowance} (Kz)</Label>
                  <Input
                    type="number"
                    value={formData.mealAllowance}
                    onChange={(e) => updateField('mealAllowance', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.employees.transportAllowance} (Kz)</Label>
                  <Input
                    type="number"
                    value={formData.transportAllowance}
                    onChange={(e) => updateField('transportAllowance', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.receipt.otherAllowances} (Kz)</Label>
                  <Input
                    type="number"
                    value={formData.otherAllowances}
                    onChange={(e) => updateField('otherAllowances', Number(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Banking Tab */}
            <TabsContent value="banking" className="space-y-4">
              <div className="space-y-2">
                <Label>{t.employeeForm.paymentMethod}</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(v) => updateField('paymentMethod', v as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">{t.employeeForm.bankTransfer}</SelectItem>
                    <SelectItem value="cash">{t.employeeForm.cash}</SelectItem>
                    <SelectItem value="mobile_money">{t.employeeForm.mobileMoney}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.paymentMethod === 'bank_transfer' && (
                <>
                  <div className="space-y-2">
                    <Label>{t.employees.bank}</Label>
                    <Select
                      value={formData.bankName || ''}
                      onValueChange={(v) => updateField('bankName', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t.employees.bank} />
                      </SelectTrigger>
                      <SelectContent>
                        {ANGOLA_BANKS.map((bank) => (
                          <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{t.employeeForm.bankAccount}</Label>
                    <Input
                      value={formData.bankAccountNumber || ''}
                      onChange={(e) => updateField('bankAccountNumber', e.target.value)}
                      placeholder="0000.0000.0000.0000.0000.0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t.employeeForm.iban}</Label>
                    <Input
                      value={formData.iban || ''}
                      onChange={(e) => updateField('iban', e.target.value)}
                      placeholder="AO00 0000 0000 0000 0000 0000 0"
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit">
              {t.common.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
