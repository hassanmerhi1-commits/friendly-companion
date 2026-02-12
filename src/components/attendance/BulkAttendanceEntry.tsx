import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Calculator, Users, AlertTriangle, Search, Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { useBulkAttendanceStore, calculateBulkAttendanceDeduction, calculateFullMonthlySalary, type BulkAttendanceEntry as BulkEntry } from '@/stores/bulk-attendance-store';
import { toast } from 'sonner';

interface LocalEntry {
  employeeId: string;
  absenceDays: number;
  delayHours: number;
}

interface BulkAttendanceEntryProps {
  month: number;
  year: number;
  periodId?: string;
}

export function BulkAttendanceEntry({ month, year, periodId }: BulkAttendanceEntryProps) {
  const { language } = useLanguage();
  const { getActiveEmployees } = useEmployeeStore();
  const { getActiveBranches, getBranch } = useBranchStore();
  const { entries: savedEntries, saveBulkEntries, getEntriesForPeriod, isLoaded, loadEntries, deleteEntry } = useBulkAttendanceStore();
  
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [localEntries, setLocalEntries] = useState<Record<string, LocalEntry>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const branches = getActiveBranches();
  const activeEmployees = getActiveEmployees();

  // Load saved entries when component mounts or month/year changes
  useEffect(() => {
    if (!isLoaded) {
      loadEntries();
    }
  }, [isLoaded, loadEntries]);

  // Initialize local entries from saved data
  useEffect(() => {
    const periodEntries = getEntriesForPeriod(month, year);
    const initial: Record<string, LocalEntry> = {};
    
    periodEntries.forEach(entry => {
      initial[entry.employeeId] = {
        employeeId: entry.employeeId,
        absenceDays: entry.absenceDays,
        delayHours: entry.delayHours,
      };
    });
    
    setLocalEntries(initial);
    setHasChanges(false);
  }, [savedEntries, month, year, getEntriesForPeriod]);

  // Calculate full monthly salary (base + all bonuses) for deduction calculation
  const getFullSalary = (employee: typeof activeEmployees[0]) => {
    return calculateFullMonthlySalary({
      baseSalary: employee.baseSalary,
      mealAllowance: employee.mealAllowance,
      transportAllowance: employee.transportAllowance,
      familyAllowance: employee.familyAllowance,
      monthlyBonus: employee.monthlyBonus,
      holidaySubsidy: employee.holidaySubsidy,
      otherAllowances: employee.otherAllowances,
    });
  };

  // Calculate deduction amounts
  const calculateDeduction = (employee: typeof activeEmployees[0], absenceDays: number, delayHours: number) => {
    const fullMonthlySalary = getFullSalary(employee);
    return calculateBulkAttendanceDeduction(fullMonthlySalary, absenceDays, delayHours);
  };
  
  // Filter employees by branch and search term
  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      const matchesBranch = selectedBranch === 'all' || emp.branchId === selectedBranch;
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const matchesSearch = !searchTerm || 
        fullName.includes(searchTerm.toLowerCase()) ||
        emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesBranch && matchesSearch;
    });
  }, [activeEmployees, selectedBranch, searchTerm]);

  // Get or initialize entry for employee
  const getEntry = (employeeId: string): LocalEntry => {
    return localEntries[employeeId] || { employeeId, absenceDays: 0, delayHours: 0 };
  };

  // Update entry
  const updateEntry = (employeeId: string, field: 'absenceDays' | 'delayHours', value: number) => {
    const newValue = Math.max(0, value); // Ensure non-negative
    const maxValue = field === 'absenceDays' ? 26 : 208; // Max 26 working days or 208 hours (26 days * 8 hours)
    const clampedValue = Math.min(newValue, maxValue);
    
    setLocalEntries(prev => ({
      ...prev,
      [employeeId]: {
        ...getEntry(employeeId),
        [field]: clampedValue,
      },
    }));
    setHasChanges(true);
  };

  // Save all entries to database
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build entries to save with calculated deductions
      const entriesToSave: Omit<BulkEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [];
      const entriesToDelete: string[] = [];
      
      for (const emp of activeEmployees) {
        const entry = localEntries[emp.id];
        const existingEntry = getEntriesForPeriod(month, year).find(e => e.employeeId === emp.id);
        
        // If entry has values > 0, save it
        if (entry && (entry.absenceDays > 0 || entry.delayHours > 0)) {
          const fullSalary = getFullSalary(emp);
          const deduction = calculateBulkAttendanceDeduction(fullSalary, entry.absenceDays, entry.delayHours);
          
          entriesToSave.push({
            employeeId: emp.id,
            month,
            year,
            absenceDays: entry.absenceDays,
            delayHours: entry.delayHours,
            dailyRate: deduction.dailyRate,
            hourlyRate: deduction.hourlyRate,
            absenceDeduction: deduction.absenceDeduction,
            delayDeduction: deduction.delayDeduction,
            totalDeduction: deduction.totalDeduction,
          });
        } 
        // If entry is now 0/0 but previously existed, mark for deletion
        else if (existingEntry && (!entry || (entry.absenceDays === 0 && entry.delayHours === 0))) {
          entriesToDelete.push(existingEntry.id);
        }
      }
      
      // Save entries with values
      await saveBulkEntries(entriesToSave);
      
      // Delete entries that are now zero
      for (const id of entriesToDelete) {
        await deleteEntry(id);
      }
      
      setHasChanges(false);
      
      const totalChanges = entriesToSave.length + entriesToDelete.length;
      toast.success(
        language === 'pt' 
          ? `${totalChanges} registos atualizados com sucesso`
          : `${totalChanges} records updated successfully`
      );
    } catch (error) {
      console.error('[BulkAttendance] Save error:', error);
      toast.error(
        language === 'pt'
          ? 'Erro ao guardar registos'
          : 'Error saving records'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate totals for summary
  const totals = useMemo(() => {
    let totalAbsenceDays = 0;
    let totalDelayHours = 0;
    let totalDeduction = 0;
    
    filteredEmployees.forEach(emp => {
      const entry = getEntry(emp.id);
      const deduction = calculateDeduction(emp, entry.absenceDays, entry.delayHours);
      totalAbsenceDays += entry.absenceDays;
      totalDelayHours += entry.delayHours;
      totalDeduction += deduction.totalDeduction;
    });
    
    return { totalAbsenceDays, totalDelayHours, totalDeduction };
  }, [filteredEmployees, localEntries]);

  const t = {
    title: language === 'pt' ? 'Registo de Ausências e Atrasos' : 'Absence and Delay Entry',
    subtitle: language === 'pt' 
      ? 'Registe os dias de ausência e horas de atraso por funcionário' 
      : 'Record absence days and delay hours per employee',
    periodLabel: language === 'pt' ? 'Período' : 'Period',
    branch: language === 'pt' ? 'Filial' : 'Branch',
    allBranches: language === 'pt' ? 'Todas as Filiais' : 'All Branches',
    search: language === 'pt' ? 'Pesquisar funcionário...' : 'Search employee...',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    fullSalary: language === 'pt' ? 'Salário Total' : 'Full Salary',
    dailyRate: language === 'pt' ? 'Taxa Diária' : 'Daily Rate',
    absenceDays: language === 'pt' ? 'Dias Ausência' : 'Absence Days',
    delayHours: language === 'pt' ? 'Horas Atraso' : 'Delay Hours',
    deduction: language === 'pt' ? 'Desconto' : 'Deduction',
    save: language === 'pt' ? 'Guardar Todos' : 'Save All',
    saving: language === 'pt' ? 'Guardando...' : 'Saving...',
    noEmployees: language === 'pt' ? 'Nenhum funcionário encontrado' : 'No employees found',
    summary: language === 'pt' ? 'Resumo' : 'Summary',
    totalAbsenceDays: language === 'pt' ? 'Total Dias Ausência' : 'Total Absence Days',
    totalDelayHours: language === 'pt' ? 'Total Horas Atraso' : 'Total Delay Hours',
    totalDeduction: language === 'pt' ? 'Total Descontos' : 'Total Deductions',
    formula: language === 'pt' ? 'Fórmula de Cálculo' : 'Calculation Formula',
    formulaDesc: language === 'pt' 
      ? 'Salário Total (base + bónus) ÷ 26 dias úteis = Taxa Diária | Taxa Diária ÷ 8 horas = Taxa Horária'
      : 'Total Salary (base + bonuses) ÷ 26 working days = Daily Rate | Daily Rate ÷ 8 hours = Hourly Rate',
    unsavedChanges: language === 'pt' ? 'Alterações não guardadas' : 'Unsaved changes',
  };

  const monthNames = language === 'pt' 
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Formula explanation card */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Calculator className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">{t.formula}</p>
              <p className="text-sm text-muted-foreground">{t.formulaDesc}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t.title}
              </CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {t.periodLabel}: {monthNames[month - 1]} {year}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <Label>{t.branch}</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allBranches}</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>{t.search}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.search}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Employee table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">{t.employee}</TableHead>
                  <TableHead className="text-right">{t.fullSalary}</TableHead>
                  <TableHead className="text-right">{t.dailyRate}</TableHead>
                  <TableHead className="text-center w-[100px]">{t.absenceDays}</TableHead>
                  <TableHead className="text-center w-[100px]">{t.delayHours}</TableHead>
                  <TableHead className="text-right">{t.deduction}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {t.noEmployees}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map(emp => {
                    const entry = getEntry(emp.id);
                    const fullSalary = getFullSalary(emp);
                    const deduction = calculateDeduction(emp, entry.absenceDays, entry.delayHours);
                    const branchName = emp.branchId ? getBranch(emp.branchId)?.name : undefined;
                    
                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                            <span className="text-xs text-muted-foreground">
                              {emp.employeeNumber}
                              {branchName && ` • ${branchName}`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(fullSalary)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatCurrency(deduction.dailyRate)}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={26}
                            value={entry.absenceDays || ''}
                            onChange={(e) => updateEntry(emp.id, 'absenceDays', parseFloat(e.target.value) || 0)}
                            className="w-20 text-center mx-auto"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={208}
                            step={0.5}
                            value={entry.delayHours || ''}
                            onChange={(e) => updateEntry(emp.id, 'delayHours', parseFloat(e.target.value) || 0)}
                            className="w-20 text-center mx-auto"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {deduction.totalDeduction > 0 ? (
                            <Badge variant="destructive" className="font-mono">
                              -{formatCurrency(deduction.totalDeduction)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          {(totals.totalAbsenceDays > 0 || totals.totalDelayHours > 0) && (
            <Card className="mt-4 bg-destructive/5 border-destructive/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="font-medium">{t.summary}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t.totalAbsenceDays}</span>
                    <p className="font-bold text-lg">{totals.totalAbsenceDays}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.totalDelayHours}</span>
                    <p className="font-bold text-lg">{totals.totalDelayHours}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t.totalDeduction}</span>
                    <p className="font-bold text-lg text-destructive">
                      -{formatCurrency(totals.totalDeduction)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save button */}
          <div className="flex items-center justify-between mt-4">
            {hasChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                {t.unsavedChanges}
              </Badge>
            )}
            <div className="ml-auto">
              <Button 
                onClick={handleSave} 
                disabled={isSaving || !hasChanges}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? t.saving : t.save}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
