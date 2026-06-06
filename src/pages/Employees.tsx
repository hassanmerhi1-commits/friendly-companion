import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, MoreHorizontal, Pencil, Trash2, FileDown, CreditCard, ArrowUpDown, ArrowUp, ArrowDown, FolderOpen, CheckCircle, XCircle, Clock, LogOut, UserCheck, Users, MapPin, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { useAuthStore } from "@/stores/auth-store";
import { useBranchStore } from "@/stores/branch-store";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { EmployeeOffboardDialog } from "@/components/employees/EmployeeOffboardDialog";
import { PrintableEmployeeCard } from "@/components/employees/PrintableEmployeeCard";
import { formatAOA } from "@/lib/angola-labor-law";
import { ATTENDANCE_PAGE } from "@/lib/page-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ATTENDANCE_TH,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from "@/components/attendance/AttendanceTablePanel";
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
  const canApproveEmployees =
    currentUser?.role === 'admin' || hasPermission('employees.edit');
  const isBranchLocked =
    !!currentUser?.branchId && currentUser?.role !== 'admin';
  const { branches: allBranches } = useBranchStore();
  const branches = allBranches.filter((b) => b.isActive);
  const [search, setSearch] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
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
    if (isBranchLocked && currentUser?.branchId) {
      setSelectedBranchFilter(currentUser.branchId);
    }
  }, [isBranchLocked, currentUser?.branchId]);

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
      
      const matchesBranch =
        selectedBranchFilter === 'all' || emp.branchId === selectedBranchFilter;
      const matchesDepartment =
        departmentFilter === 'all' ||
        (emp.department || '').toLowerCase().trim() === departmentFilter.toLowerCase().trim();
      const matchesCategory =
        categoryFilter === 'all' ||
        (emp.category || '').toLowerCase().trim() === categoryFilter.toLowerCase().trim();

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
      
      return (
        matchesSearch &&
        matchesBranch &&
        matchesStatus &&
        matchesDepartment &&
        matchesCategory
      );
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

  const departmentOptions = useMemo(() => {
    const pool =
      selectedBranchFilter === 'all'
        ? employees
        : employees.filter((e) => e.branchId === selectedBranchFilter);
    return [...new Set(pool.map((e) => (e.department || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, language === 'pt' ? 'pt' : 'en')
    );
  }, [employees, selectedBranchFilter, language]);

  const categoryOptions = useMemo(() => {
    const pool =
      selectedBranchFilter === 'all'
        ? employees
        : employees.filter((e) => e.branchId === selectedBranchFilter);
    return [...new Set(pool.map((e) => (e.category || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, language === 'pt' ? 'pt' : 'en')
    );
  }, [employees, selectedBranchFilter, language]);

  const listStats = useMemo(() => {
    const active = filteredAndSortedEmployees.filter((e) => e.status === 'active').length;
    const pending = filteredAndSortedEmployees.filter((e) => e.status === 'pending_approval').length;
    const retired = filteredAndSortedEmployees.filter(
      (e) => e.status === 'active' && e.isRetired
    ).length;
    const left = filteredAndSortedEmployees.filter((e) => e.status === 'terminated').length;
    return { active, pending, retired, left, total: filteredAndSortedEmployees.length };
  }, [filteredAndSortedEmployees]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortableHeader = ({
    field,
    label,
    align = 'left',
  }: {
    field: SortField;
    label: string;
    align?: 'left' | 'right';
  }) => (
    <th
      className={cn(
        align === 'right' ? ATTENDANCE_TH_RIGHT : ATTENDANCE_TH,
        'cursor-pointer select-none hover:text-foreground'
      )}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortField === field ? (
          sortOrder === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  );

  const openDossier = (employee: Employee) => {
    navigate(`/employee-profile/${employee.id}?${buildEmployeesStateParams}`);
  };

  const getInitials = (emp: Employee) =>
    `${emp.firstName.charAt(0)}${emp.lastName.charAt(0)}`.toUpperCase();

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
    exportEmployeesToCSV(filteredAndSortedEmployees, language, branches);
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
    onBeforePrint: async () => {
      if (employeeForCard && !employeeForCard.photoUrl) {
        toast.warning(
          language === 'pt'
            ? 'Este funcionário não tem foto no dossier.'
            : 'This employee has no photo on file.'
        );
      }
    },
  });

  const pt = language === 'pt';

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-2`}>
        {/* Toolbar */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm">
          <Users className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold shrink-0">{t.employees.title}</span>

          <div className="relative flex-1 min-w-[140px] max-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t.employees.searchPlaceholder}
              className="pl-8 h-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {!isBranchLocked && (
            <>
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
                  <SelectValue placeholder={pt ? 'Filial' : 'Branch'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{pt ? 'Todas as filiais' : 'All branches'}</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{pt ? 'Activos' : 'Active'}</SelectItem>
              {canApproveEmployees && pendingCount > 0 && (
                <SelectItem value="pending">
                  {pt ? `Pendentes (${pendingCount})` : `Pending (${pendingCount})`}
                </SelectItem>
              )}
              <SelectItem value="left">{pt ? 'Saída' : 'Left'}</SelectItem>
              <SelectItem value="retired">{pt ? 'Reformados' : 'Retired'}</SelectItem>
              <SelectItem value="all">{pt ? 'Todos' : 'All'}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs shrink-0">
              <SelectValue placeholder={pt ? 'Departamento' : 'Department'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{pt ? 'Todos dept.' : 'All dept.'}</SelectItem>
              {departmentOptions.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs shrink-0">
              <SelectValue placeholder={pt ? 'Categoria' : 'Category'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{pt ? 'Todas cat.' : 'All cat.'}</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1.5 ml-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={() => navigate('/employee-cards')}
            >
              <CreditCard className="h-3.5 w-3.5" />
              {t.nav?.idCards || 'Cartões ID'}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={handleExport}>
              <FileDown className="h-3.5 w-3.5" />
              Excel
            </Button>
            {hasPermission('employees.create') && (
              <Button size="sm" className="h-8 text-xs gap-1" onClick={handleAdd}>
                <UserPlus className="h-3.5 w-3.5" />
                {t.employees.addEmployee}
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: pt ? 'Total' : 'Total', value: String(listStats.total) },
            { label: pt ? 'Activos' : 'Active', value: String(listStats.active), success: true },
            {
              label: pt ? 'Pendentes' : 'Pending',
              value: String(listStats.pending),
              highlight: listStats.pending > 0,
            },
            { label: pt ? 'Reformados' : 'Retired', value: String(listStats.retired) },
            { label: pt ? 'Saídas' : 'Left', value: String(listStats.left) },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-border/50 bg-card px-3 py-2"
            >
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              <p
                className={cn(
                  'text-sm font-semibold',
                  kpi.success && 'text-success',
                  kpi.highlight && 'text-primary'
                )}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        {/* Pending banner */}
        {canApproveEmployees && pendingCount > 0 && statusFilter !== 'pending' && (
          <div className="shrink-0 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            <AlertCircle className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1">
              {pt
                ? `${pendingCount} funcionário(s) aguardam aprovação`
                : `${pendingCount} employee(s) awaiting approval`}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatusFilter('pending')}
            >
              {pt ? 'Ver pendentes' : 'View pending'}
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
          <div className="flex-1 min-h-0 overflow-auto overscroll-contain">
            <table className="w-full min-w-[960px] text-sm">
              <thead className={ATTENDANCE_THEAD}>
                <tr>
                  <th className={cn(ATTENDANCE_TH, 'w-10')} />
                  <SortableHeader field="name" label={pt ? 'Nome' : 'Name'} />
                  <SortableHeader field="department" label={pt ? 'Departamento' : 'Department'} />
                  <th className={ATTENDANCE_TH}>{pt ? 'Categoria' : 'Category'}</th>
                  <SortableHeader field="branch" label={pt ? 'Filial' : 'Branch'} />
                  <th className={ATTENDANCE_TH}>{pt ? 'Contrato' : 'Contract'}</th>
                  <th className={ATTENDANCE_TH}>{pt ? 'Estado' : 'Status'}</th>
                  <SortableHeader field="hireDate" label={pt ? 'Admissão' : 'Hired'} />
                  <SortableHeader field="salary" label={pt ? 'Salário' : 'Salary'} align="right" />
                  <th className={ATTENDANCE_TH_RIGHT}>{pt ? 'Bónus' : 'Bonus'}</th>
                  <th className={cn(ATTENDANCE_TH_RIGHT, 'w-16')}>{pt ? 'Ações' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className={ATTENDANCE_TBODY}>
              {filteredAndSortedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    {pt ? 'Nenhum funcionário encontrado' : 'No employees found'}
                  </td>
                </tr>
              ) : (
              filteredAndSortedEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className="hover:bg-muted/30 cursor-pointer"
                  onClick={() => openDossier(employee)}
                >
                  <td className={ATTENDANCE_TD}>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={employee.photoUrl} alt={employee.firstName} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getInitials(employee)}
                      </AvatarFallback>
                    </Avatar>
                  </td>
                  <td className={ATTENDANCE_TD}>
                    <div className="text-xs font-medium">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{employee.employeeNumber}</div>
                  </td>
                  <td className={`${ATTENDANCE_TD} text-xs`}>{employee.department || '—'}</td>
                  <td className={`${ATTENDANCE_TD} text-xs`}>{getCategoryLabel(employee.category)}</td>
                  <td className={`${ATTENDANCE_TD} text-xs`}>{getBranchName(employee.branchId)}</td>
                  <td className={`${ATTENDANCE_TD} text-xs`}>
                    <span
                      className={cn(
                        employee.contractType === 'colaborador' && 'text-accent font-medium'
                      )}
                    >
                      {getContractLabel(employee.contractType)}
                    </span>
                  </td>
                  <td className={ATTENDANCE_TD}>
                    <div className="flex flex-col gap-0.5 items-start">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-1.5 py-0.5 text-[10px]',
                          employee.status === 'active' && 'bg-primary/10 text-primary',
                          employee.status === 'pending_approval' && 'bg-secondary text-secondary-foreground',
                          employee.status === 'terminated' && 'bg-destructive/10 text-destructive'
                        )}
                      >
                        {getStatusLabel(employee.status)}
                      </span>
                      {employee.status === 'active' && employee.isRetired && (
                        <span className="text-[10px] text-muted-foreground">
                          {pt ? 'Reformado' : 'Retired'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>
                    {employee.hireDate ? formatDate(employee.hireDate) : '—'}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-right text-xs font-medium`}>
                    {formatAOA(employee.baseSalary || 0)}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-right text-xs`}>
                    {(employee.monthlyBonus || 0) > 0 ? (
                      <span className="text-accent font-medium">
                        {formatAOA(employee.monthlyBonus || 0)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className={ATTENDANCE_TD} onClick={(e) => e.stopPropagation()}>
                    {employee.status === 'pending_approval' && canApproveEmployees ? (
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleApprove(employee)}
                          title={pt ? 'Aprovar' : 'Approve'}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleReject(employee)}
                          title={pt ? 'Rejeitar' : 'Reject'}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDossier(employee)}>
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
              ))
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/20">
          <p className="text-[10px] text-muted-foreground">
            {t.common.showing}{' '}
            <span className="font-medium text-foreground">{filteredAndSortedEmployees.length}</span>{' '}
            {t.common.of}{' '}
            <span className="font-medium text-foreground">{employees.length}</span>
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
              <PrintableEmployeeCard ref={cardRef} employee={employeeForCard} language={language} />
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
