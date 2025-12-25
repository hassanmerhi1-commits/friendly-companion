/**
 * Export utilities for PayrollAO
 * Handles PDF and Excel generation
 */

import { formatAOA } from './angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Employee } from '@/types/employee';

// Export payroll data to CSV (Excel-compatible)
export function exportPayrollToCSV(
  entries: PayrollEntry[],
  periodLabel: string,
  language: 'pt' | 'en' = 'pt'
): void {
  const headers = language === 'pt'
    ? ['Funcionário', 'Departamento', 'Salário Base', 'Subsídios', 'Bruto', 'IRT', 'INSS', 'Outros Descontos', 'Líquido']
    : ['Employee', 'Department', 'Base Salary', 'Allowances', 'Gross', 'IRT', 'INSS', 'Other Deductions', 'Net'];

  const rows = entries.map(entry => [
    `${entry.employee?.firstName} ${entry.employee?.lastName}`,
    entry.employee?.department || '',
    entry.baseSalary,
    entry.mealAllowance + entry.transportAllowance + entry.otherAllowances,
    entry.grossSalary,
    entry.irt,
    entry.inssEmployee,
    entry.otherDeductions,
    entry.netSalary,
  ]);

  // Calculate totals
  const totals = entries.reduce(
    (acc, e) => ({
      base: acc.base + e.baseSalary,
      allowances: acc.allowances + e.mealAllowance + e.transportAllowance + e.otherAllowances,
      gross: acc.gross + e.grossSalary,
      irt: acc.irt + e.irt,
      inss: acc.inss + e.inssEmployee,
      other: acc.other + e.otherDeductions,
      net: acc.net + e.netSalary,
    }),
    { base: 0, allowances: 0, gross: 0, irt: 0, inss: 0, other: 0, net: 0 }
  );

  rows.push([
    language === 'pt' ? 'TOTAL' : 'TOTAL',
    '',
    totals.base,
    totals.allowances,
    totals.gross,
    totals.irt,
    totals.inss,
    totals.other,
    totals.net,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `payroll-${periodLabel.replace(/\s/g, '-')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export employees to CSV
export function exportEmployeesToCSV(
  employees: Employee[],
  language: 'pt' | 'en' = 'pt'
): void {
  const headers = language === 'pt'
    ? ['Nome', 'Email', 'Telefone', 'Departamento', 'Cargo', 'Contrato', 'Data Admissão', 'Salário Base', 'Estado']
    : ['Name', 'Email', 'Phone', 'Department', 'Position', 'Contract', 'Hire Date', 'Base Salary', 'Status'];

  const contractLabels = language === 'pt'
    ? { permanent: 'Efectivo', fixed_term: 'Prazo Det.', part_time: 'Part-Time', probation: 'Experimental' }
    : { permanent: 'Permanent', fixed_term: 'Fixed Term', part_time: 'Part-Time', probation: 'Probation' };

  const statusLabels = language === 'pt'
    ? { active: 'Ativo', inactive: 'Inativo', on_leave: 'De Licença', terminated: 'Desligado' }
    : { active: 'Active', inactive: 'Inactive', on_leave: 'On Leave', terminated: 'Terminated' };

  const rows = employees.map(emp => [
    `${emp.firstName} ${emp.lastName}`,
    emp.email,
    emp.phone,
    emp.department,
    emp.position,
    contractLabels[emp.contractType],
    new Date(emp.hireDate).toLocaleDateString('pt-AO'),
    emp.baseSalary,
    statusLabels[emp.status],
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `employees-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Print salary receipt
export function printReceipt(elementId: string): void {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Recibo Salarial</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
