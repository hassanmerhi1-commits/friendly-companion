import { useState, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Filter, MoreHorizontal, Pencil, Trash2, FileDown, CreditCard } from "lucide-react";
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

const Employees = () => {
  const { t, language } = useLanguage();
  const { employees, deleteEmployee } = useEmployeeStore();
  const { getActiveBranches } = useBranchStore();
  const branches = getActiveBranches();
  const [search, setSearch] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [employeeForCard, setEmployeeForCard] = useState<Employee | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase());
    
    const matchesBranch = selectedBranchFilter === 'all' || emp.branchId === selectedBranchFilter;
    
    return matchesSearch && matchesBranch;
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
    <MainLayout>
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

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6 animate-slide-up">
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
      </div>

      {/* Employee Table */}
      <div className="stat-card p-0 overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.employees.employee}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {language === 'pt' ? 'Filial' : 'Branch'}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.employees.department}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.employees.salary}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.employees.contract}
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.common.status}
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="table-row-hover">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-accent">
                          {employee.firstName[0]}{employee.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {employee.firstName} {employee.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground">{getBranchName(employee.branchId)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-foreground">{employee.department}</p>
                      <p className="text-sm text-muted-foreground">{employee.position}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-foreground">
                      {formatAOA(employee.baseSalary)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground">
                      {getContractLabel(employee.contractType)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
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
                  <td className="px-6 py-4 text-right">
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
                          {language === 'pt' ? 'Cartão ID' : 'ID Card'}
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">
            {t.common.showing} <span className="font-medium">1-{filteredEmployees.length}</span> {t.common.of} <span className="font-medium">{employees.length}</span> {t.employees.title.toLowerCase()}
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
    </MainLayout>
  );
};

export default Employees;
