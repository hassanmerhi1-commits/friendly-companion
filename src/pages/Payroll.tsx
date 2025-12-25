import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calculator, FileDown, Send, DollarSign, TrendingUp, Clock, CheckCircle, Receipt } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { usePayrollStore } from "@/stores/payroll-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useDeductionStore } from "@/stores/deduction-store";
import { SalaryReceipt } from "@/components/payroll/SalaryReceipt";
import { formatAOA } from "@/lib/angola-labor-law";
import { exportPayrollToCSV } from "@/lib/export-utils";
import { toast } from "sonner";
import type { PayrollEntry } from "@/types/payroll";

const Payroll = () => {
  const { t, language } = useLanguage();
  const { periods, entries, generateEntriesForPeriod, getCurrentPeriod, getEntriesForPeriod, approvePeriod, updateEntry } = usePayrollStore();
  const { getActiveEmployees } = useEmployeeStore();
  const { getPendingDeductions, applyDeductionToPayroll, getTotalPendingByEmployee } = useDeductionStore();
  
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);

  const currentPeriod = getCurrentPeriod();
  const currentEntries = currentPeriod ? getEntriesForPeriod(currentPeriod.id) : [];
  
  const totals = currentEntries.reduce((acc, e) => ({
    gross: acc.gross + e.grossSalary,
    deductions: acc.deductions + e.totalDeductions,
    net: acc.net + e.netSalary,
  }), { gross: 0, deductions: 0, net: 0 });

  const handleCalculate = () => {
    if (!currentPeriod) return;
    const activeEmployees = getActiveEmployees();
    generateEntriesForPeriod(currentPeriod.id, activeEmployees);
    
    // Apply pending deductions to each entry
    const updatedEntries = getEntriesForPeriod(currentPeriod.id);
    updatedEntries.forEach(entry => {
      const pendingAmount = getTotalPendingByEmployee(entry.employeeId);
      if (pendingAmount > 0) {
        updateEntry(entry.id, { 
          otherDeductions: pendingAmount,
          netSalary: entry.netSalary - pendingAmount,
          totalDeductions: entry.totalDeductions + pendingAmount,
        });
        const deductions = getPendingDeductions(entry.employeeId);
        deductions.forEach(d => applyDeductionToPayroll(d.id, currentPeriod.id));
      }
    });
    
    toast.success(t.payroll.calculatePayroll);
  };

  const handleExport = () => {
    const monthName = language === 'pt' 
      ? ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][new Date().getMonth()]
      : ['January','February','March','April','May','June','July','August','September','October','November','December'][new Date().getMonth()];
    exportPayrollToCSV(currentEntries, `${monthName}-${new Date().getFullYear()}`, language);
    toast.success(t.export.success);
  };

  const handleViewReceipt = (entry: PayrollEntry) => {
    setSelectedEntry(entry);
    setReceiptOpen(true);
  };

  const handleApprove = () => {
    if (currentPeriod) {
      approvePeriod(currentPeriod.id);
      toast.success(t.common.approved);
    }
  };

  const monthNames = language === 'pt'
    ? ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.payroll.title}</h1>
          <p className="text-muted-foreground mt-1">
            {monthNames[new Date().getMonth()]} {new Date().getFullYear()} • {t.payroll.paymentPeriod}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport} disabled={currentEntries.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />
            {t.export.excel}
          </Button>
          <Button variant="accent" onClick={handleCalculate}>
            <Calculator className="h-4 w-4 mr-2" />
            {t.payroll.calculatePayroll}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title={t.payroll.grossSalaries} value={formatAOA(totals.gross)} icon={DollarSign} variant="accent" delay={0} />
        <StatCard title={t.payroll.totalDeductions} value={formatAOA(totals.deductions)} subtitle="IRT + INSS" icon={TrendingUp} delay={50} />
        <StatCard title={t.payroll.netSalaries} value={formatAOA(totals.net)} icon={CheckCircle} delay={100} />
        <StatCard title={t.employees.title} value={String(currentEntries.length)} icon={Clock} delay={150} />
      </div>

      {currentEntries.length > 0 && (
        <div className="stat-card p-0 overflow-hidden mb-6">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">{t.payroll.employeeDetails}</h2>
          </div>
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{t.employees.employee}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.payroll.gross}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.payroll.irt}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.payroll.inss}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.receipt.otherDeductions}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.payroll.net}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">{t.common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {currentEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{entry.employee?.firstName} {entry.employee?.lastName}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatAOA(entry.grossSalary)}</td>
                  <td className="px-4 py-3 text-right font-mono text-destructive">{formatAOA(entry.irt)}</td>
                  <td className="px-4 py-3 text-right font-mono text-destructive">{formatAOA(entry.inssEmployee)}</td>
                  <td className="px-4 py-3 text-right font-mono text-destructive">{formatAOA(entry.otherDeductions)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-primary">{formatAOA(entry.netSalary)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewReceipt(entry)}>
                      <Receipt className="h-4 w-4 mr-1" />
                      {t.receipt.viewReceipt}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="stat-card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{t.payroll.readyToProcess}</h3>
            <p className="text-sm text-muted-foreground">{t.payroll.reviewAndApprove}</p>
          </div>
          <Button variant="accent" size="lg" onClick={handleApprove} disabled={currentEntries.length === 0}>
            <Send className="h-4 w-4 mr-2" />
            {t.payroll.approveAndProcess}
          </Button>
        </div>
      </div>

      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.receipt.title}</DialogTitle>
          </DialogHeader>
          {selectedEntry && selectedEntry.employee && (
            <SalaryReceipt
              entry={selectedEntry}
              employee={selectedEntry.employee}
              periodLabel={`${monthNames[new Date().getMonth()]} ${new Date().getFullYear()}`}
              onClose={() => setReceiptOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Payroll;
