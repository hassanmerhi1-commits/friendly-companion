import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useSettingsStore } from '@/stores/settings-store';
import { useBranchStore } from '@/stores/branch-store';
import { formatAOA } from '@/lib/angola-labor-law';
import { getPayrollPeriodLabel } from '@/types/payroll';
import type { PayrollEntry } from '@/types/payroll';

interface PrintableBonusReportProps {
  entries: PayrollEntry[];
  periodLabel: string;
  companyName?: string;
  branchName?: string;
}

export function PrintableBonusReport({ entries, periodLabel, companyName, branchName }: PrintableBonusReportProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettingsStore();
  const { branches } = useBranchStore();
  const company = companyName || settings.companyName || 'Empresa';

  const getBranchName = (branchId?: string) => {
    if (!branchId) return '-';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : '-';
  };

  // Filter entries that have bonus > 0
  const bonusEntries = entries.filter(e => (e.monthlyBonus || 0) > 0);
  const totalBonus = bonusEntries.reduce((sum, e) => sum + (e.monthlyBonus || 0), 0);

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Bónus - ${periodLabel}</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; margin: 0; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { font-size: 16px; margin: 0 0 4px 0; }
          .header h2 { font-size: 13px; margin: 0 0 4px 0; font-weight: normal; }
          .header p { font-size: 10px; margin: 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f0f0f0; border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
          td { border: 1px solid #ddd; padding: 5px 8px; font-size: 11px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-mono { font-family: 'Courier New', monospace; }
          .font-bold { font-weight: bold; }
          .total-row { background: #f5f5f5; font-weight: bold; }
          .summary { margin-top: 20px; display: flex; gap: 30px; }
          .summary-item { padding: 10px; border: 1px solid #ddd; border-radius: 4px; min-width: 150px; }
          .summary-label { font-size: 9px; text-transform: uppercase; color: #666; }
          .summary-value { font-size: 16px; font-weight: bold; margin-top: 4px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 9px; color: #888; }
          .no-data { text-align: center; padding: 40px; color: #888; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  // Group by department
  const byDepartment: Record<string, { entries: typeof bonusEntries; total: number }> = {};
  bonusEntries.forEach(e => {
    const dept = e.employee?.department || 'Sem Departamento';
    if (!byDepartment[dept]) byDepartment[dept] = { entries: [], total: 0 };
    byDepartment[dept].entries.push(e);
    byDepartment[dept].total += (e.monthlyBonus || 0);
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handlePrint} variant="accent">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir Relatório
        </Button>
      </div>

      <div ref={printRef}>
        <div className="header">
          <h1>{company}</h1>
          <h2>Relatório de Bónus Mensal</h2>
          <p>{periodLabel}{branchName ? ` — ${branchName}` : ''}</p>
        </div>

        {bonusEntries.length === 0 ? (
          <div className="no-data">Nenhum bónus registado neste período.</div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>Nº</th>
                  <th style={{ width: '25%' }}>Funcionário</th>
                  <th style={{ width: '15%' }}>Departamento</th>
                  <th style={{ width: '15%' }}>Filial</th>
                  <th className="text-right" style={{ width: '15%' }}>Salário Base</th>
                  <th className="text-right" style={{ width: '15%' }}>Bónus Mensal</th>
                  <th className="text-right" style={{ width: '10%' }}>% do Salário</th>
                </tr>
              </thead>
              <tbody>
                {bonusEntries.map((entry, idx) => {
                  const pct = entry.baseSalary > 0 ? ((entry.monthlyBonus || 0) / entry.baseSalary * 100) : 0;
                  return (
                    <tr key={entry.id}>
                      <td className="text-center">{idx + 1}</td>
                      <td>{entry.employee?.firstName} {entry.employee?.lastName}</td>
                      <td>{entry.employee?.department || '-'}</td>
                      <td>{getBranchName(entry.employee?.branchId)}</td>
                      <td className="text-right font-mono">{formatAOA(entry.baseSalary)}</td>
                      <td className="text-right font-mono font-bold">{formatAOA(entry.monthlyBonus)}</td>
                      <td className="text-right font-mono">{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                <tr className="total-row">
                  <td colSpan={5} className="text-right">Total de Bónus:</td>
                  <td className="text-right font-mono">{formatAOA(totalBonus)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <div className="summary">
              <div className="summary-item">
                <div className="summary-label">Total Funcionários com Bónus</div>
                <div className="summary-value">{bonusEntries.length}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Total de Bónus</div>
                <div className="summary-value">{formatAOA(totalBonus)}</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Média por Funcionário</div>
                <div className="summary-value">{formatAOA(bonusEntries.length > 0 ? totalBonus / bonusEntries.length : 0)}</div>
              </div>
            </div>

            {Object.keys(byDepartment).length > 1 && (
              <>
                <h3 style={{ marginTop: '20px', fontSize: '12px' }}>Resumo por Departamento</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Departamento</th>
                      <th className="text-center">Funcionários</th>
                      <th className="text-right">Total Bónus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(byDepartment).map(([dept, data]) => (
                      <tr key={dept}>
                        <td>{dept}</td>
                        <td className="text-center">{data.entries.length}</td>
                        <td className="text-right font-mono font-bold">{formatAOA(data.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}

        <div className="footer">
          <span>Gerado em: {new Date().toLocaleString('pt-AO')}</span>
          <span>{company}</span>
        </div>
      </div>
    </div>
  );
}
