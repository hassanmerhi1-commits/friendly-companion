import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { pt as ptLocale } from 'date-fns/locale';
import { EmployeeSearchSelect } from '@/components/EmployeeSearchSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AttendanceTablePanel,
  ATTENDANCE_TH,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import { printHtml } from '@/lib/print';
import { buildAdvanceRequestPrintHtml } from '@/lib/printable-advance-request';
import { useAuthStore } from '@/stores/auth-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { useSettingsStore } from '@/stores/settings-store';
import { usePayrollStore } from '@/stores/payroll-store';
import {
  useAdvanceRequestStore,
  computeEmployeeAmountOwed,
} from '@/stores/advance-request-store';
import { buildSelectablePayrollMonths } from '@/lib/payroll-period-options';
import { formatPeriodLabel } from '@/lib/salary-advance-scheduling';
import type { AdvanceRequest } from '@/types/advance-request';
import { CheckCircle, FileText, Pencil, Plus, Printer, Search, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type FormState = {
  employeeId: string;
  requestedAmount: string;
  reason: string;
  installments: string;
  monthlyAmount: string;
  deductFromPeriodId: string;
  requestDate: string;
};

const emptyForm = (): FormState => ({
  employeeId: '',
  requestedAmount: '',
  reason: '',
  installments: '1',
  monthlyAmount: '',
  deductFromPeriodId: '',
  requestDate: new Date().toISOString().slice(0, 10),
});

function statusBadge(status: AdvanceRequest['status'], pt: boolean) {
  if (status === 'approved') {
    return <Badge className="bg-emerald-600/15 text-emerald-800 border-emerald-600/30">{pt ? 'Aprovado' : 'Approved'}</Badge>;
  }
  if (status === 'rejected') {
    return <Badge variant="destructive">{pt ? 'Rejeitado' : 'Rejected'}</Badge>;
  }
  return <Badge className="bg-amber-500/15 text-amber-800 border-amber-500/30">{pt ? 'Pendente' : 'Pending'}</Badge>;
}

export function AdvanceRequestsPanel() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { hasPermission } = useAuthStore();
  const canRequest = hasPermission('deductions.advance_request');
  const canApprove = hasPermission('deductions.advance_approve');
  const { employees } = useEmployeeStore();
  const { branches } = useBranchStore();
  const { settings } = useSettingsStore();
  const { periods } = usePayrollStore();
  const {
    requests,
    loadRequests,
    createRequest,
    updateRequest,
    approveRequest,
    rejectRequest,
    deleteRequest,
  } = useAdvanceRequestStore();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdvanceRequest | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdvanceRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const monthNames = pt
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const periodOptions = useMemo(
    () => buildSelectablePayrollMonths(periods, monthNames, { monthsBack: 3, monthsForward: 12 }),
    [periods, monthNames]
  );

  const liveOwed = useMemo(() => {
    if (!form.employeeId) return 0;
    return computeEmployeeAmountOwed(form.employeeId);
  }, [form.employeeId, requests]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active' || e.status === 'on_leave'),
    [employees]
  );

  const selectedEmp = employees.find((e) => e.id === form.employeeId);
  const selectedBranch = branches.find((b) => b.id === selectedEmp?.branchId);

  const filtered = useMemo(() => {
    let list = [...requests];
    if (filterStatus !== 'all') list = list.filter((r) => r.status === filterStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeNumber.toLowerCase().includes(q) ||
          r.branchName.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [requests, filterStatus, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (req: AdvanceRequest) => {
    setEditing(req);
    setForm({
      employeeId: req.employeeId,
      requestedAmount: String(req.requestedAmount || ''),
      reason: req.reason,
      installments: String(req.installments || 1),
      monthlyAmount: String(req.monthlyAmount || ''),
      deductFromPeriodId: req.deductFromPeriodId || '',
      requestDate: req.requestDate || new Date().toISOString().slice(0, 10),
    });
    setDialogOpen(true);
  };

  const handlePrint = async (req: AdvanceRequest) => {
    const html = buildAdvanceRequestPrintHtml({
      request: req,
      companyName: settings.companyName,
      companyLogo: settings.companyLogo,
      companyNif: settings.nif,
      language: pt ? 'pt' : 'en',
    });
    await printHtml(html);
  };

  const handleSave = async () => {
    if (!canRequest && !canApprove) {
      toast.error(pt ? 'Sem permissão' : 'No permission');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        employeeId: form.employeeId,
        requestedAmount: Number(form.requestedAmount) || 0,
        reason: form.reason,
        installments: Math.max(1, Number(form.installments) || 1),
        monthlyAmount: form.monthlyAmount ? Number(form.monthlyAmount) : undefined,
        deductFromPeriodId: form.deductFromPeriodId || undefined,
        requestDate: form.requestDate,
      };
      if (editing) {
        const res = await updateRequest(editing.id, payload);
        if (!res.success) {
          toast.error(res.error || (pt ? 'Erro ao guardar' : 'Save failed'));
          return;
        }
        toast.success(pt ? 'Pedido actualizado' : 'Request updated');
      } else {
        if (!canRequest) {
          toast.error(pt ? 'Sem permissão para criar pedido' : 'No permission to create request');
          return;
        }
        const res = await createRequest(payload);
        if (!res.success) {
          toast.error(res.error || (pt ? 'Erro ao criar' : 'Create failed'));
          return;
        }
        toast.success(pt ? 'Pedido criado (pendente)' : 'Request created (pending)');
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (req: AdvanceRequest) => {
    if (!canApprove) {
      toast.error(pt ? 'Sem permissão para aprovar' : 'No permission to approve');
      return;
    }
    const res = await approveRequest(req.id);
    if (!res.success) {
      toast.error(res.error || (pt ? 'Erro ao aprovar' : 'Approve failed'));
      return;
    }
    toast.success(pt ? 'Aprovado — dedução criada na folha' : 'Approved — deduction created');
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    const res = await rejectRequest(rejectTarget.id, rejectReason);
    if (!res.success) {
      toast.error(res.error || (pt ? 'Erro ao rejeitar' : 'Reject failed'));
      return;
    }
    toast.success(pt ? 'Pedido rejeitado' : 'Request rejected');
    setRejectOpen(false);
    setRejectTarget(null);
    setRejectReason('');
  };

  const handleDelete = async (req: AdvanceRequest) => {
    if (!canApprove && !canRequest) return;
    const res = await deleteRequest(req.id);
    if (!res.success) {
      toast.error(res.error || (pt ? 'Erro ao eliminar' : 'Delete failed'));
      return;
    }
    toast.success(pt ? 'Pedido eliminado' : 'Request deleted');
  };

  return (
    <div className="flex flex-col min-h-0 flex-1 gap-2">
      <div className="shrink-0 flex flex-wrap items-center gap-2 px-1">
        <div className="relative flex-1 min-w-[160px] max-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-xs"
            placeholder={pt ? 'Nome, filial, motivo...' : 'Name, branch, reason...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{pt ? 'Todos' : 'All'}</SelectItem>
            <SelectItem value="pending">{pt ? 'Pendentes' : 'Pending'}</SelectItem>
            <SelectItem value="approved">{pt ? 'Aprovados' : 'Approved'}</SelectItem>
            <SelectItem value="rejected">{pt ? 'Rejeitados' : 'Rejected'}</SelectItem>
          </SelectContent>
        </Select>
        {canRequest && (
          <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {pt ? 'Novo pedido' : 'New request'}
          </Button>
        )}
      </div>

      <AttendanceTablePanel className="flex-1 min-h-0">
        <table className="w-full text-xs">
          <thead className={ATTENDANCE_THEAD}>
            <tr>
              <th className={ATTENDANCE_TH}>{pt ? 'Data' : 'Date'}</th>
              <th className={ATTENDANCE_TH}>{pt ? 'Funcionário' : 'Employee'}</th>
              <th className={ATTENDANCE_TH}>{pt ? 'Filial' : 'Branch'}</th>
              <th className={ATTENDANCE_TH_RIGHT}>{pt ? 'Pedido' : 'Amount'}</th>
              <th className={ATTENDANCE_TH_RIGHT}>{pt ? 'Em dívida' : 'Owed'}</th>
              <th className={ATTENDANCE_TH}>{pt ? 'Motivo' : 'Reason'}</th>
              <th className={ATTENDANCE_TH_CENTER}>{pt ? 'Estado' : 'Status'}</th>
              <th className={cn(ATTENDANCE_TH_CENTER, 'w-[160px]')}>{pt ? 'Acções' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className={ATTENDANCE_TBODY}>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className={cn(ATTENDANCE_TD, 'text-center text-muted-foreground py-8')}>
                  {pt ? 'Nenhum pedido de adiantamento' : 'No advance requests'}
                </td>
              </tr>
            )}
            {filtered.map((req) => (
              <tr key={req.id}>
                <td className={ATTENDANCE_TD}>
                  {req.requestDate
                    ? format(new Date(req.requestDate + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt ? ptLocale : undefined })
                    : '—'}
                </td>
                <td className={ATTENDANCE_TD}>
                  <div className="font-medium">{req.employeeName}</div>
                  <div className="text-[10px] text-muted-foreground">{req.employeeNumber}</div>
                </td>
                <td className={ATTENDANCE_TD}>{req.branchName || '—'}</td>
                <td className={ATTENDANCE_TH_RIGHT}>{formatAOA(req.requestedAmount)}</td>
                <td className={ATTENDANCE_TH_RIGHT}>{formatAOA(req.amountOwed)}</td>
                <td className={ATTENDANCE_TD}>
                  <span className="line-clamp-2 max-w-[220px]">{req.reason}</span>
                </td>
                <td className={cn(ATTENDANCE_TD, 'text-center')}>{statusBadge(req.status, pt)}</td>
                <td className={cn(ATTENDANCE_TD, 'text-center')}>
                  <div className="inline-flex items-center gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={pt ? 'Imprimir' : 'Print'} onClick={() => void handlePrint(req)}>
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    {req.status === 'pending' && (canRequest || canApprove) && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={pt ? 'Editar' : 'Edit'} onClick={() => openEdit(req)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {req.status === 'pending' && canApprove && (
                      <>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-emerald-700" title={pt ? 'Aprovar' : 'Approve'} onClick={() => void handleApprove(req)}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          title={pt ? 'Rejeitar' : 'Reject'}
                          onClick={() => {
                            setRejectTarget(req);
                            setRejectReason('');
                            setRejectOpen(true);
                          }}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {req.status !== 'approved' && (canApprove || canRequest) && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title={pt ? 'Eliminar' : 'Delete'} onClick={() => void handleDelete(req)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AttendanceTablePanel>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              {editing
                ? pt
                  ? 'Editar pedido de adiantamento'
                  : 'Edit advance request'
                : pt
                  ? 'Novo pedido de adiantamento'
                  : 'New advance request'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">{pt ? 'Funcionário *' : 'Employee *'}</Label>
              <EmployeeSearchSelect
                employees={activeEmployees}
                value={form.employeeId}
                onSelect={(id) => setForm((f) => ({ ...f, employeeId: id }))}
                disabled={!!editing && !canApprove}
              />
            </div>

            {selectedEmp && (
              <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-[11px] space-y-1">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{pt ? 'Filial' : 'Branch'}</span>
                  <span className="font-medium">{selectedBranch?.name || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{pt ? 'Cargo' : 'Position'}</span>
                  <span className="font-medium">{selectedEmp.position || selectedEmp.category || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{pt ? 'Admissão' : 'Hire date'}</span>
                  <span className="font-medium">{selectedEmp.hireDate || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{pt ? 'Salário base' : 'Base salary'}</span>
                  <span className="font-medium">{formatAOA(selectedEmp.baseSalary || 0)}</span>
                </div>
                <div className="flex justify-between gap-2 border-t border-border/50 pt-1 mt-1">
                  <span className="text-muted-foreground">{pt ? 'Em dívida (tudo)' : 'Amount owed (all)'}</span>
                  <span className="font-semibold text-amber-800">{formatAOA(liveOwed)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{pt ? 'Valor pedido *' : 'Amount *'}</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={0}
                  value={form.requestedAmount}
                  onChange={(e) => setForm((f) => ({ ...f, requestedAmount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{pt ? 'Data do pedido' : 'Request date'}</Label>
                <Input
                  className="h-8 text-xs"
                  type="date"
                  value={form.requestDate}
                  onChange={(e) => setForm((f) => ({ ...f, requestDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{pt ? 'Nº prestações' : 'Installments'}</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={1}
                  value={form.installments}
                  onChange={(e) => setForm((f) => ({ ...f, installments: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{pt ? 'Prestação mensal' : 'Monthly amount'}</Label>
                <Input
                  className="h-8 text-xs"
                  type="number"
                  min={0}
                  placeholder={pt ? 'Auto' : 'Auto'}
                  value={form.monthlyAmount}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyAmount: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{pt ? 'Início na folha (opcional)' : 'Start on payroll (optional)'}</Label>
              <Select
                value={form.deductFromPeriodId || '__none__'}
                onValueChange={(v) => setForm((f) => ({ ...f, deductFromPeriodId: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={pt ? 'Automático' : 'Automatic'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{pt ? 'Automático' : 'Automatic'}</SelectItem>
                  {periodOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label || formatPeriodLabel(p.id, periods, monthNames)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{pt ? 'Motivo do pedido *' : 'Reason *'}</Label>
              <Textarea
                className="text-xs min-h-[80px]"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder={pt ? 'Ex.: Despesas médicas urgentes...' : 'e.g. Urgent medical expenses...'}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDialogOpen(false)}>
                {pt ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button type="button" size="sm" className="h-8 text-xs" disabled={saving} onClick={() => void handleSave()}>
                {saving ? (pt ? 'A guardar...' : 'Saving...') : pt ? 'Guardar' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{pt ? 'Rejeitar pedido' : 'Reject request'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              className="text-xs min-h-[80px]"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={pt ? 'Motivo da rejeição...' : 'Rejection reason...'}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRejectOpen(false)}>
                {pt ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button type="button" variant="destructive" size="sm" className="h-8 text-xs" onClick={() => void handleRejectConfirm()}>
                {pt ? 'Rejeitar' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
