import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AttendanceTablePanel,
  ATTENDANCE_TH,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';
import { EmployeeSearchSelect } from '@/components/EmployeeSearchSelect';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBranchStore } from '@/stores/branch-store';
import { useHRStore } from '@/stores/hr-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/lib/i18n';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function BranchTransfersPanel() {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { employees } = useEmployeeStore();
  const { branches } = useBranchStore();
  const { branchTransfers, transferEmployeeBranch } = useHRStore();
  const { currentUser, hasPermission } = useAuthStore();

  const [employeeId, setEmployeeId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(
    () => new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const canTransfer = hasPermission('hr.create') || hasPermission('hr.edit') || hasPermission('hr.transfer');

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'active'),
    [employees]
  );

  const selected = activeEmployees.find((e) => e.id === employeeId);
  const fromBranchId = selected?.branchId || '';
  const fromBranchName =
    branches.find((b) => b.id === fromBranchId)?.name ||
    (fromBranchId ? fromBranchId : pt ? 'Sem filial' : 'No branch');

  const destinationBranches = useMemo(
    () =>
      branches.filter((b) => {
        if (fromBranchId && b.id === fromBranchId) return false;
        return true;
      }),
    [branches, fromBranchId]
  );

  const filteredHistory = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return branchTransfers;
    return branchTransfers.filter(
      (t) =>
        t.employeeName.toLowerCase().includes(q) ||
        t.fromBranchName.toLowerCase().includes(q) ||
        t.toBranchName.toLowerCase().includes(q) ||
        (t.reason || '').toLowerCase().includes(q)
    );
  }, [branchTransfers, filter]);

  const handleSubmit = async () => {
    if (!canTransfer) {
      toast.error(pt ? 'Sem permissão para transferir' : 'No permission to transfer');
      return;
    }
    if (!employeeId) {
      toast.error(pt ? 'Selecione o colaborador' : 'Select an employee');
      return;
    }
    if (!toBranchId) {
      toast.error(pt ? 'Selecione a filial de destino' : 'Select destination branch');
      return;
    }
    if (!effectiveDate) {
      toast.error(pt ? 'Indique a data de efeito' : 'Enter effective date');
      return;
    }

    setLoading(true);
    try {
      const result = await transferEmployeeBranch(
        {
          employeeId,
          toBranchId,
          effectiveDate,
          reason: reason.trim() || undefined,
        },
        currentUser?.username || currentUser?.name || 'system'
      );

      if (!result.success) {
        toast.error(
          result.error ||
            (pt ? 'Falha na transferência' : 'Transfer failed')
        );
        return;
      }

      toast.success(
        pt
          ? `Transferido: ${result.record?.fromBranchName} → ${result.record?.toBranchName}`
          : `Transferred: ${result.record?.fromBranchName} → ${result.record?.toBranchName}`
      );
      setEmployeeId('');
      setToBranchId('');
      setReason('');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              {pt ? 'Nova transferência de filial' : 'New branch transfer'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="rounded-md border border-dashed bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
              {pt
                ? 'Atualiza a filial do colaborador e regista histórico. Não altera salário, contrato nem dívidas.'
                : 'Updates the employee branch and keeps history. Does not change salary, contract, or debts.'}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{pt ? 'Colaborador' : 'Employee'}</Label>
              <EmployeeSearchSelect
                employees={activeEmployees}
                value={employeeId}
                onSelect={(id) => {
                  setEmployeeId(id);
                  setToBranchId('');
                }}
              />
            </div>

            {selected && (
              <div className="rounded-md border px-3 py-2 text-xs">
                <span className="text-muted-foreground">{pt ? 'Filial atual' : 'Current branch'}: </span>
                <span className="font-medium">{fromBranchName}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">{pt ? 'Filial de destino' : 'Destination branch'}</Label>
              <Select
                value={toBranchId || undefined}
                onValueChange={setToBranchId}
                disabled={!selected}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue
                    placeholder={pt ? 'Escolher filial...' : 'Choose branch...'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {destinationBranches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{pt ? 'Data de efeito' : 'Effective date'}</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{pt ? 'Motivo (opcional)' : 'Reason (optional)'}</Label>
              <Textarea
                className="text-xs min-h-[64px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  pt
                    ? 'Ex: necessidade operacional, pedido da gestão...'
                    : 'e.g. operational need, management request...'
                }
                maxLength={500}
              />
            </div>

            {canTransfer && (
              <Button
                className="w-full h-8 text-xs"
                onClick={handleSubmit}
                disabled={loading || !selected || !toBranchId}
              >
                {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {pt ? 'Confirmar transferência' : 'Confirm transfer'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">
              {pt ? 'Como funciona' : 'How it works'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 text-xs text-muted-foreground space-y-2">
            <p>
              {pt
                ? '1. Escolha o colaborador ativo — vê a filial atual.'
                : '1. Pick an active employee — current branch is shown.'}
            </p>
            <p>
              {pt
                ? '2. Escolha a filial de destino (não pode ser a mesma).'
                : '2. Choose destination (cannot be the same branch).'}
            </p>
            <p>
              {pt
                ? '3. Defina a data de efeito e confirme — fica no histórico.'
                : '3. Set effective date and confirm — saved to history.'}
            </p>
            <p>
              {pt
                ? 'Listagens por filial (folha, presença, cartões) passam a usar a nova filial.'
                : 'Branch filters (payroll, attendance, cards) use the new branch afterwards.'}
            </p>
          </CardContent>
        </Card>
      </div>

      <AttendanceTablePanel
        toolbar={
          <div className="px-3 py-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold">
              {pt ? 'Histórico de transferências' : 'Transfer history'}
            </span>
            <Input
              className="h-7 text-xs max-w-[220px] ml-auto"
              placeholder={pt ? 'Filtrar...' : 'Filter...'}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        }
      >
        <table className="w-full min-w-[720px]">
          <thead className={ATTENDANCE_THEAD}>
            <tr>
              <th className={ATTENDANCE_TH}>{pt ? 'Data' : 'Date'}</th>
              <th className={ATTENDANCE_TH}>{pt ? 'Colaborador' : 'Employee'}</th>
              <th className={ATTENDANCE_TH}>{pt ? 'De' : 'From'}</th>
              <th className={ATTENDANCE_TH}>{pt ? 'Para' : 'To'}</th>
              <th className={ATTENDANCE_TH}>{pt ? 'Motivo' : 'Reason'}</th>
              <th className={ATTENDANCE_TH}>{pt ? 'Por' : 'By'}</th>
            </tr>
          </thead>
          <tbody className={ATTENDANCE_TBODY}>
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={6} className={`${ATTENDANCE_TD} text-center text-muted-foreground text-xs py-8`}>
                  {pt ? 'Ainda sem transferências registadas' : 'No transfers recorded yet'}
                </td>
              </tr>
            ) : (
              filteredHistory.map((t) => (
                <tr key={t.id} className="hover:bg-muted/20">
                  <td className={`${ATTENDANCE_TD} text-xs whitespace-nowrap`}>
                    {t.effectiveDate
                      ? new Date(t.effectiveDate + 'T12:00:00').toLocaleDateString(
                          pt ? 'pt-PT' : 'en-GB'
                        )
                      : '—'}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-sm font-medium`}>{t.employeeName}</td>
                  <td className={`${ATTENDANCE_TD} text-xs`}>{t.fromBranchName || '—'}</td>
                  <td className={`${ATTENDANCE_TD} text-xs font-medium`}>{t.toBranchName}</td>
                  <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground max-w-[200px] truncate`} title={t.reason || ''}>
                    {t.reason || '—'}
                  </td>
                  <td className={`${ATTENDANCE_TD} text-xs`}>{t.transferredBy || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AttendanceTablePanel>
    </div>
  );
}
