import { useState, useRef } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Filter, MoreHorizontal, Pencil, Trash2, FileDown, CreditCard, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { useBranchStore } from "@/stores/branch-store";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { PrintableEmployeeCard } from "@/components/employees/PrintableEmployeeCard";
import { formatAOA } from "@/lib/angola-labor-law";
import { exportEmployeesToCSV } from "@/lib/export-utils";
import type { Employee } from "@/types/employee";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useReactToPrint } from "react-to-print";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

type SortField = 'name' | 'department' | 'branch' | 'salary' | 'hireDate';
type SortOrder = 'asc' | 'desc';

const Employees = () => {
  const { t, language } = useLanguage();
  const { employees, deleteEmployee } = useEmployeeStore();
  const { branches: allBranches } = useBranchStore();
  // Derive active branches from subscribed state - ensures re-render on changes
  const branches = allBranches.filter(b => b.isActive);
  const [search, setSearch] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [employeeForCard, setEmployeeForCard] = useState<Employee | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Get branch name helper for sorting
  const getBranchNameForSort = (branchId?: string) => {
    if (!branchId) return '';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : '';
  };

  const filteredAndSortedEmployees = employees
    .filter(emp => {
      const matchesSearch = emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.department.toLowerCase().includes(search.toLowerCase());
      
      const matchesBranch = selectedBranchFilter === 'all' || emp.branchId === selectedBranchFilter;
      
      return matchesSearch && matchesBranch;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case 'department':
          comparison = (a.department || '').localeCompare(b.department || '');
          break;
        case 'branch':
          comparison = getBranchNameForSort(a.branchId).localeCompare(getBranchNameForSort(b.branchId));
          break;
        case 'salary':
          comparison = a.baseSalary - b.baseSalary;
          break;
        case 'hireDate':
          comparison = new Date(a.hireDate || 0).getTime() - new Date(b.hireDate || 0).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getBranchName = (branchId?: string) => {
    if (!branchId) return '-';
    const branch = branches.find(b => b.id === branchId);
    return branch ? `${branch.name}` : '-';
  };

  function getStatusLabel(status: Employee["status"]): string {
    const labels = {
      active: t.common.active,
      inactive: t.common.inactive,
      on_leave: t.common.onLeave,
      terminated: t.common.inactive,
    };
    return labels[status];
  }

  function getContractLabel(contract: Employee["contractType"]): string {
    const labels = {
      permanent: t.employees.permanent,
      fixed_term: t.employees.fixedTerm,
      part_time: t.employees.partTime,
      probation: t.employees.probation,
    };
    return labels[contract];
  }

  const handleEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setSelectedEmployee(null);
    setFormOpen(true);
  };

  const handleDeleteClick = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (employeeToDelete) {
      deleteEmployee(employeeToDelete.id);
      toast.success(t.employeeForm.deleted);
    }
    setDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

  const handleExport = () => {
    exportEmployeesToCSV(employees, language);
    toast.success(t.export.success);
  };

  const handlePrintCard = (emp: Employee) => {
    setEmployeeForCard(emp);
    setCardDialogOpen(true);
  };

  const handlePrint = useReactToPrint({
    contentRef: cardRef,
    documentTitle: employeeForCard ? `Cartao-${employeeForCard.firstName}-${employeeForCard.lastName}` : 'Cartao-Funcionario',
  });

  return (
    <TopNavLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            {t.employees.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.employees.subtitle}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-2" />
            {t.export.excel}
          </Button>
          <Button variant="accent" size="lg" onClick={handleAdd}>
            <UserPlus className="h-5 w-5 mr-2" />
            {t.employees.addEmployee}
          </Button>
        </div>
      </div>

      {/* Search, Filters and Sorting */}
      <div className="flex flex-wrap items-center gap-4 mb-6 animate-slide-up">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t.employees.searchPlaceholder}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder={language === 'pt' ? 'Filtrar por filial' : 'Filter by branch'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'pt' ? 'Todas as filiais' : 'All branches'}</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name} ({branch.city})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Sort by field */}
        <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
          <SelectTrigger className="w-[180px]">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder={language === 'pt' ? 'Ordenar por' : 'Sort by'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{language === 'pt' ? 'Nome' : 'Name'}</SelectItem>
            <SelectItem value="department">{language === 'pt' ? 'Departamento' : 'Department'}</SelectItem>
            <SelectItem value="branch">{language === 'pt' ? 'Filial' : 'Branch'}</SelectItem>
            <SelectItem value="salary">{language === 'pt' ? 'Salário' : 'Salary'}</SelectItem>
            <SelectItem value="hireDate">{language === 'pt' ? 'Data de Admissão' : 'Hire Date'}</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Sort order toggle */}
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          title={sortOrder === 'asc' 
            ? (language === 'pt' ? 'Ascendente (A-Z, 1-9)' : 'Ascending (A-Z, 1-9)') 
            : (language === 'pt' ? 'Descendente (Z-A, 9-1)' : 'Descending (Z-A, 9-1)')}
        >
          {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Employee Table */}
      <div className="stat-card p-0 overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.employees.employee}
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.branches?.title || 'Filial'}
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.employees.department}
                </th>
                <th className="px-4 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.employees.baseSalary}
                </th>
                <th className="px-4 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.employees.mealAllowance}
                </th>
                <th className="px-4 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.employees.transportAllowance}
                </th>
                <th className="px-4 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {t.payroll?.familyAllowance || 'Abono Fam.'}
                </th>
                <th className="px-4 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.payroll?.bonus || 'Bónus'}
                </th>
                <th className="px-4 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider bg-primary/5">
                  {t.payroll?.totalEarnings || 'Total'}
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.employees.contract}
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.common.status}
                </th>
                <th className="px-4 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAndSortedEmployees.map((employee) => {
                const totalComp = (employee.baseSalary || 0) + 
                  (employee.mealAllowance || 0) + 
                  (employee.transportAllowance || 0) + 
                  (employee.familyAllowance || 0) + 
                  (employee.monthlyBonus || 0) +
                  (employee.otherAllowances || 0);
                
                return (
                  <tr key={employee.id} className="table-row-hover">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-accent">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-foreground text-sm">{getBranchName(employee.branchId)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-foreground text-sm">{employee.department}</p>
                        <p className="text-xs text-muted-foreground">{employee.position}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-medium text-foreground text-sm font-mono">
                        {formatAOA(employee.baseSalary)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-mono text-muted-foreground">
                        {employee.mealAllowance ? formatAOA(employee.mealAllowance) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-mono text-muted-foreground">
                        {employee.transportAllowance ? formatAOA(employee.transportAllowance) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-mono text-muted-foreground">
                        {employee.familyAllowance ? formatAOA(employee.familyAllowance) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-mono text-muted-foreground">
                        {employee.monthlyBonus ? formatAOA(employee.monthlyBonus) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right bg-primary/5">
                      <span className="font-semibold text-primary text-sm font-mono">
                        {formatAOA(totalComp)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-foreground text-sm">
                        {getContractLabel(employee.contractType)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "badge-status",
                        employee.status === "active" && "badge-paid",
                        employee.status === "inactive" && "badge-overdue",
                        employee.status === "on_leave" && "badge-pending",
                        employee.status === "terminated" && "badge-overdue"
                      )}>
                        {getStatusLabel(employee.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(employee)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t.common.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrintCard(employee)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            {t.nav?.idCards || 'Cartão ID'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(employee)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t.common.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">
            {t.common.showing} <span className="font-medium">1-{filteredAndSortedEmployees.length}</span> {t.common.of} <span className="font-medium">{employees.length}</span> {t.employees.title.toLowerCase()}
          </p>
        </div>
      </div>

      {/* Form Dialog */}
      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={selectedEmployee}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.delete}?</AlertDialogTitle>
            <AlertDialogDescription>
              {employeeToDelete && `${employeeToDelete.firstName} ${employeeToDelete.lastName}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Employee Card Dialog */}
      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {language === 'pt' ? 'Cartão de Identificação' : 'ID Card'}
            </DialogTitle>
          </DialogHeader>
          
          {employeeForCard && (
            <div className="max-h-[60vh] overflow-y-auto">
              <PrintableEmployeeCard ref={cardRef} employee={employeeForCard} />
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCardDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="accent" onClick={() => handlePrint()}>
              <FileDown className="h-4 w-4 mr-2" />
              {language === 'pt' ? 'Imprimir Cartão' : 'Print Card'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TopNavLayout>
  );
};

export default Employees;
