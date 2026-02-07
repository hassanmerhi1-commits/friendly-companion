import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import type { Employee } from '@/types/employee';
import type { HolidayRecord } from '@/stores/holiday-store';
import type { Branch } from '@/types/branch';

interface PrintableHolidayReportProps {
  employees: Employee[];
  holidayRecords: HolidayRecord[];
  year: number;
  companyName: string;
  companyNif: string;
  branch?: Branch;
  onClose?: () => void;
}

/**
 * Relatório de Férias - Annual Leave Tracking Report
 * 
 * Shows holiday balances, used days, and planned holidays per employee
 */
export const PrintableHolidayReport: React.FC<PrintableHolidayReportProps> = ({
  employees,
  holidayRecords,
  year,
  companyName,
  companyNif,
  branch,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relatorio-Ferias-${year}`,
  });

  // Annual leave entitlement in Angola: 22 working days
  const ANNUAL_ENTITLEMENT = 22;

  // Get holiday record for each employee
  const employeeHolidays = employees.map(emp => {
    const record = holidayRecords.find(r => r.employeeId === emp.id && r.year === year);
    const daysUsed = record?.daysUsed || 0;
    const daysRemaining = ANNUAL_ENTITLEMENT - daysUsed;
    
    // Calculate tenure
    const hireDate = new Date(emp.hireDate);
    const now = new Date();
    const yearsWorked = Math.floor((now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    return {
      employee: emp,
      record,
      daysEntitled: ANNUAL_ENTITLEMENT,
      daysUsed,
      daysRemaining,
      yearsWorked,
      startDate: record?.startDate,
      endDate: record?.endDate,
      subsidyPaid: !!record?.subsidyPaidInMonth,
      subsidyMonth: record?.subsidyPaidInMonth,
    };
  });

  // Group by status
  const scheduled = employeeHolidays.filter(e => e.startDate && !e.endDate);
  const completed = employeeHolidays.filter(e => e.endDate);
  const pending = employeeHolidays.filter(e => !e.startDate);

  // Totals
  const totalEntitled = employeeHolidays.reduce((sum, e) => sum + e.daysEntitled, 0);
  const totalUsed = employeeHolidays.reduce((sum, e) => sum + e.daysUsed, 0);
  const totalRemaining = employeeHolidays.reduce((sum, e) => sum + e.daysRemaining, 0);

  const formatDate = (date?: string) => date ? new Date(date).toLocaleDateString('pt-AO') : '-';

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
          <h1 className="text-xl font-bold uppercase">Relatório de Férias</h1>
          <h2 className="text-lg font-semibold mt-2">Controlo de Férias Anuais - {year}</h2>
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
            <p className="text-2xl font-bold">{employees.length}</p>
            <p className="text-sm">Total de Trabalhadores</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-2xl font-bold">{totalEntitled}</p>
            <p className="text-sm">Dias Previstos</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-2xl font-bold">{totalUsed}</p>
            <p className="text-sm">Dias Gozados</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-2xl font-bold">{totalRemaining}</p>
            <p className="text-sm">Dias por Gozar</p>
          </div>
        </div>

        {/* Main Table */}
        <table className="w-full border-collapse text-xs mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">Nº</th>
              <th className="border border-black p-1 text-left">Nome</th>
              <th className="border border-black p-1 text-left">Departamento</th>
              <th className="border border-black p-1 text-center">Anos</th>
              <th className="border border-black p-1 text-center">Dias Direito</th>
              <th className="border border-black p-1 text-center">Gozados</th>
              <th className="border border-black p-1 text-center">Saldo</th>
              <th className="border border-black p-1 text-center">Início</th>
              <th className="border border-black p-1 text-center">Fim</th>
              <th className="border border-black p-1 text-center">Subsídio</th>
              <th className="border border-black p-1 text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {employeeHolidays.map((item, idx) => (
              <tr key={item.employee.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-black p-1">{idx + 1}</td>
                <td className="border border-black p-1">
                  {item.employee.firstName} {item.employee.lastName}
                </td>
                <td className="border border-black p-1">{item.employee.department}</td>
                <td className="border border-black p-1 text-center">{item.yearsWorked}</td>
                <td className="border border-black p-1 text-center">{item.daysEntitled}</td>
                <td className="border border-black p-1 text-center">{item.daysUsed}</td>
                <td className="border border-black p-1 text-center font-medium">
                  {item.daysRemaining}
                </td>
                <td className="border border-black p-1 text-center">{formatDate(item.startDate)}</td>
                <td className="border border-black p-1 text-center">{formatDate(item.endDate)}</td>
                <td className="border border-black p-1 text-center">
                  {item.subsidyPaid ? `✓ (${item.subsidyMonth}/${year})` : '-'}
                </td>
                <td className="border border-black p-1 text-center">
                  {item.endDate ? '✓ Gozadas' : item.startDate ? '⏳ Agendadas' : '○ Pendente'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Status Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
          <div className="border border-black p-3">
            <h4 className="font-bold mb-2">Férias Agendadas ({scheduled.length})</h4>
            {scheduled.length === 0 ? (
              <p className="text-gray-500">Nenhuma</p>
            ) : (
              <ul className="space-y-1">
                {scheduled.slice(0, 5).map(e => (
                  <li key={e.employee.id}>
                    {e.employee.firstName} {e.employee.lastName} - {formatDate(e.startDate)}
                  </li>
                ))}
                {scheduled.length > 5 && <li>... e mais {scheduled.length - 5}</li>}
              </ul>
            )}
          </div>
          <div className="border border-black p-3">
            <h4 className="font-bold mb-2">Férias Gozadas ({completed.length})</h4>
            {completed.length === 0 ? (
              <p className="text-gray-500">Nenhuma</p>
            ) : (
              <ul className="space-y-1">
                {completed.slice(0, 5).map(e => (
                  <li key={e.employee.id}>
                    {e.employee.firstName} {e.employee.lastName} - {e.daysUsed} dias
                  </li>
                ))}
                {completed.length > 5 && <li>... e mais {completed.length - 5}</li>}
              </ul>
            )}
          </div>
          <div className="border border-black p-3">
            <h4 className="font-bold mb-2">Pendentes de Agendar ({pending.length})</h4>
            {pending.length === 0 ? (
              <p className="text-gray-500">Nenhuma</p>
            ) : (
              <ul className="space-y-1">
                {pending.slice(0, 5).map(e => (
                  <li key={e.employee.id}>
                    {e.employee.firstName} {e.employee.lastName}
                  </li>
                ))}
                {pending.length > 5 && <li>... e mais {pending.length - 5}</li>}
              </ul>
            )}
          </div>
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
              <p>Representante Legal / Administração</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-600 border-t pt-4">
          <p>Nota: De acordo com a Lei Geral do Trabalho (Lei nº 7/15), todos os trabalhadores têm direito a 22 dias úteis de férias anuais.</p>
          <p>O subsídio de férias deve ser pago antes do início do período de férias.</p>
        </div>
      </div>
    </div>
  );
};
