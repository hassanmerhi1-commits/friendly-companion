/**
 * Export utilities for PayrollAO
 * Handles PDF and Excel generation
 */

import ExcelJS from 'exceljs';
import { formatAOA } from './angola-labor-law';
import type { PayrollEntry } from '@/types/payroll';
import type { Employee } from '@/types/employee';
import type { Branch } from '@/types/branch';

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

const CURRENCY_FMT = '#,##0.00';

// Export payroll data to CSV (Excel-compatible)
export function exportPayrollToCSV(
  entries: PayrollEntry[],
  periodLabel: string,
  language: string = 'pt'
): void {
  const isPt = language === 'pt';
  const headers = isPt
    ? ['Funcionário', 'Nº Bilhete (BI)', 'Departamento', 'Salário Base', 'Subsídios', 'Bruto', 'IRT', 'INSS', 'Outros Descontos', 'Líquido']
    : ['Employee', 'ID Number (BI)', 'Department', 'Base Salary', 'Allowances', 'Gross', 'IRT', 'INSS', 'Other Deductions', 'Net'];

  const rows = entries.map(entry => [
    `${entry.employee?.firstName} ${entry.employee?.lastName}`,
    entry.employee?.bilheteIdentidade || '',
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
  language: string = 'pt',
  branches: Branch[] = []
): void {
  const isPt = language === 'pt';
  const headers = isPt
    ? ['Nome', 'Email', 'Telefone', 'Departamento', 'Categoria', 'Filial', 'Cargo', 'Contrato', 'Data Admissão', 'Salário Base', 'Estado']
    : ['Name', 'Email', 'Phone', 'Department', 'Category', 'Branch', 'Position', 'Contract', 'Hire Date', 'Base Salary', 'Status'];

  const contractLabels = language === 'pt'
    ? { permanent: 'Efectivo', fixed_term: 'Prazo Det.', part_time: 'Part-Time', probation: 'Experimental' }
    : { permanent: 'Permanent', fixed_term: 'Fixed Term', part_time: 'Part-Time', probation: 'Probation' };

  const statusLabels = language === 'pt'
    ? { active: 'Ativo', inactive: 'Inativo', on_leave: 'De Licença', terminated: 'Desligado' }
    : { active: 'Active', inactive: 'Inactive', on_leave: 'On Leave', terminated: 'Terminated' };

  const categoryLabel = (category?: string) => category || '-';

  const branchName = (branchId?: string) => {
    if (!branchId) return '-';
    const b = branches.find((x) => x.id === branchId);
    return b ? b.name : '-';
  };

  const rows = employees.map(emp => [
    `${emp.firstName} ${emp.lastName}`,
    emp.email,
    emp.phone,
    emp.department,
    categoryLabel(emp.category),
    branchName(emp.branchId),
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

export interface DeductionBalanceExportRow {
  employeeName: string;
  department: string;
  branchName: string;
  motive: string;
  detail: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installments: number;
  installmentsPaid: number;
  monthlyAmount: number;
  status: string;
  startDate: string;
}

export interface DeductionBalanceExportMeta {
  companyName?: string;
  companyNif?: string;
  branchName?: string;
}

/** Formatted .xlsx with borders, headers, totals (opens in Excel). */
export async function exportDeductionBalanceToXlsx(
  rows: DeductionBalanceExportRow[],
  language: string = 'pt',
  meta: DeductionBalanceExportMeta = {}
): Promise<void> {
  const isPt = language === 'pt';
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.companyName || 'PayrollAO';
  wb.created = new Date();

  const ws = wb.addWorksheet(isPt ? 'Descontos e Empréstimos' : 'Deductions & Loans', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const colCount = 12;
  const issuedAt = new Date().toLocaleDateString('pt-AO');
  const branchLabel =
    meta.branchName ||
    (isPt ? 'Todas as filiais' : 'All branches');

  ws.columns = [
    { key: 'employee', width: 28 },
    { key: 'department', width: 18 },
    { key: 'branch', width: 16 },
    { key: 'motive', width: 22 },
    { key: 'detail', width: 30 },
    { key: 'total', width: 14 },
    { key: 'paid', width: 14 },
    { key: 'remaining', width: 14 },
    { key: 'installments', width: 12 },
    { key: 'monthly', width: 14 },
    { key: 'startDate', width: 12 },
    { key: 'status', width: 11 },
  ];

  const titleRows = [
    meta.companyName || (isPt ? 'Empresa' : 'Company'),
    isPt
      ? 'Relatório Geral de Descontos e Empréstimos'
      : 'Deductions & Loans Balance Report',
    meta.companyNif ? `NIF: ${meta.companyNif}` : '',
    `${isPt ? 'Filial' : 'Branch'}: ${branchLabel}  •  ${isPt ? 'Emitido' : 'Issued'}: ${issuedAt}  •  ${rows.length} ${isPt ? 'registos' : 'records'}`,
  ].filter(Boolean);

  titleRows.forEach((text, i) => {
    const r = ws.addRow([text]);
    ws.mergeCells(r.number, 1, r.number, colCount);
    const cell = ws.getCell(r.number, 1);
    cell.font = { bold: i === 0, size: i === 0 ? 14 : 11, color: { argb: i === 0 ? '000000' : '444444' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    r.height = i === 0 ? 26 : 20;
  });

  ws.addRow([]);

  const headerLabels = isPt
    ? [
        'Funcionário',
        'Departamento',
        'Filial',
        'Motivo / Tipo',
        'Detalhe',
        'Valor Total (Kz)',
        'Já Descontado (Kz)',
        'Por Descontar (Kz)',
        'Prestações',
        'Valor Mensal (Kz)',
        'Data Início',
        'Estado',
      ]
    : [
        'Employee',
        'Department',
        'Branch',
        'Type',
        'Detail',
        'Total (Kz)',
        'Deducted (Kz)',
        'Remaining (Kz)',
        'Installments',
        'Monthly (Kz)',
        'Start Date',
        'Status',
      ];

  const headerRow = ws.addRow(headerLabels);
  const headerRowNum = headerRow.number;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2B579A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 28;

  const currencyCols = [6, 7, 8, 10];

  rows.forEach((r, index) => {
    const dataRow = ws.addRow([
      r.employeeName,
      r.department,
      r.branchName,
      r.motive,
      r.detail,
      r.totalAmount,
      r.paidAmount,
      r.remainingAmount,
      `${r.installmentsPaid}/${r.installments}`,
      r.monthlyAmount,
      r.startDate ? new Date(r.startDate).toLocaleDateString('pt-AO') : '',
      r.status,
    ]);

    dataRow.eachCell((cell, colNumber) => {
      cell.border = THIN_BORDER;
      cell.alignment = { vertical: 'middle', wrapText: colNumber === 5 };
      if (currencyCols.includes(colNumber)) {
        cell.numFmt = CURRENCY_FMT;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      if (colNumber === 9) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    if (index % 2 === 1) {
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F6FA' } };
      });
    }
  });

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.totalAmount,
      paid: acc.paid + r.paidAmount,
      remaining: acc.remaining + r.remainingAmount,
      monthly: acc.monthly + r.monthlyAmount,
    }),
    { total: 0, paid: 0, remaining: 0, monthly: 0 }
  );

  const totalsRow = ws.addRow([
    isPt ? 'TOTAIS' : 'TOTALS',
    '',
    '',
    '',
    '',
    totals.total,
    totals.paid,
    totals.remaining,
    '',
    totals.monthly,
    '',
    '',
  ]);

  totalsRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'double' },
      left: { style: 'thin' },
      bottom: { style: 'double' },
      right: { style: 'thin' },
    };
    if (currencyCols.includes(colNumber)) {
      cell.numFmt = CURRENCY_FMT;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8EEF7' } };
  });

  ws.views = [{ state: 'frozen', ySplit: headerRowNum }];
  ws.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum, column: colCount },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `descontos-emprestimos-${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** @deprecated Use exportDeductionBalanceToXlsx */
export async function exportDeductionBalanceToCSV(
  rows: DeductionBalanceExportRow[],
  language: string = 'pt',
  meta?: DeductionBalanceExportMeta
): Promise<void> {
  return exportDeductionBalanceToXlsx(rows, language, meta);
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
