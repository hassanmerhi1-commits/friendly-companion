import React, { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Printer, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { useReactToPrint } from 'react-to-print';
import { formatAOA } from '@/lib/angola-labor-law';
import { exportDeductionBalanceToXlsx } from '@/lib/export-utils';
import { getDeductionTypeLabel } from '@/stores/deduction-store';
import type { Employee } from '@/types/employee';
import type { Deduction, DeductionType } from '@/types/deduction';
import type { Loan } from '@/stores/loan-store';
import type { Branch } from '@/types/branch';

export interface DeductionBalanceRow {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  branchName: string;
  motive: string;
  motiveType: string;
  detail: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installments: number;
  installmentsPaid: number;
  monthlyAmount: number;
  status: 'active' | 'paid' | 'cancelled';
  startDate: string;
  source: 'deduction' | 'loan';
}

interface PrintableDeductionBalanceReportProps {
  employees: Employee[];
  deductions: Deduction[];
  loans: Loan[];
  branches: Branch[];
  companyName: string;
  companyNif: string;
  branch?: Branch;
  language?: string;
  onClose?: () => void;
}

function buildRows(
  employees: Employee[],
  deductions: Deduction[],
  loans: Loan[],
  branches: Branch[],
  branchFilter?: Branch,
  language = 'pt'
): DeductionBalanceRow[] {
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));
  const rows: DeductionBalanceRow[] = [];

  const inBranch = (employeeId: string) => {
    if (!branchFilter) return true;
    const emp = employeeMap.get(employeeId);
    return emp?.branchId === branchFilter.id;
  };

  for (const d of deductions) {
    // Empréstimos vêm do módulo Empréstimos (loan-store) — evita duplicar na tabela
    if (d.type === 'loan') continue;
    if (!inBranch(d.employeeId)) continue;
    const emp = employeeMap.get(d.employeeId);
    const paid = Math.max(0, d.totalAmount - d.remainingAmount);
    rows.push({
      id: `ded-${d.id}`,
      employeeId: d.employeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '—',
      department: emp?.department || '—',
      branchName: emp?.branchId ? branchMap.get(emp.branchId) || '—' : '—',
      motive: getDeductionTypeLabel(d.type, language),
      motiveType: d.type,
      detail: d.description || '—',
      totalAmount: d.totalAmount,
      paidAmount: paid,
      remainingAmount: d.remainingAmount,
      installments: d.installments,
      installmentsPaid: d.installmentsPaid,
      monthlyAmount: d.amount,
      status: d.isFullyPaid ? 'paid' : 'active',
      startDate: d.date || d.createdAt,
      source: 'deduction',
    });
  }

  for (const loan of loans) {
    if (!inBranch(loan.employeeId)) continue;
    const emp = employeeMap.get(loan.employeeId);
    const paid = Math.max(0, loan.amount - loan.remainingAmount);
    const motive =
      loan.type === 'loan'
        ? language === 'pt'
          ? 'Empréstimo'
          : 'Loan'
        : language === 'pt'
          ? 'Adiantamento Salarial'
          : 'Salary Advance';
    rows.push({
      id: `loan-${loan.id}`,
      employeeId: loan.employeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '—',
      department: emp?.department || '—',
      branchName: emp?.branchId ? branchMap.get(emp.branchId) || '—' : '—',
      motive,
      motiveType: loan.type === 'loan' ? 'loan' : 'salary_advance',
      detail: loan.reason || '—',
      totalAmount: loan.amount,
      paidAmount: paid,
      remainingAmount: loan.remainingAmount,
      installments: loan.installments,
      installmentsPaid: loan.paidInstallments,
      monthlyAmount: loan.monthlyDeduction,
      status: loan.status,
      startDate: loan.startDate || loan.createdAt,
      source: 'loan',
    });
  }

  return rows.sort((a, b) => {
    const nameCmp = a.employeeName.localeCompare(b.employeeName, 'pt');
    if (nameCmp !== 0) return nameCmp;
    return a.motive.localeCompare(b.motive, 'pt');
  });
}

export const PrintableDeductionBalanceReport: React.FC<PrintableDeductionBalanceReportProps> = ({
  employees,
  deductions,
  loans,
  branches,
  companyName,
  companyNif,
  branch,
  language = 'pt',
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const isPt = language === 'pt';
  const [motiveFilter, setMotiveFilter] = useState<string>('all');

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relatorio-Descontos-${new Date().toISOString().split('T')[0]}`,
  });

  const allRows = useMemo(
    () => buildRows(employees, deductions, loans, branches, branch, language),
    [employees, deductions, loans, branches, branch, language]
  );

  const motiveOptions = useMemo(() => {
    const set = new Set(allRows.map((r) => r.motive));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'));
  }, [allRows]);

  const rows = useMemo(() => {
    if (motiveFilter === 'all') return allRows;
    return allRows.filter((r) => r.motive === motiveFilter);
  }, [allRows, motiveFilter]);

  const activeRows = rows.filter((r) => r.status === 'active');
  const totals = useMemo(
    () => ({
      total: rows.reduce((s, r) => s + r.totalAmount, 0),
      paid: rows.reduce((s, r) => s + r.paidAmount, 0),
      remaining: activeRows.reduce((s, r) => s + r.remainingAmount, 0),
      monthly: activeRows.reduce((s, r) => s + r.monthlyAmount, 0),
    }),
    [rows, activeRows]
  );

  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString('pt-AO') : '—';

  const statusLabel = (status: DeductionBalanceRow['status']) => {
    if (status === 'paid') return isPt ? 'Pago' : 'Paid';
    if (status === 'cancelled') return isPt ? 'Cancelado' : 'Cancelled';
    return isPt ? 'Activo' : 'Active';
  };

  const handleExport = async () => {
    await exportDeductionBalanceToXlsx(
      rows.map((r) => ({
        employeeName: r.employeeName,
        department: r.department,
        branchName: r.branchName,
        motive: r.motive,
        detail: r.detail,
        totalAmount: r.totalAmount,
        paidAmount: r.paidAmount,
        remainingAmount: r.remainingAmount,
        installments: r.installments,
        installmentsPaid: r.installmentsPaid,
        monthlyAmount: r.monthlyAmount,
        status: statusLabel(r.status),
        startDate: r.startDate,
      })),
      language,
      {
        companyName,
        companyNif,
        branchName: branch?.name,
      }
    );
    toast.success(isPt ? 'Ficheiro Excel (.xlsx) exportado' : 'Excel (.xlsx) file exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div className="space-y-1 min-w-[220px]">
          <Label className="text-xs">{isPt ? 'Filtrar por motivo / tipo' : 'Filter by type'}</Label>
          <Select value={motiveFilter} onValueChange={setMotiveFilter}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isPt ? 'Todos (empresa inteira)' : 'All (whole company)'}</SelectItem>
              {motiveOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => handlePrint()}>
          <Printer className="h-4 w-4 mr-2" />
          {isPt ? 'Imprimir' : 'Print'}
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
          <FileDown className="h-4 w-4 mr-2" />
          {isPt ? 'Exportar Excel (.xlsx)' : 'Export Excel (.xlsx)'}
        </Button>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            {isPt ? 'Fechar' : 'Close'}
          </Button>
        )}
      </div>

      <div ref={printRef} className="bg-white text-black p-6 text-sm">
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-xl font-bold">{companyName}</h1>
          <p className="text-xs">NIF: {companyNif}</p>
          <h2 className="text-lg font-bold mt-3">
            {isPt ? 'Relatório Geral de Descontos e Empréstimos' : 'Deductions & Loans Balance Report'}
          </h2>
          {branch && (
            <p className="text-sm mt-1">
              {isPt ? 'Filial:' : 'Branch:'} {branch.name}
            </p>
          )}
          <p className="text-xs text-gray-600 mt-1">
            {isPt ? 'Emitido em' : 'Issued on'} {new Date().toLocaleDateString('pt-AO')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-xs">
          <div className="border border-gray-300 p-2 rounded">
            <p className="text-gray-600">{isPt ? 'Registos' : 'Records'}</p>
            <p className="font-bold text-lg">{rows.length}</p>
          </div>
          <div className="border border-gray-300 p-2 rounded">
            <p className="text-gray-600">{isPt ? 'Valor Total' : 'Total Amount'}</p>
            <p className="font-bold">{formatAOA(totals.total)}</p>
          </div>
          <div className="border border-gray-300 p-2 rounded">
            <p className="text-gray-600">{isPt ? 'Já Descontado' : 'Already Deducted'}</p>
            <p className="font-bold text-green-700">{formatAOA(totals.paid)}</p>
          </div>
          <div className="border border-gray-300 p-2 rounded">
            <p className="text-gray-600">{isPt ? 'Por Descontar' : 'Still to Deduct'}</p>
            <p className="font-bold text-red-700">{formatAOA(totals.remaining)}</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            {isPt ? 'Nenhum desconto ou empréstimo registado.' : 'No deductions or loans recorded.'}
          </p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-left">{isPt ? 'Funcionário' : 'Employee'}</th>
                <th className="border border-black p-1 text-left">{isPt ? 'Departamento' : 'Department'}</th>
                <th className="border border-black p-1 text-left">{isPt ? 'Filial' : 'Branch'}</th>
                <th className="border border-black p-1 text-left">{isPt ? 'Motivo / Tipo' : 'Type'}</th>
                <th className="border border-black p-1 text-left">{isPt ? 'Detalhe' : 'Detail'}</th>
                <th className="border border-black p-1 text-right">{isPt ? 'Total' : 'Total'}</th>
                <th className="border border-black p-1 text-right">{isPt ? 'Descontado' : 'Deducted'}</th>
                <th className="border border-black p-1 text-right">{isPt ? 'Restante' : 'Remaining'}</th>
                <th className="border border-black p-1 text-center">{isPt ? 'Prestações' : 'Installments'}</th>
                <th className="border border-black p-1 text-right">{isPt ? 'Mensal' : 'Monthly'}</th>
                <th className="border border-black p-1 text-center">{isPt ? 'Início' : 'Start'}</th>
                <th className="border border-black p-1 text-center">{isPt ? 'Estado' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-black p-1 font-medium">{row.employeeName}</td>
                  <td className="border border-black p-1">{row.department}</td>
                  <td className="border border-black p-1">{row.branchName}</td>
                  <td className="border border-black p-1">{row.motive}</td>
                  <td className="border border-black p-1 max-w-[140px] truncate" title={row.detail}>
                    {row.detail}
                  </td>
                  <td className="border border-black p-1 text-right">{formatAOA(row.totalAmount)}</td>
                  <td className="border border-black p-1 text-right text-green-800">
                    {formatAOA(row.paidAmount)}
                  </td>
                  <td className="border border-black p-1 text-right font-medium text-red-800">
                    {formatAOA(row.remainingAmount)}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {row.installmentsPaid}/{row.installments}
                  </td>
                  <td className="border border-black p-1 text-right">{formatAOA(row.monthlyAmount)}</td>
                  <td className="border border-black p-1 text-center">{formatDate(row.startDate)}</td>
                  <td className="border border-black p-1 text-center">{statusLabel(row.status)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-bold">
                <td colSpan={5} className="border border-black p-1 text-right">
                  {isPt ? 'TOTAIS' : 'TOTALS'}
                </td>
                <td className="border border-black p-1 text-right">{formatAOA(totals.total)}</td>
                <td className="border border-black p-1 text-right">{formatAOA(totals.paid)}</td>
                <td className="border border-black p-1 text-right">{formatAOA(totals.remaining)}</td>
                <td colSpan={4} className="border border-black p-1" />
              </tr>
            </tfoot>
          </table>
        )}

        <div className="mt-6 text-xs text-gray-600">
          <p>
            {isPt
              ? 'Motivos: Adiantamento Salarial, Perda no Armazém, Falta Injustificada, Empréstimo, Desconto Disciplinar, Outros.'
              : 'Types: salary advance, warehouse loss, unjustified absence, loan, disciplinary, other.'}
          </p>
          <p className="mt-1">
            {isPt ? 'Descontos activos mensais estimados:' : 'Estimated active monthly deductions:'}{' '}
            <strong>{formatAOA(totals.monthly)}</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export { buildRows as buildDeductionBalanceRows };
