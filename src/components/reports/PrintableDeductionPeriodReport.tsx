import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { formatAOA } from '@/lib/angola-labor-law';
import { exportDeductionPeriodToXlsx } from '@/lib/export-utils';
import { getDeductionTypeLabel } from '@/stores/deduction-store';
import { useAuditStore } from '@/stores/audit-store';
import type { Employee } from '@/types/employee';
import type { Deduction, DeductionType } from '@/types/deduction';
import type { Branch } from '@/types/branch';

export interface DeductionPeriodRow {
  id: string;
  registeredAt: string;
  deductionDate: string;
  employeeId: string;
  employeeName: string;
  branchName: string;
  motive: string;
  motiveType: DeductionType | string;
  detail: string;
  totalAmount: number;
  monthlyAmount: number;
  installments: number;
  registeredBy: string;
}

interface PrintableDeductionPeriodReportProps {
  employees: Employee[];
  deductions: Deduction[];
  branches: Branch[];
  companyName: string;
  companyNif: string;
  branch?: Branch;
  language?: string;
  onClose?: () => void;
}

function toDayKey(isoOrDate: string | undefined): string {
  if (!isoOrDate) return '';
  // Prefer YYYY-MM-DD prefix (ISO or date input)
  const m = isoOrDate.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildRows(
  employees: Employee[],
  deductions: Deduction[],
  branches: Branch[],
  creatorByDeductionId: Map<string, string>,
  dateFrom: string,
  dateTo: string,
  branchFilter: Branch | undefined,
  language: string
): DeductionPeriodRow[] {
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));
  const rows: DeductionPeriodRow[] = [];

  for (const d of deductions) {
    // Filter by registration day (when it was inserted)
    const regDay = toDayKey(d.createdAt) || toDayKey(d.date);
    if (!regDay) continue;
    if (dateFrom && regDay < dateFrom) continue;
    if (dateTo && regDay > dateTo) continue;

    const emp = employeeMap.get(d.employeeId);
    if (branchFilter && emp?.branchId !== branchFilter.id) continue;

    const registeredBy =
      d.createdByName ||
      creatorByDeductionId.get(d.id) ||
      (language === 'pt' ? '—' : '—');

    rows.push({
      id: d.id,
      registeredAt: d.createdAt || d.date,
      deductionDate: d.date || d.createdAt,
      employeeId: d.employeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '—',
      branchName: emp?.branchId ? branchMap.get(emp.branchId) || '—' : '—',
      motive: getDeductionTypeLabel(d.type, language),
      motiveType: d.type,
      detail: d.description || '—',
      totalAmount: d.totalAmount,
      monthlyAmount: d.amount,
      installments: d.installments,
      registeredBy,
    });
  }

  return rows.sort((a, b) => {
    const ta = new Date(a.registeredAt).getTime();
    const tb = new Date(b.registeredAt).getTime();
    if (tb !== ta) return tb - ta;
    return a.employeeName.localeCompare(b.employeeName, 'pt');
  });
}

export const PrintableDeductionPeriodReport: React.FC<PrintableDeductionPeriodReportProps> = ({
  employees,
  deductions,
  branches,
  companyName,
  companyNif,
  branch,
  language = 'pt',
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const isPt = language === 'pt';
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(todayKey);
  const [motiveFilter, setMotiveFilter] = useState<string>('all');

  const { logs, isLoaded, loadAuditLogs } = useAuditStore();

  useEffect(() => {
    if (!isLoaded) void loadAuditLogs();
  }, [isLoaded, loadAuditLogs]);

  const creatorByDeductionId = useMemo(() => {
    const map = new Map<string, string>();
    for (const log of logs) {
      if (log.action !== 'deduction_created' || !log.entityId) continue;
      if (map.has(log.entityId)) continue;
      const name = log.userName?.trim();
      if (name) map.set(log.entityId, name);
    }
    return map;
  }, [logs]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Descontos-Periodo-${dateFrom}-${dateTo}`,
  });

  const allRows = useMemo(
    () =>
      buildRows(
        employees,
        deductions,
        branches,
        creatorByDeductionId,
        dateFrom,
        dateTo,
        branch,
        language
      ),
    [employees, deductions, branches, creatorByDeductionId, dateFrom, dateTo, branch, language]
  );

  const motiveOptions = useMemo(() => {
    const set = new Set(allRows.map((r) => r.motive));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'));
  }, [allRows]);

  const rows = useMemo(() => {
    if (motiveFilter === 'all') return allRows;
    return allRows.filter((r) => r.motive === motiveFilter);
  }, [allRows, motiveFilter]);

  const totals = useMemo(
    () => ({
      count: rows.length,
      total: rows.reduce((s, r) => s + r.totalAmount, 0),
      monthly: rows.reduce((s, r) => s + r.monthlyAmount, 0),
    }),
    [rows]
  );

  const byUser = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const r of rows) {
      const key = r.registeredBy || '—';
      const cur = map.get(key) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += r.totalAmount;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [rows]);

  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString('pt-AO') : '—';

  const rangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const handleExport = async () => {
    if (rangeInvalid) {
      toast.error(isPt ? 'Data De não pode ser depois de Até' : 'From date cannot be after To');
      return;
    }
    await exportDeductionPeriodToXlsx(
      rows.map((r) => ({
        registeredAt: r.registeredAt,
        deductionDate: r.deductionDate,
        employeeName: r.employeeName,
        branchName: r.branchName,
        motive: r.motive,
        detail: r.detail,
        totalAmount: r.totalAmount,
        monthlyAmount: r.monthlyAmount,
        installments: r.installments,
        registeredBy: r.registeredBy,
      })),
      language,
      {
        companyName,
        companyNif,
        branchName: branch?.name,
        dateFrom,
        dateTo,
      }
    );
    toast.success(isPt ? 'Ficheiro Excel (.xlsx) exportado' : 'Excel (.xlsx) file exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="space-y-1">
          <Label className="text-xs">{isPt ? 'De' : 'From'}</Label>
          <Input
            type="date"
            className="h-9 w-[150px]"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{isPt ? 'Até' : 'To'}</Label>
          <Input
            type="date"
            className="h-9 w-[150px]"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="space-y-1 min-w-[200px]">
          <Label className="text-xs">{isPt ? 'Filtrar por tipo' : 'Filter by type'}</Label>
          <Select value={motiveFilter} onValueChange={setMotiveFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isPt ? 'Todos os tipos' : 'All types'}</SelectItem>
              {motiveOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => handlePrint()} disabled={rangeInvalid || rows.length === 0}>
          <Printer className="h-4 w-4 mr-2" />
          {isPt ? 'Imprimir' : 'Print'}
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={rangeInvalid || rows.length === 0}
        >
          <FileDown className="h-4 w-4 mr-2" />
          {isPt ? 'Exportar Excel (.xlsx)' : 'Export Excel (.xlsx)'}
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            {isPt ? 'Fechar' : 'Close'}
          </Button>
        )}
      </div>

      {rangeInvalid && (
        <p className="text-sm text-red-600 print:hidden">
          {isPt ? 'A data De não pode ser posterior à data Até.' : 'From date cannot be after To date.'}
        </p>
      )}

      <div ref={printRef} className="bg-white text-black p-6 text-sm">
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-xl font-bold">{companyName}</h1>
          <p className="text-xs">NIF: {companyNif}</p>
          <h2 className="text-lg font-bold mt-3">
            {isPt
              ? 'Relatório de Descontos Registados'
              : 'Registered Deductions Report'}
          </h2>
          <p className="text-sm mt-1">
            {isPt ? 'Período:' : 'Period:'} {formatDate(dateFrom)} → {formatDate(dateTo)}
          </p>
          {branch && (
            <p className="text-sm mt-1">
              {isPt ? 'Filial:' : 'Branch:'} {branch.name}
            </p>
          )}
          <p className="text-xs text-gray-600 mt-1">
            {isPt ? 'Emitido em' : 'Issued on'} {new Date().toLocaleDateString('pt-AO')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 text-xs">
          <div className="border border-gray-300 p-2 rounded">
            <p className="text-gray-600">{isPt ? 'Registos' : 'Records'}</p>
            <p className="font-bold text-lg">{totals.count}</p>
          </div>
          <div className="border border-gray-300 p-2 rounded">
            <p className="text-gray-600">{isPt ? 'Valor Total Registado' : 'Total Registered'}</p>
            <p className="font-bold">{formatAOA(totals.total)}</p>
          </div>
          <div className="border border-gray-300 p-2 rounded">
            <p className="text-gray-600">{isPt ? 'Soma das Prestações' : 'Sum of Installments'}</p>
            <p className="font-bold">{formatAOA(totals.monthly)}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {isPt
              ? 'Nenhum desconto registado neste período.'
              : 'No deductions registered in this period.'}
          </p>
        ) : (
          <>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 text-center">
                    {isPt ? 'Data Registo' : 'Registered'}
                  </th>
                  <th className="border border-black p-1 text-center">
                    {isPt ? 'Data Desconto' : 'Deduction Date'}
                  </th>
                  <th className="border border-black p-1 text-left">
                    {isPt ? 'Funcionário' : 'Employee'}
                  </th>
                  <th className="border border-black p-1 text-left">{isPt ? 'Filial' : 'Branch'}</th>
                  <th className="border border-black p-1 text-left">{isPt ? 'Tipo' : 'Type'}</th>
                  <th className="border border-black p-1 text-left">
                    {isPt ? 'Descrição' : 'Description'}
                  </th>
                  <th className="border border-black p-1 text-right">{isPt ? 'Total' : 'Total'}</th>
                  <th className="border border-black p-1 text-right">
                    {isPt ? 'Prestação' : 'Installment'}
                  </th>
                  <th className="border border-black p-1 text-center">Nº</th>
                  <th className="border border-black p-1 text-left">
                    {isPt ? 'Registado por' : 'Registered by'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-black p-1 text-center">
                      {formatDate(row.registeredAt)}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {formatDate(row.deductionDate)}
                    </td>
                    <td className="border border-black p-1 font-medium">{row.employeeName}</td>
                    <td className="border border-black p-1">{row.branchName}</td>
                    <td className="border border-black p-1">{row.motive}</td>
                    <td className="border border-black p-1 max-w-[160px] truncate" title={row.detail}>
                      {row.detail}
                    </td>
                    <td className="border border-black p-1 text-right font-medium">
                      {formatAOA(row.totalAmount)}
                    </td>
                    <td className="border border-black p-1 text-right">
                      {formatAOA(row.monthlyAmount)}
                    </td>
                    <td className="border border-black p-1 text-center">{row.installments}</td>
                    <td className="border border-black p-1">{row.registeredBy}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={6} className="border border-black p-1 text-right">
                    {isPt ? 'TOTAIS' : 'TOTALS'}
                  </td>
                  <td className="border border-black p-1 text-right">{formatAOA(totals.total)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(totals.monthly)}</td>
                  <td colSpan={2} className="border border-black p-1" />
                </tr>
              </tfoot>
            </table>

            {byUser.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-sm mb-2">
                  {isPt ? 'Resumo por utilizador' : 'Summary by user'}
                </h3>
                <table className="w-full max-w-md border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black p-1 text-left">
                        {isPt ? 'Utilizador' : 'User'}
                      </th>
                      <th className="border border-black p-1 text-center">
                        {isPt ? 'Qtd' : 'Qty'}
                      </th>
                      <th className="border border-black p-1 text-right">
                        {isPt ? 'Total' : 'Total'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {byUser.map((u) => (
                      <tr key={u.name}>
                        <td className="border border-black p-1">{u.name}</td>
                        <td className="border border-black p-1 text-center">{u.count}</td>
                        <td className="border border-black p-1 text-right">{formatAOA(u.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <div className="mt-6 text-xs text-gray-600">
          <p>
            {isPt
              ? 'Filtro por data de registo (quando o desconto foi inserido no sistema). A coluna «Data Desconto» é a data indicada no formulário.'
              : 'Filtered by registration date (when the deduction was entered). «Deduction Date» is the form date.'}
          </p>
        </div>
      </div>
    </div>
  );
};
