/**
 * Bank Payment Export Component
 * Generates properly formatted XLSX file with employee bank details and net salaries
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
import * as XLSX from 'xlsx';
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

  // Filter entries by branch
  const filteredEntries = selectedBranchId === 'all' 
    ? entries 
    : entries.filter(e => e.employee?.branchId === selectedBranchId);

  // Only include employees with bank details
  const bankableEntries = filteredEntries.filter(e => 
    e.employee && 
    e.employee.paymentMethod === 'bank_transfer' && 
    (e.employee.bankAccountNumber || e.employee.iban)
  );

  const handleExport = () => {
    if (bankableEntries.length === 0) {
      toast.error(
        language === 'pt' 
          ? 'Nenhum funcionário com dados bancários para exportar' 
          : 'No employees with bank details to export'
      );
      return;
    }

    // Prepare data for export
    const getTransferAmount = (entry: PayrollEntry) => {
      // IMPORTANT: monthlyBonus is paid but not part of the taxed netSalary calculation.
      // For bank transfers we must include the full amount to be paid.
      return (entry.netSalary || 0) + (entry.monthlyBonus || 0);
    };

    const exportData = bankableEntries.map((entry, index) => {
      const overtimeTotal = (entry.overtimeNormal || 0) + (entry.overtimeNight || 0) + (entry.overtimeHoliday || 0);
      return {
        'Nº': index + 1,
        'Nº Funcionário': entry.employee?.employeeNumber || '',
        'Nome Completo': `${entry.employee?.firstName || ''} ${entry.employee?.lastName || ''}`.trim(),
        'Departamento': entry.employee?.department || '',
        'Salário Base': entry.baseSalary || 0,
        'Sub. Alimentação': entry.mealAllowance || 0,
        'Sub. Transporte': entry.transportAllowance || 0,
        'Abono Familiar': entry.familyAllowance || 0,
        'Outros Subsídios': entry.otherAllowances || 0,
        'Horas Extra': overtimeTotal,
        'Sub. Férias': entry.holidaySubsidy || 0,
        'Sub. Natal': entry.thirteenthMonth || 0,
        'Total Bruto': entry.grossSalary || 0,
        'IRT': entry.irt || 0,
        'INSS': entry.inssEmployee || 0,
        'Faltas': entry.absenceDeduction || 0,
        'Empréstimo': entry.loanDeduction || 0,
        'Adiantamento': entry.advanceDeduction || 0,
        'Outros Descontos': entry.otherDeductions || 0,
        'Salário Líquido': entry.netSalary || 0,
        'Bónus': entry.monthlyBonus || 0,
        'Total a Transferir': getTransferAmount(entry),
        'Banco': entry.employee?.bankName || '',
        'Nº Conta': entry.employee?.bankAccountNumber || '',
        'IBAN': entry.employee?.iban || '',
        'Referência': paymentReference,
      };
    });

    // Add totals row
    const sumField = (field: string) => bankableEntries.reduce((sum, e: any) => sum + ((e as any)[field] || 0), 0);
    const totalTransfer = bankableEntries.reduce((sum, e) => sum + getTransferAmount(e), 0);
    const totalsRow: any = {
      'Nº': '',
      'Nº Funcionário': '',
      'Nome Completo': 'TOTAL',
      'Departamento': '',
      'Salário Base': bankableEntries.reduce((s, e) => s + (e.baseSalary || 0), 0),
      'Sub. Alimentação': bankableEntries.reduce((s, e) => s + (e.mealAllowance || 0), 0),
      'Sub. Transporte': bankableEntries.reduce((s, e) => s + (e.transportAllowance || 0), 0),
      'Abono Familiar': bankableEntries.reduce((s, e) => s + (e.familyAllowance || 0), 0),
      'Outros Subsídios': bankableEntries.reduce((s, e) => s + (e.otherAllowances || 0), 0),
      'Horas Extra': bankableEntries.reduce((s, e) => s + (e.overtimeNormal || 0) + (e.overtimeNight || 0) + (e.overtimeHoliday || 0), 0),
      'Sub. Férias': bankableEntries.reduce((s, e) => s + (e.holidaySubsidy || 0), 0),
      'Sub. Natal': bankableEntries.reduce((s, e) => s + (e.thirteenthMonth || 0), 0),
      'Total Bruto': bankableEntries.reduce((s, e) => s + (e.grossSalary || 0), 0),
      'IRT': bankableEntries.reduce((s, e) => s + (e.irt || 0), 0),
      'INSS': bankableEntries.reduce((s, e) => s + (e.inssEmployee || 0), 0),
      'Faltas': bankableEntries.reduce((s, e) => s + (e.absenceDeduction || 0), 0),
      'Empréstimo': bankableEntries.reduce((s, e) => s + (e.loanDeduction || 0), 0),
      'Adiantamento': bankableEntries.reduce((s, e) => s + (e.advanceDeduction || 0), 0),
      'Outros Descontos': bankableEntries.reduce((s, e) => s + (e.otherDeductions || 0), 0),
      'Salário Líquido': bankableEntries.reduce((s, e) => s + (e.netSalary || 0), 0),
      'Bónus': bankableEntries.reduce((s, e) => s + (e.monthlyBonus || 0), 0),
      'Total a Transferir': totalTransfer,
      'Banco': '',
      'Nº Conta': '',
      'IBAN': '',
      'Referência': '',
    };
    exportData.push(totalsRow);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for proper formatting
    ws['!cols'] = [
      { wch: 5 },   // Nº
      { wch: 15 },  // Nº Funcionário
      { wch: 30 },  // Nome Completo
      { wch: 18 },  // Departamento
      { wch: 14 },  // Salário Base
      { wch: 14 },  // Sub. Alimentação
      { wch: 14 },  // Sub. Transporte
      { wch: 14 },  // Abono Familiar
      { wch: 14 },  // Outros Subsídios
      { wch: 12 },  // Horas Extra
      { wch: 12 },  // Sub. Férias
      { wch: 12 },  // Sub. Natal
      { wch: 14 },  // Total Bruto
      { wch: 12 },  // IRT
      { wch: 12 },  // INSS
      { wch: 10 },  // Faltas
      { wch: 12 },  // Empréstimo
      { wch: 12 },  // Adiantamento
      { wch: 14 },  // Outros Descontos
      { wch: 14 },  // Salário Líquido
      { wch: 12 },  // Bónus
      { wch: 16 },  // Total a Transferir
      { wch: 25 },  // Banco
      { wch: 20 },  // Nº Conta
      { wch: 30 },  // IBAN
      { wch: 18 },  // Referência
    ];

    // Add header with company info
    const branchName = selectedBranchId === 'all' 
      ? (language === 'pt' ? 'Todas as Filiais' : 'All Branches')
      : activeBranches.find(b => b.id === selectedBranchId)?.name || '';

    // Create worksheet
    XLSX.utils.book_append_sheet(wb, ws, 'Pagamentos');

    // Generate filename
    const filename = `pagamentos-bancarios-${periodLabel.replace(/\s/g, '-')}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);

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
          {/* Period info */}
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium">{language === 'pt' ? 'Período:' : 'Period:'} {periodLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'pt' 
                ? `${entries.length} funcionários na folha salarial`
                : `${entries.length} employees in payroll`}
            </p>
          </div>

          {/* Branch filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {language === 'pt' ? 'Filtrar por Filial' : 'Filter by Branch'}
            </Label>
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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

          {/* Payment reference */}
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

          {/* Summary */}
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
