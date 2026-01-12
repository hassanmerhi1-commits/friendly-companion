import { useState, useMemo, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmployeeStore } from "@/stores/employee-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { useBranchStore } from "@/stores/branch-store";
import { useHRStore } from "@/stores/hr-store";
import { useDisciplinaryStore, initDisciplinaryStoreSync } from "@/stores/disciplinary-store";
import { useLanguage } from "@/lib/i18n";
import { formatAOA } from "@/lib/angola-labor-law";
import { buildEmployeeSalaryHistory, buildSalaryComparison, calculateTerminationPackage } from "@/lib/salary-history";
import { EmployeeSalaryHistoryReport } from "@/components/reports/EmployeeSalaryHistoryReport";
import { SalaryComparisonReport } from "@/components/reports/SalaryComparisonReport";
import { TerminationDialog } from "@/components/hr/TerminationDialog";
import { SalaryAdjustmentsList } from "@/components/hr/SalaryAdjustmentsList";
import { DisciplinaryRecordDialog } from "@/components/hr/DisciplinaryRecordDialog";
import { DisciplinaryRecordsList } from "@/components/hr/DisciplinaryRecordsList";
import { 
  Calculator, 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  Calendar,
  FileText,
  AlertTriangle,
  Printer,
  BarChart3,
  UserX,
  CheckCircle,
  ArrowRight,
  FileWarning,
  Plus
} from "lucide-react";
import { useReactToPrint } from "react-to-print";

export default function HRDashboard() {
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { periods, entries } = usePayrollStore();
  const { branches } = useBranchStore();
  const { loadHRData, salaryAdjustments } = useHRStore();
  const { records: disciplinaryRecords, loadRecords: loadDisciplinaryRecords, getActiveRecordsByEmployee } = useDisciplinaryStore();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [terminationDate, setTerminationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [terminationReason, setTerminationReason] = useState<'voluntary' | 'dismissal' | 'contract_end' | 'retirement'>('voluntary');
  const [unusedLeaveDays, setUnusedLeaveDays] = useState<number>(0);
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [showDisciplinaryDialog, setShowDisciplinaryDialog] = useState(false);
  
  const historyReportRef = useRef<HTMLDivElement>(null);
  const comparisonReportRef = useRef<HTMLDivElement>(null);

  // Load HR data on mount
  useEffect(() => {
    loadHRData();
    loadDisciplinaryRecords();
    const unsubscribe = initDisciplinaryStoreSync();
    return () => unsubscribe?.();
  }, [loadHRData, loadDisciplinaryRecords]);

  const handlePrintHistory = useReactToPrint({
    contentRef: historyReportRef,
  });

  const handlePrintComparison = useReactToPrint({
    contentRef: comparisonReportRef,
  });

  const activeEmployees = employees.filter(e => e.status === 'active');
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  // Build salary history for selected employee
  const salaryHistory = useMemo(() => {
    if (!selectedEmployee) return null;
    return buildEmployeeSalaryHistory(selectedEmployee, entries, periods);
  }, [selectedEmployee, entries, periods]);

  // Build salary comparison for all employees
  const currentYear = new Date().getFullYear();
  const salaryComparison = useMemo(() => {
    return buildSalaryComparison(employees, entries, periods, currentYear);
  }, [employees, entries, periods, currentYear]);

  // Calculate termination package
  const terminationPackage = useMemo(() => {
    if (!selectedEmployee) return null;
    return calculateTerminationPackage(
      selectedEmployee, 
      entries, 
      periods, 
      terminationDate, 
      terminationReason,
      unusedLeaveDays
    );
  }, [selectedEmployee, entries, periods, terminationDate, terminationReason, unusedLeaveDays]);

  // Dashboard stats
  const stats = useMemo(() => {
    const totalEmployees = activeEmployees.length;
    const avgTenure = activeEmployees.reduce((sum, emp) => {
      const hireDate = new Date(emp.hireDate);
      const years = (Date.now() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      return sum + years;
    }, 0) / (totalEmployees || 1);
    
    const avgSalary = activeEmployees.reduce((sum, emp) => sum + emp.baseSalary, 0) / (totalEmployees || 1);
    
    const contractsEndingSoon = activeEmployees.filter(emp => {
      if (emp.contractType !== 'fixed_term' || !emp.contractEndDate) return false;
      const endDate = new Date(emp.contractEndDate);
      const daysUntilEnd = (endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      return daysUntilEnd > 0 && daysUntilEnd <= 90;
    });
    
    const pendingAdjustments = salaryAdjustments.filter(a => a.status === 'pending').length;
    const activeDisciplinary = disciplinaryRecords.filter(r => r.status === 'pendente' || r.status === 'escalado').length;

    return { totalEmployees, avgTenure, avgSalary, contractsEndingSoon, pendingAdjustments, activeDisciplinary };
  }, [activeEmployees, salaryAdjustments, disciplinaryRecords]);

  const getBranchName = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || '-';
  };

  const handleTerminationSuccess = () => {
    // Reset form after successful termination
    setSelectedEmployeeId("");
    setUnusedLeaveDays(0);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {language === 'pt' ? 'Painel de RH' : 'HR Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'pt' 
                ? 'Gestão de recursos humanos e análise financeira de colaboradores' 
                : 'Human resources management and employee financial analysis'}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'pt' ? 'Total Colaboradores' : 'Total Employees'}
                  </p>
                  <p className="text-2xl font-bold">{stats.totalEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'pt' ? 'Tempo Médio (Anos)' : 'Avg Tenure (Years)'}
                  </p>
                  <p className="text-2xl font-bold">{stats.avgTenure.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'pt' ? 'Salário Médio' : 'Avg Salary'}
                  </p>
                  <p className="text-2xl font-bold">{formatAOA(stats.avgSalary)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'pt' ? 'Contratos a Expirar' : 'Expiring Contracts'}
                  </p>
                  <p className="text-2xl font-bold">{stats.contractsEndingSoon.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'pt' ? 'Ajustes Pendentes' : 'Pending Adjustments'}
                  </p>
                  <p className="text-2xl font-bold">{stats.pendingAdjustments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts Expiring Soon Alert */}
        {stats.contractsEndingSoon.length > 0 && (
          <Card className="border-orange-500/50 bg-orange-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                {language === 'pt' ? 'Contratos a Expirar nos Próximos 90 Dias' : 'Contracts Expiring in Next 90 Days'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'pt' ? 'Colaborador' : 'Employee'}</TableHead>
                    <TableHead>{language === 'pt' ? 'Cargo' : 'Position'}</TableHead>
                    <TableHead>{language === 'pt' ? 'Filial' : 'Branch'}</TableHead>
                    <TableHead>{language === 'pt' ? 'Data de Fim' : 'End Date'}</TableHead>
                    <TableHead>{language === 'pt' ? 'Dias Restantes' : 'Days Left'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.contractsEndingSoon.map(emp => {
                    const daysLeft = Math.ceil((new Date(emp.contractEndDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                        <TableCell>{emp.position}</TableCell>
                        <TableCell>{getBranchName(emp.branchId || '')}</TableCell>
                        <TableCell>{new Date(emp.contractEndDate!).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={daysLeft <= 30 ? "destructive" : "secondary"}>
                            {daysLeft} {language === 'pt' ? 'dias' : 'days'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="termination" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="termination" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              {language === 'pt' ? 'Rescisão' : 'Termination'}
            </TabsTrigger>
            <TabsTrigger value="disciplinary" className="flex items-center gap-2">
              <FileWarning className="h-4 w-4" />
              {language === 'pt' ? 'Disciplinar' : 'Disciplinary'}
              {stats.activeDisciplinary > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {stats.activeDisciplinary}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {language === 'pt' ? 'Ajustes Salariais' : 'Salary Adjustments'}
              {stats.pendingAdjustments > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {stats.pendingAdjustments}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {language === 'pt' ? 'Histórico' : 'History'}
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {language === 'pt' ? 'Comparação' : 'Comparison'}
            </TabsTrigger>
          </TabsList>

          {/* Termination Calculator Tab */}
          <TabsContent value="termination" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    {language === 'pt' ? 'Dados da Rescisão' : 'Termination Data'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'pt' 
                      ? 'Preencha os dados para calcular o pacote de rescisão' 
                      : 'Fill in the data to calculate the termination package'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{language === 'pt' ? 'Colaborador' : 'Employee'}</Label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'pt' ? 'Selecionar colaborador...' : 'Select employee...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} - {emp.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'pt' ? 'Data de Rescisão' : 'Termination Date'}</Label>
                    <Input 
                      type="date" 
                      value={terminationDate}
                      onChange={(e) => setTerminationDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'pt' ? 'Motivo da Rescisão' : 'Termination Reason'}</Label>
                    <Select 
                      value={terminationReason} 
                      onValueChange={(v: typeof terminationReason) => setTerminationReason(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="voluntary">
                          {language === 'pt' ? 'Demissão Voluntária' : 'Voluntary Resignation'}
                        </SelectItem>
                        <SelectItem value="dismissal">
                          {language === 'pt' ? 'Despedimento' : 'Dismissal'}
                        </SelectItem>
                        <SelectItem value="contract_end">
                          {language === 'pt' ? 'Fim de Contrato' : 'Contract End'}
                        </SelectItem>
                        <SelectItem value="retirement">
                          {language === 'pt' ? 'Reforma' : 'Retirement'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{language === 'pt' ? 'Dias de Férias Não Gozadas' : 'Unused Leave Days'}</Label>
                    <Input 
                      type="number" 
                      min="0"
                      value={unusedLeaveDays}
                      onChange={(e) => setUnusedLeaveDays(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  {selectedEmployee && (
                    <div className="pt-4 border-t space-y-2">
                      <h4 className="font-medium">{language === 'pt' ? 'Dados do Colaborador' : 'Employee Data'}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-muted-foreground">{language === 'pt' ? 'Salário Base:' : 'Base Salary:'}</div>
                        <div className="font-medium">{formatAOA(selectedEmployee.baseSalary)}</div>
                        <div className="text-muted-foreground">{language === 'pt' ? 'Data de Admissão:' : 'Hire Date:'}</div>
                        <div className="font-medium">{new Date(selectedEmployee.hireDate).toLocaleDateString()}</div>
                        <div className="text-muted-foreground">{language === 'pt' ? 'Anos de Serviço:' : 'Years of Service:'}</div>
                        <div className="font-medium">
                          {((Date.now() - new Date(selectedEmployee.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Results */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {language === 'pt' ? 'Pacote de Rescisão' : 'Termination Package'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {terminationPackage ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            {language === 'pt' ? 'Anos de Serviço' : 'Years of Service'}
                          </p>
                          <p className="text-xl font-bold">{terminationPackage.yearsOfService.toFixed(1)}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            {language === 'pt' ? 'Período de Aviso' : 'Notice Period'}
                          </p>
                          <p className="text-xl font-bold">{terminationPackage.noticePeriodDays} {language === 'pt' ? 'dias' : 'days'}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between py-2 border-b">
                          <span>{language === 'pt' ? 'Indemnização' : 'Severance'}</span>
                          <span className="font-medium">{formatAOA(terminationPackage.severancePay)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span>{language === 'pt' ? 'Férias Proporcionais' : 'Proportional Leave'}</span>
                          <span className="font-medium">{formatAOA(terminationPackage.proportionalLeave)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span>{language === 'pt' ? '13º Proporcional' : 'Proportional 13th'}</span>
                          <span className="font-medium">{formatAOA(terminationPackage.proportional13th)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span>{language === 'pt' ? 'Subsídio de Férias' : 'Holiday Subsidy'}</span>
                          <span className="font-medium">{formatAOA(terminationPackage.proportionalHolidaySubsidy)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span>{language === 'pt' ? 'Compensação de Aviso' : 'Notice Compensation'}</span>
                          <span className="font-medium">{formatAOA(terminationPackage.noticeCompensation)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span>{language === 'pt' ? 'Férias Não Gozadas' : 'Unused Leave'}</span>
                          <span className="font-medium">{formatAOA(terminationPackage.unusedLeaveCompensation)}</span>
                        </div>
                      </div>

                      <div className="p-4 bg-primary/10 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-medium">
                            {language === 'pt' ? 'TOTAL A PAGAR' : 'TOTAL TO PAY'}
                          </span>
                          <span className="text-2xl font-bold text-primary">
                            {formatAOA(terminationPackage.totalPackage)}
                          </span>
                        </div>
                      </div>

                      {/* Process Termination Button */}
                      <Button 
                        className="w-full" 
                        size="lg"
                        onClick={() => setShowTerminationDialog(true)}
                      >
                        <CheckCircle className="h-5 w-5 mr-2" />
                        {language === 'pt' ? 'Processar Rescisão' : 'Process Termination'}
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </Button>

                      <div className="text-xs text-muted-foreground text-center">
                        {language === 'pt' 
                          ? '* Valores calculados com base na Lei Geral do Trabalho de Angola' 
                          : '* Values calculated based on Angola General Labor Law'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{language === 'pt' ? 'Selecione um colaborador para calcular' : 'Select an employee to calculate'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Disciplinary Records Tab */}
          <TabsContent value="disciplinary" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileWarning className="h-5 w-5 text-destructive" />
                    {language === 'pt' ? 'Registos Disciplinares' : 'Disciplinary Records'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'pt' 
                      ? 'Advertências, suspensões e processos disciplinares' 
                      : 'Warnings, suspensions and disciplinary processes'}
                  </CardDescription>
                </div>
                <Button onClick={() => setShowDisciplinaryDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'pt' ? 'Novo Registo' : 'New Record'}
                </Button>
              </CardHeader>
              <CardContent>
                <DisciplinaryRecordsList />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salary Adjustments Tab */}
          <TabsContent value="adjustments" className="space-y-4">
            <SalaryAdjustmentsList />
          </TabsContent>

          {/* Salary History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {language === 'pt' ? 'Histórico Salarial Individual' : 'Individual Salary History'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'pt' 
                      ? 'Visualize o histórico completo de pagamentos de um colaborador' 
                      : 'View the complete payment history of an employee'}
                  </CardDescription>
                </div>
                {salaryHistory && (
                  <Button onClick={() => handlePrintHistory()} variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    {language === 'pt' ? 'Imprimir' : 'Print'}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder={language === 'pt' ? 'Selecionar colaborador...' : 'Select employee...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {salaryHistory ? (
                  <div ref={historyReportRef}>
                    <EmployeeSalaryHistoryReport 
                      history={salaryHistory} 
                      language={language} 
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'pt' ? 'Selecione um colaborador para ver o histórico' : 'Select an employee to view history'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salary Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {language === 'pt' ? 'Comparação Salarial Anual' : 'Annual Salary Comparison'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'pt' 
                      ? `Comparação de salários entre ${currentYear - 1} e ${currentYear}` 
                      : `Salary comparison between ${currentYear - 1} and ${currentYear}`}
                  </CardDescription>
                </div>
                {salaryComparison.length > 0 && (
                  <Button onClick={() => handlePrintComparison()} variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-2" />
                    {language === 'pt' ? 'Imprimir' : 'Print'}
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {salaryComparison.length > 0 ? (
                  <div ref={comparisonReportRef}>
                    <SalaryComparisonReport 
                      comparisons={salaryComparison} 
                      year={currentYear}
                      language={language} 
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{language === 'pt' ? 'Sem dados para comparação' : 'No data for comparison'}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Termination Dialog */}
      {selectedEmployee && terminationPackage && (
        <TerminationDialog
          open={showTerminationDialog}
          onOpenChange={setShowTerminationDialog}
          employee={selectedEmployee}
          terminationDate={terminationDate}
          terminationReason={terminationReason}
          unusedLeaveDays={unusedLeaveDays}
          terminationPackage={terminationPackage}
          onSuccess={handleTerminationSuccess}
        />
      )}

      {/* Disciplinary Record Dialog */}
      <DisciplinaryRecordDialog
        open={showDisciplinaryDialog}
        onOpenChange={setShowDisciplinaryDialog}
      />
    </MainLayout>
  );
}
