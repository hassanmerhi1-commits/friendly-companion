import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Filter, MoreHorizontal, Pencil, Trash2, FileDown, CreditCard, ArrowUpDown, ArrowUp, ArrowDown, FolderOpen, Archive, CheckCircle, XCircle, Clock, LogOut, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { useAuthStore } from "@/stores/auth-store";
import { useBranchStore } from "@/stores/branch-store";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { EmployeeOffboardDialog } from "@/components/employees/EmployeeOffboardDialog";
import { PrintableEmployeeCard } from "@/components/employees/PrintableEmployeeCard";
import { formatAOA } from "@/lib/angola-labor-law";
import { FIXED_TOOLBAR_PAGE } from "@/lib/page-layout";
import { exportEmployeesToCSV } from "@/lib/export-utils";
import { getExitReasonLabel } from "@/lib/employee-exit";
import type { Employee } from "@/types/employee";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
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
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language } = useLanguage();
  const {
    employees,
    deleteEmployee,
    approveEmployee,
    rejectEmployee,
    backfillCategoryFromPosition,
    updateEmployee,
    rehireEmployee,
  } = useEmployeeStore();
  const { hasPermission, currentUser } = useAuthStore();
  const canApproveEmployees = currentUser?.role === 'admin' || hasPermission('users.edit');
  const { branches: allBranches } = useBranchStore();
  // Derive active branches from subscribed state - ensures re-render on changes
  const branches = allBranches.filter(b => b.isActive);
  const [search, setSearch] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [nameColumnFilter, setNameColumnFilter] = useState<string>('all');
  const [departmentColumnFilter, setDepartmentColumnFilter] = useState<string>('all');
  const [categoryColumnFilter, setCategoryColumnFilter] = useState<string>('all');
  const [branchColumnFilter, setBranchColumnFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialSearch = params.get('search');
    const initialBranch = params.get('branch');
    const initialStatus = params.get('status');
    const initialSortField = params.get('sortField') as SortField | null;
    const initialSortOrder = params.get('sortOrder') as SortOrder | null;

    if (initialSearch !== null) setSearch(initialSearch);
    if (initialBranch !== null) setSelectedBranchFilter(initialBranch);
    if (initialStatus !== null) setStatusFilter(initialStatus);
    if (initialSortField && ['name', 'department', 'branch', 'salary', 'hireDate'].includes(initialSortField)) {
      setSortField(initialSortField);
    }
    if (initialSortOrder && (initialSortOrder === 'asc' || initialSortOrder === 'desc')) {
      setSortOrder(initialSortOrder);
    }
  }, [location.search]);

  useEffect(() => {
    void backfillCategoryFromPosition();
  }, [backfillCategoryFromPosition]);

  const buildEmployeesStateParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('search', search);
    params.set('branch', selectedBranchFilter);
    params.set('status', statusFilter);
    params.set('sortField', sortField);
    params.set('sortOrder', sortOrder);
    return params.toString();
  }, [search, selectedBranchFilter, statusFilter, sortField, sortOrder]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [employeeForCard, setEmployeeForCard] = useState<Employee | null>(null);
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [employeeToOffboard, setEmployeeToOffboard] = useState<Employee | null>(null);
  const [rehireOpen, setRehireOpen] = useState(false);
  const [employeeToRehire, setEmployeeToRehire] = useState<Employee | null>(null);
  const [rehireNote, setRehireNote] = useState('');
  const [rehireLoading, setRehireLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Get branch name helper for sorting
  const getBranchNameForSort = (branchId?: string) => {
    if (!branchId) return '';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : '';
  };

  const normalizeText = (text: string) =>
    text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const filteredAndSortedEmployees = employees
    .filter(emp => {
      const searchNorm = normalizeText(search);
      const searchWords = searchNorm.split(/\s+/).filter(Boolean);
      const empText = normalizeText(`${emp.firstName} ${emp.lastName} ${emp.email} ${emp.department} ${emp.category || ''} ${emp.employeeNumber || ''} ${emp.position || ''}`);
      const matchesSearch = searchWords.length === 0 || searchWords.every(word => empText.includes(word));
      
      const matchesBranch = selectedBranchFilter === 'all' || emp.branchId === selectedBranchFilter;
      const matchesNameHeader = nameColumnFilter === 'all' ||
        `${emp.firstName} ${emp.lastName}`.toLowerCase().trim() === nameColumnFilter;
      const matchesDepartmentHeader = departmentColumnFilter === 'all' ||
        (emp.department || '').toLowerCase().trim() === departmentColumnFilter;
      const matchesCategoryHeader = categoryColumnFilter === 'all' ||
        (emp.category || '').toLowerCase().trim() === categoryColumnFilter;
      const matchesBranchHeader = branchColumnFilter === 'all' ||
        (emp.branchId || '') === branchColumnFilter;
      
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'left'
            ? emp.status === 'terminated'
            : statusFilter === 'retired'
              ? emp.status === 'active' && emp.isRetired
              : statusFilter === 'pending'
                ? emp.status === 'pending_approval'
                : emp.status === 'active';
      
      return matchesSearch && matchesBranch && matchesStatus && matchesNameHeader && matchesDepartmentHeader && matchesCategoryHeader && matchesBranchHeader;
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

  const nameHeaderOptions = useMemo(() => {
    const names = Array.from(new Set(
      employees.map((e) => `${e.firstName} ${e.lastName}`.trim()).filter(Boolean)
    ));
    return names.sort((a, b) => a.localeCompare(b, language === 'pt' ? 'pt' : 'en'));
  }, [employees, language]);

  const departmentHeaderOptions = useMemo(() => {
    const values = Array.from(new Set(
      employees.map((e) => (e.department || '').trim()).filter(Boolean)
    ));
    return values.sort((a, b) => a.localeCompare(b, language === 'pt' ? 'pt' : 'en'));
  }, [employees, language]);

  const categoryHeaderOptions = useMemo(() => {
    const values = Array.from(new Set(
      employees.map((e) => (e.category || '').trim()).filter(Boolean)
    ));
    return values.sort((a, b) => a.localeCompare(b, language === 'pt' ? 'pt' : 'en'));
  }, [employees, language]);

  const getCategoryLabel = (category?: string) => {
    if (!category) return '-';
    return category;
  };

  function getStatusLabel(status: Employee["status"]): string {
    const labels: Record<string, string> = {
      active: t.common.active,
      inactive: t.common.inactive,
      on_leave: t.common.onLeave,
      terminated: language === 'pt' ? 'Fora da empresa' : 'Left company',
      pending_approval: language === 'pt' ? 'Pendente' : 'Pending',
    };
    return labels[status] || status;
  }

  function getContractLabel(contract: Employee["contractType"]): string {
    const labels: Record<string, string> = {
      permanent: t.employees.permanent,
      fixed_term: t.employees.fixedTerm,
      part_time: t.employees.partTime,
      probation: t.employees.probation,
      colaborador: language === 'pt' ? 'Colaborador' : 'Collaborator',
    };
    return labels[contract] || contract;
  }

  const handleEdit = (emp: Employee) => {
    if (!hasPermission('employees.edit')) {
      toast.error(language === 'pt' ? 'Sem permissão para editar funcionários' : 'No permission to edit employees');
      return;
    }
    setSelectedEmployee(emp);
    setFormOpen(true);
  };

  const handleAdd = () => {
    if (!hasPermission('employees.create')) {
      toast.error(language === 'pt' ? 'Sem permissão para adicionar funcionários' : 'No permission to add employees');
      return;
    }
    setSelectedEmployee(null);
    setFormOpen(true);
  };

  const handleDeleteClick = (emp: Employee) => {
    if (!hasPermission('employees.delete')) {
      toast.error(language === 'pt' ? 'Sem permissão para eliminar funcionários' : 'No permission to delete employees');
      return;
    }
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
    if (!hasPermission('reports.export')) {
      toast.error(language === 'pt' ? 'Sem permissão para exportar' : 'No permission to export');
      return;
    }
    const employeesToExport = selectedBranchFilter === 'all'
      ? employees
      : employees.filter((emp) => emp.branchId === selectedBranchFilter);
    exportEmployeesToCSV(employeesToExport, language, branches);
    toast.success(t.export.success);
  };

  const pendingCount = employees.filter(e => e.status === 'pending_approval').length;

  const handleApprove = async (emp: Employee) => {
    const result = await approveEmployee(emp.id);
    if (result.success) {
      toast.success(language === 'pt' ? `${emp.firstName} ${emp.lastName} aprovado com sucesso` : `${emp.firstName} ${emp.lastName} approved successfully`);
    } else {
      toast.error(result.error);
    }
  };

  const handleReject = async (emp: Employee) => {
    const result = await rejectEmployee(emp.id);
    if (result.success) {
      toast.success(language === 'pt' ? `${emp.firstName} ${emp.lastName} rejeitado` : `${emp.firstName} ${emp.lastName} rejected`);
    } else {
      toast.error(result.error);
    }
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
      <div className={`${FIXED_TOOLBAR_PAGE} gap-4`}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between animate-fade-in">
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
          {hasPermission('employees.create') && (
            <Button variant="accent" size="lg" onClick={handleAdd}>
              <UserPlus className="h-5 w-5 mr-2" />
              {t.employees.addEmployee}
            </Button>
          )}
        </div>
      </div>

      {/* Search, Filters and Sorting */}
      <div className="shrink-0 flex flex-wrap items-center gap-4 animate-slide-up">
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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <Archive className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">{language === 'pt' ? 'Activos' : 'Active'}</SelectItem>
            {canApproveEmployees && pendingCount > 0 && (
              <SelectItem value="pending">
                {language === 'pt' ? `Pendentes (${pendingCount})` : `Pending (${pendingCount})`}
              </SelectItem>
            )}
            <SelectItem value="left">{language === 'pt' ? 'Saída da empresa' : 'Left company'}</SelectItem>
            <SelectItem value="retired">{language === 'pt' ? 'Reformados (activos)' : 'Retired (active)'}</SelectItem>
            <SelectItem value="all">{language === 'pt' ? 'Todos' : 'All'}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => {
            setSortField('name');
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
          }}
        >
          {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4 mr-2" /> : <ArrowDown className="h-4 w-4 mr-2" />}
          {language === 'pt' ? 'Ordenar Nome' : 'Sort Name'}
        </Button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col rounded-lg border bg-card overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted shadow-[0_1px_0_0_hsl(var(--border))] [&_th]:bg-muted">
              <tr>
                <th className="px-3 py-3 text-left">{language === 'pt' ? 'Nome' : 'Name'}</th>
                <th className="px-3 py-3 text-left">{language === 'pt' ? 'Departamento' : 'Department'}</th>
                <th className="px-3 py-3 text-left">{language === 'pt' ? 'Categoria' : 'Category'}</th>
                <th className="px-3 py-3 text-left">{language === 'pt' ? 'Filial' : 'Branch'}</th>
                <th className="px-3 py-3 text-left">{language === 'pt' ? 'Contrato' : 'Contract'}</th>
                <th className="px-3 py-3 text-left">{language === 'pt' ? 'Estado' : 'Status'}</th>
                <th className="px-3 py-3 text-right">{language === 'pt' ? 'Salário' : 'Salary'}</th>
                <th className="px-3 py-3 text-right">{language === 'pt' ? 'Bónus' : 'Bonus'}</th>
                <th className="px-3 py-3 text-right">{language === 'pt' ? 'Ações' : 'Actions'}</th>
              </tr>
              <tr className="border-t border-border">
                <th className="px-3 py-2 text-left">
                  <Select value={nameColumnFilter} onValueChange={setNameColumnFilter}>
                    <SelectTrigger className="h-8 min-w-[170px]">
                      <SelectValue placeholder={language === 'pt' ? 'Filtrar nome' : 'Filter name'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'pt' ? '(Todos)' : '(All)'}</SelectItem>
                      {nameHeaderOptions.map((name) => (
                        <SelectItem key={name} value={name.toLowerCase().trim()}>{name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </th>
                <th className="px-3 py-2 text-left">
                  <Select value={departmentColumnFilter} onValueChange={setDepartmentColumnFilter}>
                    <SelectTrigger className="h-8 min-w-[160px]">
                      <SelectValue placeholder={language === 'pt' ? 'Filtrar depto' : 'Filter dept'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'pt' ? '(Todos)' : '(All)'}</SelectItem>
                      {departmentHeaderOptions.map((value) => (
                        <SelectItem key={value} value={value.toLowerCase().trim()}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </th>
                <th className="px-3 py-2 text-left">
                  <Select value={categoryColumnFilter} onValueChange={setCategoryColumnFilter}>
                    <SelectTrigger className="h-8 min-w-[180px]">
                      <SelectValue placeholder={language === 'pt' ? 'Filtrar categoria' : 'Filter category'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'pt' ? '(Todos)' : '(All)'}</SelectItem>
                      {categoryHeaderOptions.map((value) => (
                        <SelectItem key={value} value={value.toLowerCase().trim()}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </th>
                <th className="px-3 py-2 text-left">
                  <Select value={branchColumnFilter} onValueChange={setBranchColumnFilter}>
                    <SelectTrigger className="h-8 min-w-[170px]">
                      <SelectValue placeholder={language === 'pt' ? 'Filtrar filial' : 'Filter branch'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'pt' ? '(Todas)' : '(All)'}</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </th>
                <th className="px-3 py-2" />
                <th className="px-3 py-2" />
                <th className="px-3 py-2" />
                <th className="px-3 py-2" />
                <th className="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNameColumnFilter('all');
                      setDepartmentColumnFilter('all');
                      setCategoryColumnFilter('all');
                      setBranchColumnFilter('all');
                    }}
                  >
                    {language === 'pt' ? 'Limpar' : 'Clear'}
                  </Button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedEmployees.map(employee => (
                <tr key={employee.id} className="border-t border-border">
                  <td className="px-3 py-3 font-medium">
                    <div>{employee.firstName} {employee.lastName}</div>
                    <div className="text-xs text-muted-foreground">{employee.employeeNumber}</div>
                  </td>
                  <td className="px-3 py-3">{employee.department || '-'}</td>
                  <td className="px-3 py-3">{getCategoryLabel(employee.category)}</td>
                  <td className="px-3 py-3">{getBranchName(employee.branchId)}</td>
                  <td className="px-3 py-3">{getContractLabel(employee.contractType)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-1 text-xs',
                          employee.status === 'active' && 'bg-primary/10 text-primary',
                          employee.status === 'pending_approval' && 'bg-secondary text-secondary-foreground',
                          employee.status === 'terminated' && 'bg-destructive/10 text-destructive'
                        )}
                      >
                        {getStatusLabel(employee.status)}
                      </span>
                      {employee.status === 'active' && employee.isRetired && (
                        <span className="text-xs text-muted-foreground">
                          {language === 'pt' ? 'Reformado' : 'Retired'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">{formatAOA(employee.baseSalary || 0)}</td>
                  <td className="px-3 py-3 text-right">
                    {(employee.monthlyBonus || 0) > 0 ? (
                      <span className="text-accent font-medium">{formatAOA(employee.monthlyBonus || 0)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {employee.status === 'pending_approval' && canApproveEmployees ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleApprove(employee)}
                          title={language === 'pt' ? 'Aprovar' : 'Approve'}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleReject(employee)}
                          title={language === 'pt' ? 'Rejeitar' : 'Reject'}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/employee-profile/${employee.id}?${buildEmployeesStateParams}`)}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            {language === 'pt' ? 'Ver Dossier' : 'View Dossier'}
                          </DropdownMenuItem>
                          {hasPermission('employees.edit') && (
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              {t.common.edit}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handlePrintCard(employee)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            {t.nav?.idCards || 'Cartão ID'}
                          </DropdownMenuItem>
                          {hasPermission('employees.edit') && employee.status !== 'terminated' && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setEmployeeToOffboard(employee);
                                  setOffboardOpen(true);
                                }}
                              >
                                <LogOut className="h-4 w-4 mr-2" />
                                {language === 'pt' ? 'Saída da empresa' : 'Left company'}
                              </DropdownMenuItem>
                            </>
                          )}
                          {hasPermission('employees.edit') && employee.status === 'terminated' && (
                            <DropdownMenuItem
                              onClick={() => {
                                setEmployeeToRehire(employee);
                                setRehireNote('');
                                setRehireOpen(true);
                              }}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              {language === 'pt' ? 'Recontratar' : 'Rehire'}
                            </DropdownMenuItem>
                          )}
                          {hasPermission('employees.edit') && employee.status === 'active' && (
                            <DropdownMenuItem onClick={() => {
                              const newValue = !employee.isRetired;
                              updateEmployee(employee.id, { isRetired: newValue });
                              toast.success(newValue
                                ? (language === 'pt' ? 'Marcado como Reformado' : 'Marked as Retired')
                                : (language === 'pt' ? 'Desmarcado como Reformado' : 'Unmarked as Retired'));
                            }}>
                              <Clock className="h-4 w-4 mr-2" />
                              {employee.isRetired
                                ? (language === 'pt' ? 'Desmarcar Reformado' : 'Unmark Retired')
                                : (language === 'pt' ? 'Marcar Reformado' : 'Mark Retired')}
                            </DropdownMenuItem>
                          )}
                          {hasPermission('employees.delete') && (
                            <DropdownMenuItem onClick={() => handleDeleteClick(employee)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t.common.delete}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">
            {t.common.showing} <span className="font-medium">{filteredAndSortedEmployees.length}</span> {t.common.of} <span className="font-medium">{employees.length}</span> {t.employees.title.toLowerCase()}
          </p>
        </div>
      </div>

      </div>

      {/* Form Dialog */}
      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={selectedEmployee}
      />

      <EmployeeOffboardDialog
        open={offboardOpen}
        onOpenChange={setOffboardOpen}
        employee={employeeToOffboard}
        processedBy={currentUser?.name || currentUser?.username || 'System'}
        onSuccess={() => setEmployeeToOffboard(null)}
      />

      <Dialog open={rehireOpen} onOpenChange={setRehireOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'pt' ? 'Recontratar funcionário' : 'Rehire employee'}
            </DialogTitle>
            <DialogDescription>
              {employeeToRehire && (
                <>
                  {employeeToRehire.firstName} {employeeToRehire.lastName}
                  {employeeToRehire.exitDate && (
                    <span className="block mt-1 text-xs">
                      {language === 'pt' ? 'Saída' : 'Exit'}:{' '}
                      {formatDate(employeeToRehire.exitDate)}
                      {employeeToRehire.exitReason &&
                        ` · ${getExitReasonLabel(employeeToRehire.exitReason, language)}`}
                    </span>
                  )}
                  {employeeToRehire.exitNote && (
                    <span className="block mt-1 text-xs italic">{employeeToRehire.exitNote}</span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rehireNote">
              {language === 'pt' ? 'Nota (opcional)' : 'Note (optional)'}
            </Label>
            <Textarea
              id="rehireNote"
              value={rehireNote}
              onChange={(e) => setRehireNote(e.target.value)}
              rows={3}
              placeholder={
                language === 'pt' ? 'Motivo da recontratação…' : 'Reason for rehire…'
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRehireOpen(false)} disabled={rehireLoading}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              disabled={rehireLoading || !employeeToRehire}
              onClick={async () => {
                if (!employeeToRehire) return;
                setRehireLoading(true);
                const result = await rehireEmployee(employeeToRehire.id, {
                  note: rehireNote,
                  processedBy: currentUser?.name || currentUser?.username || 'System',
                });
                setRehireLoading(false);
                if (result.success) {
                  toast.success(
                    language === 'pt'
                      ? 'Funcionário reactivado'
                      : 'Employee reactivated'
                  );
                  setRehireOpen(false);
                  setEmployeeToRehire(null);
                } else {
                  toast.error(result.error);
                }
              }}
            >
              {language === 'pt' ? 'Confirmar recontratação' : 'Confirm rehire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
