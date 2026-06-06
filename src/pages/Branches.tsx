import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBranchStore } from '@/stores/branch-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { BranchFormDialog } from '@/components/branches/BranchFormDialog';
import { useLanguage } from '@/lib/i18n';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Plus,
  Edit,
  Trash2,
  Crown,
  Download,
  QrCode,
  Copy,
  Search,
  Users,
  LayoutGrid,
  Table2,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { useAuthStore } from '@/stores/auth-store';
import type { Branch } from '@/types/branch';
import { buildBranchAttendanceQrUrl } from '@/lib/branch-attendance-url';
import { ATTENDANCE_PAGE } from '@/lib/page-layout';
import {
  ATTENDANCE_TH,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';

type ViewMode = 'cards' | 'table';

export default function Branches() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { hasPermission } = useAuthStore();
  const { branches, deleteBranch } = useBranchStore();
  const { employees } = useEmployeeStore();

  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [qrBranch, setQrBranch] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const qrPrintRef = useRef<HTMLDivElement>(null);

  const handleQrPrint = useReactToPrint({
    contentRef: qrPrintRef,
    documentTitle: qrBranch ? `QR-${qrBranch.code}` : 'branch-qr',
  });

  const activeBranches = useMemo(() => branches.filter((b) => b.isActive), [branches]);

  const employeeCountByBranch = useMemo(() => {
    const map = new Map<string, number>();
    employees
      .filter((e) => e.status === 'active')
      .forEach((e) => {
        if (e.branchId) map.set(e.branchId, (map.get(e.branchId) || 0) + 1);
      });
    return map;
  }, [employees]);

  const provinces = useMemo(
    () => [...new Set(activeBranches.map((b) => b.province))].sort(),
    [activeBranches]
  );

  const filteredBranches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeBranches
      .filter((b) => provinceFilter === 'all' || b.province === provinceFilter)
      .filter((b) => {
        if (!q) return true;
        return (
          b.name.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q) ||
          b.city.toLowerCase().includes(q) ||
          b.province.toLowerCase().includes(q) ||
          (b.address || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.isHeadquarters !== b.isHeadquarters) return a.isHeadquarters ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [activeBranches, provinceFilter, search]);

  const branchesByProvince = useMemo(() => {
    return filteredBranches.reduce(
      (acc, branch) => {
        if (!acc[branch.province]) acc[branch.province] = [];
        acc[branch.province].push(branch);
        return acc;
      },
      {} as Record<string, Branch[]>
    );
  }, [filteredBranches]);

  const totalEmployees = useMemo(
    () =>
      filteredBranches.reduce((sum, b) => sum + (employeeCountByBranch.get(b.id) || 0), 0),
    [filteredBranches, employeeCountByBranch]
  );

  const getAttendanceUrl = (branch: Branch) => {
    const branchEmployees = employees
      .filter((e) => e.branchId === branch.id && e.status === 'active')
      .map((e) => ({
        i: e.id,
        f: e.firstName,
        l: e.lastName,
        n: e.employeeNumber,
      }));

    return buildBranchAttendanceQrUrl({
      b: { i: branch.id, n: branch.name, c: branch.code, p: branch.pin || '' },
      e: branchEmployees,
    });
  };

  const t = {
    title: pt ? 'Filiais' : 'Branches',
    subtitle: pt ? 'Gerir filiais por província e cidade' : 'Manage branches by province and city',
    add: pt ? 'Nova Filial' : 'New Branch',
    search: pt ? 'Pesquisar filial...' : 'Search branches...',
    allProvinces: pt ? 'Todas as províncias' : 'All provinces',
    cards: pt ? 'Cartões' : 'Cards',
    table: pt ? 'Tabela' : 'Table',
    branches: pt ? 'filiais' : 'branches',
    provinces: pt ? 'províncias' : 'provinces',
    employees: pt ? 'funcionários' : 'employees',
    headquarters: pt ? 'Sede' : 'HQ',
    branch: pt ? 'Filial' : 'Branch',
    noResults: pt ? 'Nenhuma filial encontrada' : 'No branches found',
    name: pt ? 'Nome' : 'Name',
    code: pt ? 'Código' : 'Code',
    province: pt ? 'Província' : 'Province',
    city: pt ? 'Cidade' : 'City',
    actions: pt ? 'Acções' : 'Actions',
    deleteTitle: pt ? 'Desactivar filial?' : 'Deactivate branch?',
    deleteDesc: pt
      ? 'A filial será desactivada. Funcionários ligados mantêm o registo.'
      : 'The branch will be deactivated. Linked employees keep their record.',
    cancel: pt ? 'Cancelar' : 'Cancel',
    confirmDelete: pt ? 'Desactivar' : 'Deactivate',
    deactivated: pt ? 'Filial desactivada' : 'Branch deactivated',
    noCreate: pt ? 'Sem permissão para criar filiais' : 'No permission to create branches',
    noEdit: pt ? 'Sem permissão para editar filiais' : 'No permission to edit branches',
    noDelete: pt ? 'Sem permissão para eliminar filiais' : 'No permission to delete branches',
    qrTitle: pt ? 'QR Presenças' : 'Attendance QR',
    qrDesc: pt
      ? 'Digitalize para abrir a página de presenças no telemóvel'
      : 'Scan to open attendance page on phone',
    copyLink: pt ? 'Copiar link' : 'Copy link',
    linkCopied: pt ? 'Link copiado!' : 'Link copied!',
    printQr: pt ? 'Imprimir QR' : 'Print QR',
    exportPkg: pt ? 'Exportar pacote' : 'Export package',
    viewEmployees: pt ? 'Ver funcionários' : 'View employees',
    pkgExported: pt ? 'Pacote exportado' : 'Package exported',
  };

  const handleAddNew = () => {
    if (!hasPermission('branches.create')) {
      toast.error(t.noCreate);
      return;
    }
    setEditingBranch(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    if (!hasPermission('branches.edit')) {
      toast.error(t.noEdit);
      return;
    }
    setEditingBranch(branch);
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (!hasPermission('branches.delete')) {
      toast.error(t.noDelete);
      return;
    }
    await deleteBranch(deleteTarget.id);
    toast.success(t.deactivated);
    setDeleteTarget(null);
  };

  const handleExportBranchPackage = (branch: Branch) => {
    const branchEmployees = employees
      .filter((e) => e.branchId === branch.id && e.status === 'active')
      .map((e) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        employeeNumber: e.employeeNumber,
        position: e.position,
        department: e.department,
      }));

    const pkg = {
      type: 'branch_package',
      version: 1,
      exportedAt: new Date().toISOString(),
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        province: branch.province,
        city: branch.city,
        pin: branch.pin,
      },
      employees: branchEmployees,
    };

    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filial-${branch.code}-pacote.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${t.pkgExported}: ${branch.name} (${branchEmployees.length})`);
  };

  const goToEmployees = (branchId: string) => {
    navigate(`/employees?branch=${branchId}&status=active`);
  };

  const renderActions = (branch: Branch, compact = false) => (
    <div className={`flex items-center ${compact ? 'justify-center gap-0.5' : 'justify-end gap-1'} `}>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => setQrBranch(branch)}
        title={t.qrTitle}
      >
        <QrCode className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleExportBranchPackage(branch)}
        title={t.exportPkg}
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      {hasPermission('branches.edit') && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(branch)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
      )}
      {hasPermission('branches.delete') && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => setDeleteTarget(branch)}
          disabled={branch.isHeadquarters}
          title={branch.isHeadquarters ? t.headquarters : t.confirmDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-3`}>
        {/* Toolbar — fixed; only content below scrolls */}
        <div className="shrink-0 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1.5 shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{t.title}</span>
          </div>

          <div className="relative flex-1 min-w-[140px] max-w-[240px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder={t.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={provinceFilter} onValueChange={setProvinceFilter}>
            <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
              <SelectValue placeholder={t.allProvinces} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allProvinces}</SelectItem>
              {provinces.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="h-8 bg-muted/40 p-0.5">
              <TabsTrigger value="cards" className="text-xs gap-1 h-7 px-2.5">
                <LayoutGrid className="h-3.5 w-3.5" />
                {t.cards}
              </TabsTrigger>
              <TabsTrigger value="table" className="text-xs gap-1 h-7 px-2.5">
                <Table2 className="h-3.5 w-3.5" />
                {t.table}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span className="font-medium text-foreground">{filteredBranches.length}</span> {t.branches}
            <span className="text-border">|</span>
            <span className="font-medium text-foreground">{Object.keys(branchesByProvince).length}</span>{' '}
            {t.provinces}
            <span className="text-border">|</span>
            <Users className="h-3 w-3" />
            <span className="font-medium text-foreground">{totalEmployees}</span> {t.employees}
          </div>

          {hasPermission('branches.create') && (
            <Button size="sm" className="h-8 text-xs shrink-0 ml-auto gap-1" onClick={handleAddNew}>
              <Plus className="h-3.5 w-3.5" />
              {t.add}
            </Button>
          )}
        </div>

        <BranchFormDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} branch={editingBranch} />

        {/* Scrollable content only */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {filteredBranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building2 className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">{t.noResults}</p>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="space-y-5 pb-4">
              {Object.entries(branchesByProvince).map(([province, provinceBranches]) => (
                <div key={province}>
                  <h2 className="text-sm font-semibold mb-2 flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-[1]">
                    <MapPin className="h-4 w-4 text-primary" />
                    {province}
                    <Badge variant="secondary" className="text-[10px]">
                      {provinceBranches.length}
                    </Badge>
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {provinceBranches.map((branch) => {
                      const empCount = employeeCountByBranch.get(branch.id) || 0;
                      return (
                        <div
                          key={branch.id}
                          className="rounded-xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                  branch.isHeadquarters
                                    ? 'bg-accent/20 text-accent'
                                    : 'bg-primary/10 text-primary'
                                }`}
                              >
                                {branch.isHeadquarters ? (
                                  <Crown className="h-5 w-5" />
                                ) : (
                                  <Building2 className="h-5 w-5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-semibold text-sm truncate">{branch.name}</h3>
                                <p className="text-xs text-muted-foreground">{branch.code}</p>
                              </div>
                            </div>
                            <Badge
                              variant={branch.isHeadquarters ? 'default' : 'outline'}
                              className="text-[10px] shrink-0"
                            >
                              {branch.isHeadquarters ? t.headquarters : t.branch}
                            </Badge>
                          </div>

                          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {branch.city}, {branch.province}
                            </div>
                            {branch.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                {branch.phone}
                              </div>
                            )}
                            {branch.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{branch.email}</span>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                            onClick={() => goToEmployees(branch.id)}
                          >
                            <Users className="h-3.5 w-3.5" />
                            {empCount} {t.employees}
                          </button>

                          <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-border/50">
                            {renderActions(branch)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
              <table className="w-full min-w-[880px] text-sm">
                <thead className={ATTENDANCE_THEAD}>
                  <tr>
                    <th className={ATTENDANCE_TH}>{t.name}</th>
                    <th className={ATTENDANCE_TH}>{t.code}</th>
                    <th className={ATTENDANCE_TH}>{t.province}</th>
                    <th className={ATTENDANCE_TH}>{t.city}</th>
                    <th className={ATTENDANCE_TH_CENTER}>{t.employees}</th>
                    <th className={ATTENDANCE_TH_CENTER}>{t.branch}</th>
                    <th className={`${ATTENDANCE_TH_CENTER} w-36`}>{t.actions}</th>
                  </tr>
                </thead>
                <tbody className={ATTENDANCE_TBODY}>
                  {filteredBranches.map((branch) => {
                    const empCount = employeeCountByBranch.get(branch.id) || 0;
                    return (
                      <tr key={branch.id} className="hover:bg-muted/20">
                        <td className={ATTENDANCE_TD}>
                          <div className="flex items-center gap-2">
                            {branch.isHeadquarters ? (
                              <Crown className="h-3.5 w-3.5 text-accent shrink-0" />
                            ) : (
                              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                            <span className="font-medium text-sm">{branch.name}</span>
                          </div>
                        </td>
                        <td className={`${ATTENDANCE_TD} text-xs font-mono text-muted-foreground`}>
                          {branch.code}
                        </td>
                        <td className={`${ATTENDANCE_TD} text-xs`}>{branch.province}</td>
                        <td className={`${ATTENDANCE_TD} text-xs`}>{branch.city}</td>
                        <td className={`${ATTENDANCE_TD} text-center`}>
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:underline"
                            onClick={() => goToEmployees(branch.id)}
                          >
                            {empCount}
                          </button>
                        </td>
                        <td className={`${ATTENDANCE_TD} text-center`}>
                          <Badge
                            variant={branch.isHeadquarters ? 'default' : 'outline'}
                            className="text-[10px]"
                          >
                            {branch.isHeadquarters ? t.headquarters : t.branch}
                          </Badge>
                        </td>
                        <td className={ATTENDANCE_TD}>{renderActions(branch, true)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* QR Dialog */}
        <Dialog open={!!qrBranch} onOpenChange={(open) => !open && setQrBranch(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">{qrBranch?.name}</DialogTitle>
              <DialogDescription className="text-center">{t.qrDesc}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-4 rounded-xl border">
                {qrBranch && <QRCodeSVG value={getAttendanceUrl(qrBranch)} size={220} level="L" />}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {employeeCountByBranch.get(qrBranch?.id || '') || 0} {t.employees}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    if (qrBranch) {
                      navigator.clipboard.writeText(getAttendanceUrl(qrBranch));
                      toast.success(t.linkCopied);
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t.copyLink}
                </Button>
                <Button size="sm" className="gap-1.5 text-xs" onClick={() => handleQrPrint()}>
                  <Printer className="h-3.5 w-3.5" />
                  {t.printQr}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hidden print layout */}
        <div className="hidden">
          <div ref={qrPrintRef} className="p-8 text-center text-black bg-white">
            {qrBranch && (
              <>
                <h1 className="text-xl font-bold mb-1">{qrBranch.name}</h1>
                <p className="text-sm text-gray-600 mb-4">{qrBranch.code} — {t.qrTitle}</p>
                <div className="inline-block p-4 border rounded-lg">
                  <QRCodeSVG value={getAttendanceUrl(qrBranch)} size={280} level="L" />
                </div>
                <p className="text-xs mt-4 text-gray-500">{t.qrDesc}</p>
              </>
            )}
          </div>
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.name} ({deleteTarget?.code}) — {t.deleteDesc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleConfirmDelete}
              >
                {t.confirmDelete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TopNavLayout>
  );
}
