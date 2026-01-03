import { cn } from "@/lib/utils";
import { MoreHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEmployeeStore } from "@/stores/employee-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { useBranchStore } from "@/stores/branch-store";
import { useLanguage } from "@/lib/i18n";
import { formatAOA } from "@/lib/angola-labor-law";

export function EmployeeTable() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { periods, entries } = usePayrollStore();
  const { branches } = useBranchStore();
  
  // Get headquarters branch as default filter
  const headquarters = branches.find(b => b.isHeadquarters) || branches[0];
  
  // Derive active employees filtered by headquarters branch
  const activeEmployees = employees.filter(emp => 
    emp.status === 'active' && 
    (!headquarters || emp.branchId === headquarters.id)
  );
  // Derive current period and entries from subscribed state
  const currentPeriod = periods.find(p => p.status === 'calculated' || p.status === 'draft') || periods[periods.length - 1];
  const currentEntries = currentPeriod ? entries.filter(e => e.payrollPeriodId === currentPeriod.id) : [];
  
  // Get status for each employee from payroll
  const getEmployeeStatus = (employeeId: string) => {
    const entry = currentEntries.find(e => e.employeeId === employeeId);
    if (!entry) return 'pending';
    return entry.status === 'paid' ? 'paid' : 'pending';
  };

  const getStatusLabel = (status: string) => {
    if (language === 'pt') {
      return status === 'paid' ? 'Pago' : 'Pendente';
    }
    return status === 'paid' ? 'Paid' : 'Pending';
  };

  // Show only first 5 employees
  const displayEmployees = activeEmployees.slice(0, 5);

  return (
    <div className="animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              {language === 'pt' ? 'Funcionários Recentes' : 'Recent Employees'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === 'pt' ? 'Últimos pagamentos e status' : 'Latest payments and status'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/employees')}>
            {language === 'pt' ? 'Ver todos' : 'View all'}
          </Button>
        </div>
      </div>
      
      {displayEmployees.length === 0 ? (
        <div className="p-12 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">
            {language === 'pt' ? 'Nenhum funcionário' : 'No employees'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'pt' 
              ? 'Adicione funcionários para ver aqui' 
              : 'Add employees to see them here'}
          </p>
          <Button onClick={() => navigate('/employees')}>
            {language === 'pt' ? 'Adicionar Funcionário' : 'Add Employee'}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === 'pt' ? 'Nome' : 'Name'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === 'pt' ? 'Departamento' : 'Department'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === 'pt' ? 'Salário' : 'Salary'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === 'pt' ? 'Ações' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {displayEmployees.map((employee) => {
                const status = getEmployeeStatus(employee.id);
                return (
                  <tr key={employee.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{employee.position || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-foreground">{employee.department || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground font-mono">
                        {formatAOA(employee.baseSalary)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        status === "paid" 
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {getStatusLabel(status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => navigate('/employees')}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}