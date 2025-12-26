import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar, TrendingUp, Users, DollarSign } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { useBranchStore } from "@/stores/branch-store";
import { toast } from "sonner";

const Reports = () => {
  const { t, language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { periods, entries } = usePayrollStore();
  const { branches } = useBranchStore();

  const generateEmployeeReport = () => {
    if (employees.length === 0) {
      toast.error(language === 'pt' ? 'Nenhum funcionário registado' : 'No employees registered');
      return;
    }

    const headers = ['Nome', 'Nº Funcionário', 'Departamento', 'Cargo', 'Salário Base', 'Status'];
    const rows = employees.map(emp => [
      `${emp.firstName} ${emp.lastName}`,
      emp.employeeNumber,
      emp.department,
      emp.position,
      emp.baseSalary.toLocaleString('pt-AO') + ' AOA',
      emp.status === 'active' ? 'Activo' : 'Inactivo'
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    downloadFile(csv, 'relatorio-funcionarios.csv', 'text/csv');
    toast.success(language === 'pt' ? 'Relatório de funcionários gerado' : 'Employee report generated');
  };

  const generateSalaryReport = () => {
    if (entries.length === 0) {
      toast.error(language === 'pt' ? 'Nenhum processamento salarial encontrado' : 'No payroll data found');
      return;
    }

    const headers = ['Funcionário', 'Salário Base', 'Subsídios', 'Salário Bruto', 'IRT', 'INSS', 'Salário Líquido'];
    const rows = entries.map(entry => [
      entry.employee ? `${entry.employee.firstName} ${entry.employee.lastName}` : entry.employeeId,
      entry.baseSalary.toLocaleString('pt-AO'),
      (entry.transportAllowance + entry.mealAllowance + entry.familyAllowance).toLocaleString('pt-AO'),
      entry.grossSalary.toLocaleString('pt-AO'),
      entry.irt.toLocaleString('pt-AO'),
      entry.inssEmployee.toLocaleString('pt-AO'),
      entry.netSalary.toLocaleString('pt-AO')
    ]);

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    downloadFile(csv, 'relatorio-salarios.csv', 'text/csv');
    toast.success(language === 'pt' ? 'Relatório salarial gerado' : 'Salary report generated');
  };

  const generateCostAnalysis = () => {
    if (entries.length === 0) {
      toast.error(language === 'pt' ? 'Nenhum processamento salarial encontrado' : 'No payroll data found');
      return;
    }

    const totalGross = entries.reduce((sum, e) => sum + e.grossSalary, 0);
    const totalNet = entries.reduce((sum, e) => sum + e.netSalary, 0);
    const totalIRT = entries.reduce((sum, e) => sum + e.irt, 0);
    const totalINSS = entries.reduce((sum, e) => sum + e.inssEmployee + e.inssEmployer, 0);
    const totalEmployerCost = entries.reduce((sum, e) => sum + e.totalEmployerCost, 0);

    const content = `ANÁLISE DE CUSTOS\n${'='.repeat(40)}\n
Total Salários Brutos: ${totalGross.toLocaleString('pt-AO')} AOA
Total Salários Líquidos: ${totalNet.toLocaleString('pt-AO')} AOA
Total IRT: ${totalIRT.toLocaleString('pt-AO')} AOA
Total INSS (Empresa + Trabalhador): ${totalINSS.toLocaleString('pt-AO')} AOA
Custo Total Empresa: ${totalEmployerCost.toLocaleString('pt-AO')} AOA
Número de Funcionários: ${entries.length}
Custo Médio por Funcionário: ${(totalEmployerCost / entries.length).toLocaleString('pt-AO')} AOA`;

    downloadFile(content, 'analise-custos.txt', 'text/plain');
    toast.success(language === 'pt' ? 'Análise de custos gerada' : 'Cost analysis generated');
  };

  const generateHolidayMap = () => {
    if (employees.length === 0) {
      toast.error(language === 'pt' ? 'Nenhum funcionário registado' : 'No employees registered');
      return;
    }

    const headers = ['Nome', 'Data Admissão', 'Dias Trabalhados', 'Férias Acumuladas (dias)'];
    const rows = employees.filter(e => e.status === 'active').map(emp => {
      const hireDate = new Date(emp.hireDate);
      const today = new Date();
      const daysWorked = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24));
      const holidayDays = Math.floor(daysWorked / 365 * 22);
      const fullName = `${emp.firstName} ${emp.lastName}`;
      return [
        fullName,
        new Date(emp.hireDate).toLocaleDateString('pt-AO'),
        daysWorked.toString(),
        holidayDays.toString()
      ];
    });

    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    downloadFile(csv, 'mapa-ferias.csv', 'text/csv');
    toast.success(language === 'pt' ? 'Mapa de férias gerado' : 'Holiday map generated');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const reports = [
    { id: "1", name: t.reports.monthlySalaryReport, description: t.reports.monthlySalaryDesc, icon: DollarSign, type: "CSV", action: generateSalaryReport },
    { id: "2", name: t.reports.employeeReport, description: t.reports.employeeReportDesc, icon: Users, type: "CSV", action: generateEmployeeReport },
    { id: "3", name: t.reports.costAnalysis, description: t.reports.costAnalysisDesc, icon: TrendingUp, type: "TXT", action: generateCostAnalysis },
    { id: "4", name: t.reports.holidayMap, description: t.reports.holidayMapDesc, icon: Calendar, type: "CSV", action: generateHolidayMap },
  ];

  const stats = {
    employees: employees.length,
    activeEmployees: employees.filter(e => e.status === 'active').length,
    branches: branches.length,
    payrollPeriods: periods.length
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.reports.title}</h1>
          <p className="text-muted-foreground mt-1">{t.reports.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <div 
            key={report.id} 
            className="stat-card animate-slide-up hover:shadow-lg cursor-pointer group" 
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={report.action}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-200">
                  <report.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">{report.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{report.type}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">{t.reports.quickStats}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: language === 'pt' ? 'Total Funcionários' : 'Total Employees', value: stats.employees.toString() },
            { label: language === 'pt' ? 'Funcionários Activos' : 'Active Employees', value: stats.activeEmployees.toString() },
            { label: language === 'pt' ? 'Filiais' : 'Branches', value: stats.branches.toString() },
            { label: language === 'pt' ? 'Períodos Processados' : 'Processed Periods', value: stats.payrollPeriods.toString() },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
              <p className="text-sm font-medium text-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
};

export default Reports;
