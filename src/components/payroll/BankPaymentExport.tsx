/**
 * Bank Payment Export Component
 * Generates professionally formatted XLSX file with exceljs
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/lib/i18n';
import { useSettingsStore } from '@/stores/settings-store';
import { useBranchStore } from '@/stores/branch-store';
import { Download, Building2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import type { PayrollEntry } from '@/types/payroll';

interface BankPaymentExportProps {
  entries: PayrollEntry[];
  periodLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BankPaymentExport({ entries, periodLabel, open, onOpenChange }: BankPaymentExportProps) {
  const { language } = useLanguage();
  const { settings } = useSettingsStore();
  const { branches } = useBranchStore();
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [paymentReference, setPaymentReference] = useState<string>(`SAL-${periodLabel.replace(/\s/g, '-')}`);

  const activeBranches = branches.filter(b => b.isActive);

  const filteredEntries = selectedBranchId === 'all' 
    ? entries 
    : entries.filter(e => e.employee?.branchId === selectedBranchId);

  const bankableEntries = filteredEntries.filter(e => 
    e.employee && 
    e.employee.paymentMethod === 'bank_transfer' && 
    (e.employee.bankAccountNumber || e.employee.iban)
  );

  const handleExport = async () => {
    if (bankableEntries.length === 0) {
      toast.error(
        language === 'pt' 
          ? 'Nenhum funcionário com dados bancários para exportar' 
          : 'No employees with bank details to export'
      );
      return;
    }

    const getTransferAmount = (entry: PayrollEntry) => {
      return (entry.netSalary || 0) + (entry.monthlyBonus || 0);
    };

    const branchName = selectedBranchId === 'all' 
      ? (language === 'pt' ? 'Todas as Filiais' : 'All Branches')
      : activeBranches.find(b => b.id === selectedBranchId)?.name || '';

    // Create workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = settings.companyName || 'PayrollAO';
    wb.created = new Date();

    const ws = wb.addWorksheet('Pagamentos', {
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    // ── Column definitions ──
    const columns = [
      { header: 'Nº', key: 'num', width: 6 },
      { header: 'Nº Func.', key: 'empNum', width: 12 },
      { header: 'Nome Completo', key: 'name', width: 30 },
      { header: 'Departamento', key: 'dept', width: 18 },
      { header: 'Salário Base', key: 'base', width: 15 },
      { header: 'Sub. Alimentação', key: 'meal', width: 15 },
      { header: 'Sub. Transporte', key: 'transport', width: 15 },
      { header: 'Abono Familiar', key: 'family', width: 15 },
      { header: 'Outros Sub.', key: 'otherAllow', width: 14 },
      { header: 'Horas Extra', key: 'overtime', width: 13 },
      { header: 'Sub. Férias', key: 'holiday', width: 13 },
      { header: 'Sub. Natal', key: 'xmas', width: 13 },
      { header: 'Total Bruto', key: 'gross', width: 15 },
      { header: 'IRT', key: 'irt', width: 13 },
      { header: 'INSS', key: 'inss', width: 13 },
      { header: 'Faltas', key: 'absences', width: 12 },
      { header: 'Empréstimo', key: 'loan', width: 13 },
      { header: 'Adiantamento', key: 'advance', width: 13 },
      { header: 'Outros Desc.', key: 'otherDed', width: 14 },
      { header: 'Sal. Líquido', key: 'net', width: 15 },
      { header: 'Bónus', key: 'bonus', width: 13 },
      { header: 'Total Transferir', key: 'total', width: 16 },
      { header: 'Banco', key: 'bank', width: 22 },
      { header: 'Nº Conta', key: 'account', width: 20 },
      { header: 'IBAN', key: 'iban', width: 30 },
      { header: 'Referência', key: 'ref', width: 18 },
    ];
    ws.columns = columns;

    // ── Title rows ──
    const totalCols = columns.length;

    // Row 1: Company name
    ws.insertRow(1, []);
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = ws.getCell('A1');
    titleCell.value = settings.companyName || 'Empresa';
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Row 2: Report info
    ws.insertRow(2, []);
    ws.mergeCells(2, 1, 2, totalCols);
    const subtitleCell = ws.getCell('A2');
    subtitleCell.value = `${language === 'pt' ? 'Ficheiro de Pagamento Bancário' : 'Bank Payment File'} — ${periodLabel} — ${branchName}`;
    subtitleCell.font = { bold: true, size: 11, color: { argb: '555555' } };
    subtitleCell.alignment = { horizontal: 'center' };

    // Row 3: empty spacer
    ws.insertRow(3, []);

    // Row 4 is now the header row (shifted by 3 inserted rows)
    const headerRowNum = 4;
    const headerRow = ws.getRow(headerRowNum);

    // Style constants
    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    const currencyFormat = '#,##0.00';

    // Currency column indices (1-based, after 3 inserted rows the data columns stay the same)
    const currencyCols = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

    // ── Style header row ──
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2B579A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = thinBorder;
    });
    headerRow.height = 28;

    // ── Data rows ──
    bankableEntries.forEach((entry, index) => {
      const overtimeTotal = (entry.overtimeNormal || 0) + (entry.overtimeNight || 0) + (entry.overtimeHoliday || 0);
      const row = ws.addRow({
        num: index + 1,
        empNum: entry.employee?.employeeNumber || '',
        name: `${entry.employee?.firstName || ''} ${entry.employee?.lastName || ''}`.trim(),
        dept: entry.employee?.department || '',
        base: entry.baseSalary || 0,
        meal: entry.mealAllowance || 0,
        transport: entry.transportAllowance || 0,
        family: entry.familyAllowance || 0,
        otherAllow: entry.otherAllowances || 0,
        overtime: overtimeTotal,
        holiday: entry.holidaySubsidy || 0,
        xmas: entry.thirteenthMonth || 0,
        gross: entry.grossSalary || 0,
        irt: entry.irt || 0,
        inss: entry.inssEmployee || 0,
        absences: entry.absenceDeduction || 0,
        loan: entry.loanDeduction || 0,
        advance: entry.advanceDeduction || 0,
        otherDed: entry.otherDeductions || 0,
        net: entry.netSalary || 0,
        bonus: entry.monthlyBonus || 0,
        total: getTransferAmount(entry),
        bank: entry.employee?.bankName || '',
        account: entry.employee?.bankAccountNumber || '',
        iban: entry.employee?.iban || '',
        ref: paymentReference,
      });

      // Style each cell in data row
      row.eachCell((cell, colNumber) => {
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle' };
        if (currencyCols.includes(colNumber)) {
          cell.numFmt = currencyFormat;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }
      });

      // Alternate row shading
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F6FA' } };
        });
      }
    });

    // ── Totals row ──
    const sumCol = (key: string) => bankableEntries.reduce((s, e: any) => {
      if (key === 'overtime') return s + (e.overtimeNormal || 0) + (e.overtimeNight || 0) + (e.overtimeHoliday || 0);
      if (key === 'total') return s + (e.netSalary || 0) + (e.monthlyBonus || 0);
      return s + (e[key] || 0);
    }, 0);

    const totalsRow = ws.addRow({
      num: '',
      empNum: '',
      name: 'TOTAL',
      dept: '',
      base: sumCol('baseSalary'),
      meal: sumCol('mealAllowance'),
      transport: sumCol('transportAllowance'),
      family: sumCol('familyAllowance'),
      otherAllow: sumCol('otherAllowances'),
      overtime: sumCol('overtime'),
      holiday: sumCol('holidaySubsidy'),
      xmas: sumCol('thirteenthMonth'),
      gross: sumCol('grossSalary'),
      irt: sumCol('irt'),
      inss: sumCol('inssEmployee'),
      absences: sumCol('absenceDeduction'),
      loan: sumCol('loanDeduction'),
      advance: sumCol('advanceDeduction'),
      otherDed: sumCol('otherDeductions'),
      net: sumCol('netSalary'),
      bonus: sumCol('monthlyBonus'),
      total: sumCol('total'),
      bank: '',
      account: '',
      iban: '',
      ref: '',
    });

    totalsRow.eachCell((cell, colNumber) => {
      cell.font = { bold: true, size: 10 };
      cell.border = {
        top: { style: 'double' },
        left: { style: 'thin' },
        bottom: { style: 'double' },
        right: { style: 'thin' },
      };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E2F3' } };
      if (currencyCols.includes(colNumber)) {
        cell.numFmt = currencyFormat;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
    });

    // ── Freeze header row ──
    ws.views = [{ state: 'frozen', ySplit: headerRowNum, xSplit: 3 }];

    // ── Generate and download ──
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamentos-bancarios-${periodLabel.replace(/\s/g, '-')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(
      language === 'pt' 
        ? `Ficheiro exportado: ${bankableEntries.length} funcionários` 
        : `File exported: ${bankableEntries.length} employees`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {language === 'pt' ? 'Exportar Ficheiro de Pagamento' : 'Export Payment File'}
          </DialogTitle>
          <DialogDescription>
            {language === 'pt' 
              ? 'Gerar ficheiro Excel com dados bancários para transferências em lote'
              : 'Generate Excel file with bank details for bulk transfers'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">{language === 'pt' ? 'Período:' : 'Period:'} {periodLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'pt' 
                ? `${entries.length} funcionários na folha salarial`
                : `${entries.length} employees in payroll`}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {language === 'pt' ? 'Filtrar por Filial' : 'Filter by Branch'}
            </Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === 'pt' ? 'Todas as Filiais' : 'All Branches'}
                </SelectItem>
                {activeBranches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{language === 'pt' ? 'Referência de Pagamento' : 'Payment Reference'}</Label>
            <Input 
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="SAL-JAN-2025"
            />
            <p className="text-xs text-muted-foreground">
              {language === 'pt' 
                ? 'Esta referência aparecerá em cada linha do ficheiro'
                : 'This reference will appear on each row of the file'}
            </p>
          </div>

          <div className="p-3 rounded-lg border">
            <h4 className="font-medium text-sm mb-2">
              {language === 'pt' ? 'Resumo da Exportação' : 'Export Summary'}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {language === 'pt' ? 'Com dados bancários:' : 'With bank details:'}
                </span>
              </div>
              <div className="font-medium text-right">
                {bankableEntries.length} / {filteredEntries.length}
              </div>
              <div>
                <span className="text-muted-foreground">
                  {language === 'pt' ? 'Total a transferir:' : 'Total to transfer:'}
                </span>
              </div>
              <div className="font-medium text-right">
                {bankableEntries.reduce((sum, e) => sum + (e.netSalary || 0) + (e.monthlyBonus || 0), 0).toLocaleString('pt-AO', { 
                  style: 'currency', 
                  currency: 'AOA',
                  minimumFractionDigits: 2 
                })}
              </div>
            </div>
            {filteredEntries.length > bankableEntries.length && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ {filteredEntries.length - bankableEntries.length} {language === 'pt' 
                  ? 'funcionário(s) sem dados bancários (pagamento em numerário ou mobile money)'
                  : 'employee(s) without bank details (cash or mobile money payment)'}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'pt' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={handleExport} disabled={bankableEntries.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Exportar XLSX' : 'Export XLSX'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
