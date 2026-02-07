import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { formatAOA } from '@/lib/angola-labor-law';
import type { Employee } from '@/types/employee';
import type { Loan } from '@/stores/loan-store';
import type { Branch } from '@/types/branch';

interface PrintableLoanReportProps {
  employees: Employee[];
  loans: Loan[];
  companyName: string;
  companyNif: string;
  branch?: Branch;
  onClose?: () => void;
}

/**
 * Relatório de Empréstimos - Loan/Advance Tracking Report
 * 
 * Shows all active loans and advances, payment schedules, and balances
 */
export const PrintableLoanReport: React.FC<PrintableLoanReportProps> = ({
  employees,
  loans,
  companyName,
  companyNif,
  branch,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relatorio-Emprestimos-${new Date().toISOString().split('T')[0]}`,
  });

  // Get employee name by ID
  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Desconhecido';
  };

  // Get employee department by ID
  const getEmployeeDepartment = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.department || '-';
  };

  // Separate by type
  const activeLoans = loans.filter(l => l.status === 'active' && l.type === 'loan');
  const activeAdvances = loans.filter(l => l.status === 'active' && l.type === 'advance');
  const paidLoans = loans.filter(l => l.status === 'paid');

  // Calculate totals
  const totals = {
    totalLoansAmount: activeLoans.reduce((sum, l) => sum + l.amount, 0),
    totalLoansRemaining: activeLoans.reduce((sum, l) => sum + l.remainingAmount, 0),
    totalLoansMonthly: activeLoans.reduce((sum, l) => sum + l.monthlyDeduction, 0),
    totalAdvancesAmount: activeAdvances.reduce((sum, l) => sum + l.amount, 0),
    totalAdvancesRemaining: activeAdvances.reduce((sum, l) => sum + l.remainingAmount, 0),
    totalAdvancesMonthly: activeAdvances.reduce((sum, l) => sum + l.monthlyDeduction, 0),
    totalPaidAmount: paidLoans.reduce((sum, l) => sum + l.amount, 0),
  };

  const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString('pt-AO') : '-';

  const renderLoanTable = (items: Loan[], title: string, showType = false) => (
    <div className="mb-6">
      <h3 className="font-bold text-sm mb-2 bg-gray-100 p-2">{title} ({items.length})</h3>
      {items.length === 0 ? (
        <p className="text-gray-500 text-sm p-2">Nenhum registo</p>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-black p-1 text-left">Funcionário</th>
              <th className="border border-black p-1 text-left">Departamento</th>
              {showType && <th className="border border-black p-1 text-center">Tipo</th>}
              <th className="border border-black p-1 text-right">Valor Total</th>
              <th className="border border-black p-1 text-right">Saldo</th>
              <th className="border border-black p-1 text-center">Prestações</th>
              <th className="border border-black p-1 text-right">Mensal</th>
              <th className="border border-black p-1 text-center">Início</th>
              <th className="border border-black p-1 text-left">Motivo</th>
              <th className="border border-black p-1 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((loan, idx) => (
              <tr key={loan.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-black p-1">{getEmployeeName(loan.employeeId)}</td>
                <td className="border border-black p-1">{getEmployeeDepartment(loan.employeeId)}</td>
                {showType && (
                  <td className="border border-black p-1 text-center">
                    {loan.type === 'loan' ? 'Empréstimo' : 'Adiantamento'}
                  </td>
                )}
                <td className="border border-black p-1 text-right">{formatAOA(loan.amount)}</td>
                <td className="border border-black p-1 text-right font-medium">
                  {formatAOA(loan.remainingAmount)}
                </td>
                <td className="border border-black p-1 text-center">
                  {loan.paidInstallments}/{loan.installments}
                </td>
                <td className="border border-black p-1 text-right">{formatAOA(loan.monthlyDeduction)}</td>
                <td className="border border-black p-1 text-center">{formatDate(loan.startDate)}</td>
                <td className="border border-black p-1 max-w-32 truncate" title={loan.reason}>
                  {loan.reason}
                </td>
                <td className="border border-black p-1 text-center">
                  {loan.status === 'active' ? '🔵 Activo' : loan.status === 'paid' ? '✅ Pago' : '❌ Cancelado'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button onClick={() => handlePrint()} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir
        </Button>
      </div>

      <div ref={printRef} className="bg-white text-black p-8 print:p-4 min-h-[297mm]">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase">Relatório de Empréstimos e Adiantamentos</h1>
          <h2 className="text-lg font-semibold mt-2">Situação Actual</h2>
        </div>

        {/* Company Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><strong>Empresa:</strong> {companyName}</p>
            <p><strong>NIF:</strong> {companyNif}</p>
          </div>
          <div className="text-right">
            {branch && (
              <>
                <p><strong>Filial:</strong> {branch.name}</p>
                <p><strong>Cidade:</strong> {branch.city}</p>
              </>
            )}
            <p><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-AO')}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-black p-3 text-center">
            <p className="text-sm">Empréstimos Activos</p>
            <p className="text-2xl font-bold">{activeLoans.length}</p>
            <p className="text-sm text-gray-600">{formatAOA(totals.totalLoansRemaining)}</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-sm">Adiantamentos Activos</p>
            <p className="text-2xl font-bold">{activeAdvances.length}</p>
            <p className="text-sm text-gray-600">{formatAOA(totals.totalAdvancesRemaining)}</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-sm">Dedução Mensal Total</p>
            <p className="text-2xl font-bold">
              {formatAOA(totals.totalLoansMonthly + totals.totalAdvancesMonthly)}
            </p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-sm">Liquidados</p>
            <p className="text-2xl font-bold">{paidLoans.length}</p>
            <p className="text-sm text-gray-600">{formatAOA(totals.totalPaidAmount)}</p>
          </div>
        </div>

        {/* Active Loans */}
        {renderLoanTable(activeLoans, '💼 Empréstimos Activos')}

        {/* Active Advances */}
        {renderLoanTable(activeAdvances, '💰 Adiantamentos Activos')}

        {/* Paid/Completed */}
        {renderLoanTable(paidLoans, '✅ Liquidados (Histórico)', true)}

        {/* Summary by Employee */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-2">Resumo por Funcionário (Activos)</h3>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-left">Funcionário</th>
                <th className="border border-black p-1 text-center">Empréstimos</th>
                <th className="border border-black p-1 text-center">Adiantamentos</th>
                <th className="border border-black p-1 text-right">Saldo Total</th>
                <th className="border border-black p-1 text-right">Dedução Mensal</th>
              </tr>
            </thead>
            <tbody>
              {employees
                .filter(emp => loans.some(l => l.employeeId === emp.id && l.status === 'active'))
                .map((emp, idx) => {
                  const empLoans = loans.filter(l => l.employeeId === emp.id && l.status === 'active');
                  const loanCount = empLoans.filter(l => l.type === 'loan').length;
                  const advanceCount = empLoans.filter(l => l.type === 'advance').length;
                  const totalRemaining = empLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
                  const totalMonthly = empLoans.reduce((sum, l) => sum + l.monthlyDeduction, 0);
                  
                  return (
                    <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-black p-1">{emp.firstName} {emp.lastName}</td>
                      <td className="border border-black p-1 text-center">{loanCount}</td>
                      <td className="border border-black p-1 text-center">{advanceCount}</td>
                      <td className="border border-black p-1 text-right font-medium">{formatAOA(totalRemaining)}</td>
                      <td className="border border-black p-1 text-right">{formatAOA(totalMonthly)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 text-sm">
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-16">
              <p>Responsável pelos Recursos Humanos</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-16">
              <p>Responsável Financeiro</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-600 border-t pt-4">
          <p>Nota: Os empréstimos e adiantamentos são deduzidos automaticamente do processamento salarial mensal.</p>
        </div>
      </div>
    </div>
  );
};
