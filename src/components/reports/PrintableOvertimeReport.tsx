import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { formatAOA } from '@/lib/angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Branch } from '@/types/branch';

interface PrintableOvertimeReportProps {
  entries: PayrollEntry[];
  periodLabel: string;
  companyName: string;
  companyNif: string;
  branch?: Branch;
  onClose?: () => void;
}

/**
 * Relatório de Horas Extra - Overtime Tracking Report
 * 
 * Shows detailed overtime breakdown by type (normal, night, holiday)
 */
export const PrintableOvertimeReport: React.FC<PrintableOvertimeReportProps> = ({
  entries,
  periodLabel,
  companyName,
  companyNif,
  branch,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Horas-Extra-${periodLabel}`,
  });

  // Filter entries with overtime
  const entriesWithOvertime = entries.filter(e => 
    e.overtimeHoursNormal > 0 || e.overtimeHoursNight > 0 || e.overtimeHoursHoliday > 0
  );

  // Calculate totals
  const totals = entries.reduce((acc, entry) => ({
    hoursNormal: acc.hoursNormal + entry.overtimeHoursNormal,
    hoursNight: acc.hoursNight + entry.overtimeHoursNight,
    hoursHoliday: acc.hoursHoliday + entry.overtimeHoursHoliday,
    totalHours: acc.totalHours + entry.overtimeHoursNormal + entry.overtimeHoursNight + entry.overtimeHoursHoliday,
    valueNormal: acc.valueNormal + entry.overtimeNormal,
    valueNight: acc.valueNight + entry.overtimeNight,
    valueHoliday: acc.valueHoliday + entry.overtimeHoliday,
    totalValue: acc.totalValue + entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday,
  }), {
    hoursNormal: 0,
    hoursNight: 0,
    hoursHoliday: 0,
    totalHours: 0,
    valueNormal: 0,
    valueNight: 0,
    valueHoliday: 0,
    totalValue: 0,
  });

  // Calculate hourly rates (for reference)
  const calculateHourlyRate = (baseSalary: number) => baseSalary / 176; // 22 days × 8 hours

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
          <h1 className="text-xl font-bold uppercase">Relatório de Horas Extraordinárias</h1>
          <h2 className="text-lg font-semibold mt-2">Período: {periodLabel}</h2>
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

        {/* Overtime Type Legend */}
        <div className="border border-black p-4 mb-6 text-sm">
          <h3 className="font-bold mb-2">Tipos de Horas Extraordinárias (Lei nº 7/15)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p><strong>Normais (dias úteis):</strong></p>
              <p>+50% (primeira hora)</p>
              <p>+75% (horas seguintes)</p>
            </div>
            <div>
              <p><strong>Nocturnas (22h-06h):</strong></p>
              <p>+100% sobre hora normal</p>
            </div>
            <div>
              <p><strong>Feriados/Descanso:</strong></p>
              <p>+100% sobre hora normal</p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-black p-3 text-center">
            <p className="text-2xl font-bold">{entriesWithOvertime.length}</p>
            <p className="text-sm">Trabalhadores c/ H.E.</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-2xl font-bold">{totals.totalHours.toFixed(1)}h</p>
            <p className="text-sm">Total de Horas</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-2xl font-bold">{formatAOA(totals.totalValue)}</p>
            <p className="text-sm">Valor Total</p>
          </div>
          <div className="border border-black p-3 text-center">
            <p className="text-2xl font-bold">
              {totals.totalHours > 0 ? formatAOA(totals.totalValue / totals.totalHours) : '0'}
            </p>
            <p className="text-sm">Média por Hora</p>
          </div>
        </div>

        {/* Main Table */}
        <table className="w-full border-collapse text-xs mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">Nº</th>
              <th className="border border-black p-1 text-left">Nome</th>
              <th className="border border-black p-1 text-left">Cargo</th>
              <th className="border border-black p-1 text-right">Sal. Base</th>
              <th className="border border-black p-1 text-right">Hora/Base</th>
              <th className="border border-black p-1 text-center" colSpan={2}>Normais</th>
              <th className="border border-black p-1 text-center" colSpan={2}>Nocturnas</th>
              <th className="border border-black p-1 text-center" colSpan={2}>Feriados</th>
              <th className="border border-black p-1 text-right">Total H.</th>
              <th className="border border-black p-1 text-right">Total Kz</th>
            </tr>
            <tr className="bg-gray-50 text-[10px]">
              <th className="border border-black p-0.5"></th>
              <th className="border border-black p-0.5"></th>
              <th className="border border-black p-0.5"></th>
              <th className="border border-black p-0.5"></th>
              <th className="border border-black p-0.5"></th>
              <th className="border border-black p-0.5 text-center">Horas</th>
              <th className="border border-black p-0.5 text-center">Valor</th>
              <th className="border border-black p-0.5 text-center">Horas</th>
              <th className="border border-black p-0.5 text-center">Valor</th>
              <th className="border border-black p-0.5 text-center">Horas</th>
              <th className="border border-black p-0.5 text-center">Valor</th>
              <th className="border border-black p-0.5"></th>
              <th className="border border-black p-0.5"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const totalHours = entry.overtimeHoursNormal + entry.overtimeHoursNight + entry.overtimeHoursHoliday;
              const totalValue = entry.overtimeNormal + entry.overtimeNight + entry.overtimeHoliday;
              const hourlyRate = calculateHourlyRate(entry.baseSalary);
              
              return (
                <tr 
                  key={entry.id} 
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${totalHours === 0 ? 'text-gray-400' : ''}`}
                >
                  <td className="border border-black p-1">{idx + 1}</td>
                  <td className="border border-black p-1">
                    {entry.employee?.firstName} {entry.employee?.lastName}
                  </td>
                  <td className="border border-black p-1">{entry.employee?.position || '-'}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(entry.baseSalary)}</td>
                  <td className="border border-black p-1 text-right">{formatAOA(hourlyRate)}</td>
                  <td className="border border-black p-1 text-center">{entry.overtimeHoursNormal || '-'}</td>
                  <td className="border border-black p-1 text-right">{entry.overtimeNormal > 0 ? formatAOA(entry.overtimeNormal) : '-'}</td>
                  <td className="border border-black p-1 text-center">{entry.overtimeHoursNight || '-'}</td>
                  <td className="border border-black p-1 text-right">{entry.overtimeNight > 0 ? formatAOA(entry.overtimeNight) : '-'}</td>
                  <td className="border border-black p-1 text-center">{entry.overtimeHoursHoliday || '-'}</td>
                  <td className="border border-black p-1 text-right">{entry.overtimeHoliday > 0 ? formatAOA(entry.overtimeHoliday) : '-'}</td>
                  <td className="border border-black p-1 text-right font-medium">{totalHours || '-'}</td>
                  <td className="border border-black p-1 text-right font-bold">{totalValue > 0 ? formatAOA(totalValue) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
              <td colSpan={5} className="border border-black p-1">TOTAIS</td>
              <td className="border border-black p-1 text-center">{totals.hoursNormal.toFixed(1)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.valueNormal)}</td>
              <td className="border border-black p-1 text-center">{totals.hoursNight.toFixed(1)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.valueNight)}</td>
              <td className="border border-black p-1 text-center">{totals.hoursHoliday.toFixed(1)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.valueHoliday)}</td>
              <td className="border border-black p-1 text-right">{totals.totalHours.toFixed(1)}</td>
              <td className="border border-black p-1 text-right">{formatAOA(totals.totalValue)}</td>
            </tr>
          </tfoot>
        </table>

        {/* By Type Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border border-black p-3 text-center">
            <h4 className="font-bold text-sm mb-1">Horas Normais</h4>
            <p className="text-lg">{totals.hoursNormal.toFixed(1)} horas</p>
            <p className="text-xl font-bold">{formatAOA(totals.valueNormal)}</p>
          </div>
          <div className="border border-black p-3 text-center">
            <h4 className="font-bold text-sm mb-1">Horas Nocturnas</h4>
            <p className="text-lg">{totals.hoursNight.toFixed(1)} horas</p>
            <p className="text-xl font-bold">{formatAOA(totals.valueNight)}</p>
          </div>
          <div className="border border-black p-3 text-center">
            <h4 className="font-bold text-sm mb-1">Feriados/Descanso</h4>
            <p className="text-lg">{totals.hoursHoliday.toFixed(1)} horas</p>
            <p className="text-xl font-bold">{formatAOA(totals.valueHoliday)}</p>
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
          <p>Nota: As horas extraordinárias estão sujeitas a limites legais conforme a Lei Geral do Trabalho (Lei nº 7/15).</p>
          <p>Máximo permitido: 2 horas por dia, 40 horas por mês, 200 horas por ano.</p>
        </div>
      </div>
    </div>
  );
};
