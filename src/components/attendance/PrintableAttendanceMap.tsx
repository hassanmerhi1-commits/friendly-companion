import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from 'react-to-print';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBulkAttendanceStore } from '@/stores/bulk-attendance-store';
import { useBranchStore } from '@/stores/branch-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useLanguage } from '@/lib/i18n';

interface PrintableAttendanceMapProps {
  month: number;
  year: number;
}

export const PrintableAttendanceMap: React.FC<PrintableAttendanceMapProps> = ({ month, year }) => {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const { employees } = useEmployeeStore();
  const { entries } = useBulkAttendanceStore();
  const { branches } = useBranchStore();
  const { settings } = useSettingsStore();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Mapa-Efectividade-${month}-${year}`,
  });

  const monthNames = language === 'pt'
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const periodLabel = `${monthNames[month - 1]} ${year}`;
  const workingDaysInMonth = 26; // Standard Angolan working days

  // Build rows: active employees with their attendance data
  const activeEmployees = employees.filter(e => e.status === 'active');
  
  const rows = activeEmployees.map(emp => {
    const entry = entries.find(e => e.employeeId === emp.id && e.month === month && e.year === year);
    const branch = branches.find(b => b.id === emp.branchId);
    const absenceDays = entry?.absenceDays || 0;
    const justifiedDays = entry?.justifiedAbsenceDays || 0;
    const delayHours = entry?.delayHours || 0;
    const presentDays = workingDaysInMonth - absenceDays - justifiedDays;
    const effectivenessRate = workingDaysInMonth > 0 
      ? Math.round((presentDays / workingDaysInMonth) * 100) 
      : 100;

    return {
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department || '-',
      branch: branch?.name || '-',
      presentDays,
      absenceDays,
      justifiedDays,
      delayHours,
      effectivenessRate,
      notes: entry?.notes || '',
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  const totals = rows.reduce((acc, r) => ({
    presentDays: acc.presentDays + r.presentDays,
    absenceDays: acc.absenceDays + r.absenceDays,
    justifiedDays: acc.justifiedDays + r.justifiedDays,
    delayHours: acc.delayHours + r.delayHours,
  }), { presentDays: 0, absenceDays: 0, justifiedDays: 0, delayHours: 0 });

  const avgEffectiveness = rows.length > 0
    ? Math.round(rows.reduce((sum, r) => sum + r.effectivenessRate, 0) / rows.length)
    : 100;

  const t = {
    title: language === 'pt' ? 'Mapa de Efectividade' : 'Attendance Effectiveness Map',
    subtitle: language === 'pt' ? 'Relatório Mensal de Assiduidade' : 'Monthly Attendance Report',
    period: language === 'pt' ? 'Período' : 'Period',
    company: language === 'pt' ? 'Entidade Empregadora' : 'Company',
    issueDate: language === 'pt' ? 'Data de Emissão' : 'Issue Date',
    num: 'Nº',
    employee: language === 'pt' ? 'Trabalhador' : 'Employee',
    dept: language === 'pt' ? 'Departamento' : 'Department',
    branch: language === 'pt' ? 'Filial' : 'Branch',
    workingDays: language === 'pt' ? 'Dias Úteis' : 'Working Days',
    present: language === 'pt' ? 'Dias Presença' : 'Present Days',
    unjustified: language === 'pt' ? 'Faltas Injust.' : 'Unjust. Abs.',
    justified: language === 'pt' ? 'Faltas Just.' : 'Just. Abs.',
    delays: language === 'pt' ? 'Atrasos (h)' : 'Delays (h)',
    rate: language === 'pt' ? 'Taxa (%)' : 'Rate (%)',
    notes: language === 'pt' ? 'Obs.' : 'Notes',
    totals: language === 'pt' ? 'TOTAIS / MÉDIA' : 'TOTALS / AVERAGE',
    summary: language === 'pt' ? 'Resumo de Efectividade' : 'Effectiveness Summary',
    totalWorkers: language === 'pt' ? 'Total de Trabalhadores' : 'Total Workers',
    avgRate: language === 'pt' ? 'Taxa Média de Efectividade' : 'Average Effectiveness Rate',
    totalAbsences: language === 'pt' ? 'Total Faltas Injustificadas' : 'Total Unjustified Absences',
    totalJustified: language === 'pt' ? 'Total Faltas Justificadas' : 'Total Justified Absences',
    totalDelays: language === 'pt' ? 'Total Horas de Atraso' : 'Total Delay Hours',
    hrManager: language === 'pt' ? 'Responsável pelos Recursos Humanos' : 'HR Manager',
    admin: language === 'pt' ? 'Representante Legal / Administração' : 'Legal Representative / Administration',
    legalNote: language === 'pt' 
      ? 'Documento elaborado nos termos da Lei Geral do Trabalho de Angola (Lei nº 12/23).'
      : 'Document prepared under Angolan General Labor Law (Law No. 12/23).',
    print: language === 'pt' ? 'Imprimir' : 'Print',
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button onClick={() => handlePrint()} className="gap-2">
          <Printer className="h-4 w-4" />
          {t.print}
        </Button>
      </div>

      <div ref={printRef} className="bg-white text-black p-8 print:p-4 min-h-[297mm]">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase">{t.title}</h1>
          <h2 className="text-lg font-semibold mt-2">{t.subtitle}</h2>
          <p className="text-sm mt-1">{t.period}: {periodLabel}</p>
        </div>

        {/* Company Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><strong>{t.company}:</strong> {settings.companyName}</p>
            <p><strong>NIF:</strong> {settings.nif}</p>
          </div>
          <div className="text-right">
            <p><strong>{t.issueDate}:</strong> {new Date().toLocaleDateString('pt-AO')}</p>
            <p><strong>{t.workingDays}:</strong> {workingDaysInMonth}</p>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse text-xs mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 text-left">{t.num}</th>
              <th className="border border-black p-1 text-left">{t.employee}</th>
              <th className="border border-black p-1 text-left">{t.dept}</th>
              <th className="border border-black p-1 text-right">{t.present}</th>
              <th className="border border-black p-1 text-right">{t.unjustified}</th>
              <th className="border border-black p-1 text-right">{t.justified}</th>
              <th className="border border-black p-1 text-right">{t.delays}</th>
              <th className="border border-black p-1 text-right">{t.rate}</th>
              <th className="border border-black p-1 text-left">{t.notes}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-black p-1">{idx + 1}</td>
                <td className="border border-black p-1">{row.name}</td>
                <td className="border border-black p-1">{row.department}</td>
                <td className="border border-black p-1 text-right">{row.presentDays}</td>
                <td className="border border-black p-1 text-right font-medium" style={{ color: row.absenceDays >= 3 ? '#dc2626' : 'inherit' }}>
                  {row.absenceDays}
                </td>
                <td className="border border-black p-1 text-right">{row.justifiedDays}</td>
                <td className="border border-black p-1 text-right">{row.delayHours > 0 ? `${row.delayHours}h` : '-'}</td>
                <td className="border border-black p-1 text-right font-bold" style={{ color: row.effectivenessRate < 85 ? '#dc2626' : row.effectivenessRate >= 95 ? '#16a34a' : 'inherit' }}>
                  {row.effectivenessRate}%
                </td>
                <td className="border border-black p-1 text-xs max-w-[100px] truncate">{row.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-bold">
              <td colSpan={3} className="border border-black p-1">{t.totals}</td>
              <td className="border border-black p-1 text-right">{totals.presentDays}</td>
              <td className="border border-black p-1 text-right">{totals.absenceDays}</td>
              <td className="border border-black p-1 text-right">{totals.justifiedDays}</td>
              <td className="border border-black p-1 text-right">{totals.delayHours > 0 ? `${totals.delayHours}h` : '-'}</td>
              <td className="border border-black p-1 text-right">{avgEffectiveness}%</td>
              <td className="border border-black p-1"></td>
            </tr>
          </tfoot>
        </table>

        {/* Summary */}
        <div className="border border-black p-4 mb-6">
          <h3 className="font-bold mb-2">{t.summary}</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p>{t.totalWorkers}: <strong>{rows.length}</strong></p>
              <p>{t.totalAbsences}: <strong>{totals.absenceDays}</strong></p>
            </div>
            <div>
              <p>{t.totalJustified}: <strong>{totals.justifiedDays}</strong></p>
              <p>{t.totalDelays}: <strong>{totals.delayHours}h</strong></p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{t.avgRate}:</p>
              <p className="text-2xl font-bold" style={{ color: avgEffectiveness < 85 ? '#dc2626' : '#16a34a' }}>
                {avgEffectiveness}%
              </p>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 text-sm">
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-16">
              <p>{t.hrManager}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-2 mt-16">
              <p>{t.admin}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-600 border-t pt-4">
          <p>{t.legalNote}</p>
        </div>
      </div>
    </div>
  );
};
