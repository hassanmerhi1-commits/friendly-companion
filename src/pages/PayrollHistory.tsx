import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Archive, Calendar, DollarSign, Users, TrendingDown, Receipt, Printer, FileDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { usePayrollStore } from "@/stores/payroll-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useBranchStore } from "@/stores/branch-store";
import { useSettingsStore } from "@/stores/settings-store";
import { formatAOA } from "@/lib/angola-labor-law";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SalaryReceipt } from "@/components/payroll/SalaryReceipt";
import { PrintablePayrollSheet } from "@/components/payroll/PrintablePayrollSheet";
import type { PayrollEntry } from "@/types/payroll";

const PayrollHistory = () => {
  const { t, language } = useLanguage();
  const { periods, entries } = usePayrollStore();
  const { employees } = useEmployeeStore();
  const { branches } = useBranchStore();
  const { settings } = useSettingsStore();
  
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
  const [printSheetOpen, setPrintSheetOpen] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Get only archived (paid) periods, sorted by date (newest first)
  const archivedPeriods = periods
    .filter(p => p.status === 'paid')
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

  const selectedPeriod = archivedPeriods.find(p => p.id === selectedPeriodId);

  // Get entries for selected period, sorted by category then alphabetically
  const periodEntries = selectedPeriod
    ? entries
        .filter(e => e.payrollPeriodId === selectedPeriod.id)
        .map(e => {
          const employeeData = employees.find(emp => emp.id === e.employeeId);
          return { ...e, employee: employeeData || e.employee };
        })
        .sort((a, b) => {
          // First sort by position/category
          const posA = (a.employee?.position || '').toLowerCase();
          const posB = (b.employee?.position || '').toLowerCase();
          if (posA !== posB) return posA.localeCompare(posB);
          
          // Then sort alphabetically by name within same category
          const nameA = `${a.employee?.firstName || ''} ${a.employee?.lastName || ''}`.toLowerCase();
          const nameB = `${b.employee?.firstName || ''} ${b.employee?.lastName || ''}`.toLowerCase();
          return nameA.localeCompare(nameB);
        })
    : [];

  // Filter by branch for print
  const filteredEntries = selectedBranchId
    ? periodEntries.filter(e => e.employee?.branchId === selectedBranchId)
    : periodEntries;

  const monthNames = language === 'pt'
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getPeriodLabel = (year: number, month: number) => 
    `${monthNames[month - 1]} ${year}`;

  // Calculate totals for selected period
  const totals = periodEntries.reduce((acc, e) => ({
    gross: acc.gross + e.grossSalary,
    net: acc.net + e.netSalary,
    irt: acc.irt + e.irt,
    inss: acc.inss + e.inssEmployee,
    deductions: acc.deductions + e.totalDeductions,
    absences: acc.absences + (e.absenceDeduction || 0),
    advances: acc.advances + (e.advanceDeduction || 0),
    loans: acc.loans + (e.loanDeduction || 0),
    other: acc.other + (e.otherDeductions || 0),
  }), { gross: 0, net: 0, irt: 0, inss: 0, deductions: 0, absences: 0, advances: 0, loans: 0, other: 0 });

  const handleViewReceipt = (entry: PayrollEntry) => {
    setSelectedEntry(entry);
    setReceiptOpen(true);
  };

  const activeBranches = branches.filter(b => b.isActive);
  const selectedBranch = activeBranches.find(b => b.id === selectedBranchId);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Archive className="h-8 w-8 text-primary" />
            {language === 'pt' ? 'Histórico de Folhas Salariais' : 'Payroll History'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === 'pt' 
              ? 'Consulte períodos arquivados com todos os detalhes (somente leitura)'
              : 'View archived periods with all details (read-only)'}
          </p>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {language === 'pt' ? 'Selecionar Período Arquivado' : 'Select Archived Period'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[250px]">
              <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'pt' ? 'Escolha um período...' : 'Choose a period...'} />
                </SelectTrigger>
                <SelectContent>
                  {archivedPeriods.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {language === 'pt' ? 'Nenhum período arquivado' : 'No archived periods'}
                    </div>
                  ) : (
                    archivedPeriods.map(period => (
                      <SelectItem key={period.id} value={period.id}>
                        <div className="flex items-center gap-2">
                          <span>{getPeriodLabel(period.year, period.month)}</span>
                          <Badge variant="secondary" className="text-xs">
                            {language === 'pt' ? 'Arquivado' : 'Archived'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod && (
              <>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={language === 'pt' ? 'Filtrar por filial' : 'Filter by branch'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {language === 'pt' ? 'Todas as filiais' : 'All branches'}
                    </SelectItem>
                    {activeBranches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => setPrintSheetOpen(true)}
                  disabled={periodEntries.length === 0}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {language === 'pt' ? 'Imprimir Folha' : 'Print Sheet'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No period selected message */}
      {!selectedPeriod && archivedPeriods.length > 0 && (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <Archive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {language === 'pt' 
                ? 'Selecione um período arquivado para ver os detalhes'
                : 'Select an archived period to view details'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* No archived periods */}
      {archivedPeriods.length === 0 && (
        <Card className="mb-6">
          <CardContent className="py-12 text-center">
            <Archive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">
              {language === 'pt' ? 'Nenhum período arquivado' : 'No Archived Periods'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {language === 'pt' 
                ? 'Quando você arquivar um período de folha salarial na página de Folha de Pagamento, ele aparecerá aqui.'
                : 'When you archive a payroll period from the Payroll page, it will appear here.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Period Details */}
      {selectedPeriod && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'pt' ? 'Funcionários' : 'Employees'}
                    </p>
                    <p className="text-2xl font-bold">{periodEntries.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'pt' ? 'Total Bruto' : 'Gross Total'}
                    </p>
                    <p className="text-2xl font-bold">{formatAOA(totals.gross)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'pt' ? 'Total Descontos' : 'Total Deductions'}
                    </p>
                    <p className="text-2xl font-bold">{formatAOA(totals.deductions)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === 'pt' ? 'Total Líquido' : 'Net Total'}
                    </p>
                    <p className="text-2xl font-bold text-primary">{formatAOA(totals.net)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deductions Breakdown */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'pt' ? 'Resumo de Descontos' : 'Deductions Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">IRT</p>
                  <p className="font-bold text-destructive">{formatAOA(totals.irt)}</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">INSS</p>
                  <p className="font-bold text-destructive">{formatAOA(totals.inss)}</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'pt' ? 'Faltas' : 'Absences'}
                  </p>
                  <p className="font-bold text-destructive">{formatAOA(totals.absences)}</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'pt' ? 'Adiantamentos' : 'Advances'}
                  </p>
                  <p className="font-bold text-destructive">{formatAOA(totals.advances)}</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">
                    {language === 'pt' ? 'Empréstimos' : 'Loans'}
                  </p>
                  <p className="font-bold text-destructive">{formatAOA(totals.loans)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Details Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {language === 'pt' ? 'Detalhes por Funcionário' : 'Employee Details'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-muted/30">
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        {language === 'pt' ? 'Funcionário' : 'Employee'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        {language === 'pt' ? 'Salário Base' : 'Base Salary'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        {language === 'pt' ? 'Bruto' : 'Gross'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        IRT
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        INSS
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        {language === 'pt' ? 'Outros Desc.' : 'Other Ded.'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        {language === 'pt' ? 'Líquido' : 'Net'}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">
                        {language === 'pt' ? 'Recibo' : 'Receipt'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEntries.map(entry => {
                      const otherDed = (entry.absenceDeduction || 0) + 
                                       (entry.advanceDeduction || 0) + 
                                       (entry.loanDeduction || 0) + 
                                       (entry.otherDeductions || 0);
                      return (
                        <tr key={entry.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">
                                {entry.employee?.firstName} {entry.employee?.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {entry.employee?.position}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {formatAOA(entry.baseSalary)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm">
                            {formatAOA(entry.grossSalary)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-destructive">
                            {formatAOA(entry.irt)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-destructive">
                            {formatAOA(entry.inssEmployee)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-destructive">
                            {otherDed > 0 ? formatAOA(otherDed) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm font-bold text-primary">
                            {formatAOA(entry.netSalary)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewReceipt(entry)}
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Archive Info */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              {language === 'pt' 
                ? `Período arquivado em ${selectedPeriod.paidAt ? new Date(selectedPeriod.paidAt).toLocaleDateString('pt-AO') : 'data não disponível'}`
                : `Period archived on ${selectedPeriod.paidAt ? new Date(selectedPeriod.paidAt).toLocaleDateString('en-US') : 'date not available'}`}
            </p>
          </div>
        </>
      )}

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.receipt.title}</DialogTitle>
          </DialogHeader>
          {selectedEntry && selectedEntry.employee && selectedPeriod && (
            <SalaryReceipt
              entry={selectedEntry}
              employee={selectedEntry.employee}
              companyName={settings.companyName}
              companyNif={settings.nif}
              periodLabel={getPeriodLabel(selectedPeriod.year, selectedPeriod.month)}
              onClose={() => setReceiptOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Printable Payroll Sheet Dialog */}
      <Dialog open={printSheetOpen} onOpenChange={setPrintSheetOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'pt' ? 'Folha Salarial - Histórico' : 'Payroll Sheet - History'}
            </DialogTitle>
          </DialogHeader>
          {selectedPeriod && (
            <PrintablePayrollSheet
              entries={filteredEntries}
              periodLabel={getPeriodLabel(selectedPeriod.year, selectedPeriod.month)}
              companyName={settings.companyName}
              companyNif={settings.nif}
              branch={selectedBranch}
              warehouseName=""
            />
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default PayrollHistory;
