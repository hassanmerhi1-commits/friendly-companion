import { useState, useMemo, useRef, useEffect } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ATTENDANCE_PAGE } from "@/lib/page-layout";
import { cn } from "@/lib/utils";
import {
  AttendanceTablePanel,
  ATTENDANCE_TH,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from "@/components/attendance/AttendanceTablePanel";
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
import { EmployeeSearchSelect } from "@/components/EmployeeSearchSelect";
import { SalaryAdjustmentsList } from "@/components/hr/SalaryAdjustmentsList";
import { DisciplinaryRecordDialog } from "@/components/hr/DisciplinaryRecordDialog";
import { DisciplinaryRecordsList } from "@/components/hr/DisciplinaryRecordsList";
import { 
  Calculator, 
  TrendingUp, 
  Users, 
  DollarSign, 
  FileText,
  AlertTriangle,
  Printer,
  BarChart3,
  UserX,
  CheckCircle,
  ArrowRight,
  FileWarning,
  Plus,
  RotateCcw
} from "lucide-react";
import type { TerminationReason } from "@/types/hr";
import { useReactToPrint } from "react-to-print";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

export default function HRDashboard() {
  const { language } = useLanguage();
  const { hasPermission, currentUser } = useAuthStore();
  const { employees } = useEmployeeStore();
  const { periods, entries } = usePayrollStore();
  const { branches } = useBranchStore();
  const { loadHRData, salaryAdjustments, terminations, reverseTermination } = useHRStore();
  const { records: disciplinaryRecords, loadRecords: loadDisciplinaryRecords, getActiveRecordsByEmployee } = useDisciplinaryStore();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [terminationDate, setTerminationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [terminationReason, setTerminationReason] = useState<TerminationReason>('voluntary');
  const [unusedLeaveDays, setUnusedLeaveDays] = useState<number>(0);
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [showDisciplinaryDialog, setShowDisciplinaryDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "termination" | "disciplinary" | "adjustments" | "history" | "comparison"
  >("termination");

  const pt = language === "pt";
  
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

  const tabItems = [
    { id: "termination" as const, icon: UserX, label: pt ? "Rescisão" : "Termination" },
    {
      id: "disciplinary" as const,
      icon: FileWarning,
      label: pt ? "Disciplinar" : "Disciplinary",
      badge: stats.activeDisciplinary > 0 ? stats.activeDisciplinary : undefined,
      badgeVariant: "destructive" as const,
    },
    {
      id: "adjustments" as const,
      icon: TrendingUp,
      label: pt ? "Ajustes" : "Adjustments",
      badge: stats.pendingAdjustments > 0 ? stats.pendingAdjustments : undefined,
    },
    { id: "history" as const, icon: FileText, label: pt ? "Histórico" : "History" },
    { id: "comparison" as const, icon: BarChart3, label: pt ? "Comparação" : "Comparison" },
  ];

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-2`}>
        {/* Toolbar */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold shrink-0">{pt ? "Painel RH" : "HR Panel"}</span>

          <div className="flex flex-wrap items-center gap-1 bg-muted/40 rounded-lg p-0.5">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge !== undefined && (
                    <Badge
                      variant={tab.badgeVariant || "secondary"}
                      className="h-4 px-1 text-[10px] min-w-[16px] justify-center"
                    >
                      {tab.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {activeTab === "disciplinary" && hasPermission("hr.create") && (
              <Button size="sm" className="h-8 text-xs" onClick={() => setShowDisciplinaryDialog(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {pt ? "Novo registo" : "New record"}
              </Button>
            )}
            {activeTab === "history" && salaryHistory && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handlePrintHistory()}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                {pt ? "Imprimir" : "Print"}
              </Button>
            )}
            {activeTab === "comparison" && salaryComparison.length > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handlePrintComparison()}>
                <Printer className="h-3.5 w-3.5 mr-1" />
                {pt ? "Imprimir" : "Print"}
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: pt ? "Colaboradores" : "Employees", value: String(stats.totalEmployees) },
            { label: pt ? "Tempo médio" : "Avg tenure", value: `${stats.avgTenure.toFixed(1)}a` },
            { label: pt ? "Salário médio" : "Avg salary", value: formatAOA(stats.avgSalary) },
            {
              label: pt ? "Contratos" : "Contracts",
              value: String(stats.contractsEndingSoon.length),
              highlight: stats.contractsEndingSoon.length > 0,
            },
            {
              label: pt ? "Ajustes pend." : "Pending adj.",
              value: String(stats.pendingAdjustments),
              highlight: stats.pendingAdjustments > 0,
            },
            {
              label: pt ? "Disciplinar" : "Disciplinary",
              value: String(stats.activeDisciplinary),
              highlight: stats.activeDisciplinary > 0,
            },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border/50 bg-card px-3 py-2">
              <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
              <p className={cn("text-sm font-semibold truncate", kpi.highlight && "text-amber-600")}>
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tab panel — only this area scrolls */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
          <div className="flex-1 min-h-0 overflow-auto overscroll-contain p-3">
          {activeTab === "termination" && (
            <div className="space-y-3">
            {stats.contractsEndingSoon.length > 0 && (
              <AttendanceTablePanel
                toolbar={
                  <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-orange-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {pt ? "Contratos a expirar (90 dias)" : "Contracts expiring (90 days)"}
                  </div>
                }
              >
                <table className="w-full min-w-[600px]">
                  <thead className={ATTENDANCE_THEAD}>
                    <tr>
                      <th className={ATTENDANCE_TH}>{pt ? "Colaborador" : "Employee"}</th>
                      <th className={ATTENDANCE_TH}>{pt ? "Cargo" : "Position"}</th>
                      <th className={ATTENDANCE_TH}>{pt ? "Filial" : "Branch"}</th>
                      <th className={ATTENDANCE_TH}>{pt ? "Fim" : "End"}</th>
                      <th className={ATTENDANCE_TH_RIGHT}>{pt ? "Dias" : "Days"}</th>
                    </tr>
                  </thead>
                  <tbody className={ATTENDANCE_TBODY}>
                    {stats.contractsEndingSoon.map((emp) => {
                      const daysLeft = Math.ceil(
                        (new Date(emp.contractEndDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                      );
                      return (
                        <tr key={emp.id} className="hover:bg-muted/20">
                          <td className={`${ATTENDANCE_TD} text-sm font-medium`}>
                            {emp.firstName} {emp.lastName}
                          </td>
                          <td className={`${ATTENDANCE_TD} text-xs`}>{emp.position}</td>
                          <td className={`${ATTENDANCE_TD} text-xs`}>{getBranchName(emp.branchId || "")}</td>
                          <td className={`${ATTENDANCE_TD} text-xs`}>
                            {new Date(emp.contractEndDate!).toLocaleDateString()}
                          </td>
                          <td className={`${ATTENDANCE_TD} text-right`}>
                            <Badge variant={daysLeft <= 30 ? "destructive" : "secondary"} className="text-[10px]">
                              {daysLeft}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </AttendanceTablePanel>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    {pt ? "Dados da Rescisão" : "Termination Data"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{pt ? "Colaborador" : "Employee"}</Label>
                    <EmployeeSearchSelect
                      employees={activeEmployees}
                      value={selectedEmployeeId}
                      onSelect={setSelectedEmployeeId}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">{pt ? "Data de Rescisão" : "Termination Date"}</Label>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={terminationDate}
                      onChange={(e) => setTerminationDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">{pt ? "Motivo da Rescisão" : "Termination Reason"}</Label>
                    <Select
                      value={terminationReason}
                      onValueChange={(v: TerminationReason) => setTerminationReason(v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                        <SelectItem value="mutual_agreement">
                          {language === 'pt' ? 'Acordo Mútuo' : 'Mutual Agreement'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">{pt ? "Férias não gozadas" : "Unused leave days"}</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8 text-xs"
                      value={unusedLeaveDays}
                      onChange={(e) => setUnusedLeaveDays(parseInt(e.target.value) || 0)}
                    />
                  </div>

                  {selectedEmployee && (
                    <div className="pt-3 border-t space-y-1.5">
                      <h4 className="text-xs font-medium">{pt ? "Dados do colaborador" : "Employee data"}</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
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

              <Card className="shadow-sm">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {pt ? "Pacote de Rescisão" : "Termination Package"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
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
                        className="w-full h-8 text-xs"
                        onClick={() => {
                          if (!hasPermission("hr.edit")) {
                            toast.error(pt ? "Sem permissão para processar rescisões" : "No permission to process terminations");
                            return;
                          }
                          setShowTerminationDialog(true);
                        }}
                        disabled={!hasPermission("hr.edit")}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        {pt ? "Processar Rescisão" : "Process Termination"}
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
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

            {/* Terminated Employees - Reactivate */}
            {(() => {
              const terminatedEmployees = employees.filter(e => e.status === 'terminated');
              if (terminatedEmployees.length === 0) return null;
              
              const handleReactivate = async (emp: typeof terminatedEmployees[0]) => {
                if (!hasPermission('hr.edit')) {
                  toast.error(language === 'pt' ? 'Sem permissão' : 'No permission');
                  return;
                }
                const result = await reverseTermination(emp.id, currentUser?.name || 'System');
                if (result.success) {
                  toast.success(language === 'pt' 
                    ? `${emp.firstName} ${emp.lastName} reactivado com sucesso!` 
                    : `${emp.firstName} ${emp.lastName} reactivated successfully!`
                  );
                } else {
                  toast.error(result.error || 'Error');
                }
              };
              
              return (
                <Card className="shadow-sm">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserX className="h-4 w-4 text-destructive" />
                      {pt ? "Colaboradores Desligados" : "Terminated Employees"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{language === 'pt' ? 'Nome' : 'Name'}</TableHead>
                          <TableHead>{language === 'pt' ? 'Cargo' : 'Position'}</TableHead>
                          <TableHead>{language === 'pt' ? 'Data Rescisão' : 'Termination Date'}</TableHead>
                          <TableHead>{language === 'pt' ? 'Motivo' : 'Reason'}</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {terminatedEmployees.map(emp => {
                          const termRecord = terminations.find(t => t.employeeId === emp.id);
                          const reasonLabels: Record<string, string> = {
                            voluntary: language === 'pt' ? 'Voluntária' : 'Voluntary',
                            dismissal: language === 'pt' ? 'Despedimento' : 'Dismissal',
                            contract_end: language === 'pt' ? 'Fim Contrato' : 'Contract End',
                            retirement: language === 'pt' ? 'Reforma' : 'Retirement',
                            mutual_agreement: language === 'pt' ? 'Acordo Mútuo' : 'Mutual Agreement',
                          };
                          return (
                            <TableRow key={emp.id}>
                              <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                              <TableCell>{emp.position}</TableCell>
                              <TableCell>
                                {termRecord 
                                  ? new Date(termRecord.terminationDate).toLocaleDateString() 
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {termRecord ? (reasonLabels[termRecord.reason] || termRecord.reason) : '-'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleReactivate(emp)}
                                  disabled={!hasPermission('hr.edit')}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  {language === 'pt' ? 'Reactivar' : 'Reactivate'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })()}
            </div>
          )}

          {activeTab === "disciplinary" && <DisciplinaryRecordsList />}

          {activeTab === "adjustments" && <SalaryAdjustmentsList />}

          {activeTab === "history" && (
            <div className="space-y-3">
              <div className="max-w-md">
                <Label className="text-xs mb-1.5 block">{pt ? "Colaborador" : "Employee"}</Label>
                <EmployeeSearchSelect
                  employees={employees}
                  value={selectedEmployeeId}
                  onSelect={setSelectedEmployeeId}
                />
              </div>
              {salaryHistory ? (
                <div ref={historyReportRef}>
                  <EmployeeSalaryHistoryReport history={salaryHistory} language={language} />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>{pt ? "Selecione um colaborador para ver o histórico" : "Select an employee to view history"}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "comparison" && (
            salaryComparison.length > 0 ? (
              <div ref={comparisonReportRef}>
                <SalaryComparisonReport comparisons={salaryComparison} year={currentYear} language={language} />
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>{pt ? "Sem dados para comparação" : "No data for comparison"}</p>
              </div>
            )
          )}
          </div>
        </div>
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
    </TopNavLayout>
  );
}
