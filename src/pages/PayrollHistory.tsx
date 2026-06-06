import { useState, useMemo } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Archive, DollarSign, Users, TrendingDown, Receipt, Printer, FileDown, Search, MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { usePayrollStore } from "@/stores/payroll-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useBranchStore } from "@/stores/branch-store";
import { useSettingsStore } from "@/stores/settings-store";
import { formatAOA } from "@/lib/angola-labor-law";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SalaryReceipt } from "@/components/payroll/SalaryReceipt";
import { PrintablePayrollSheet } from "@/components/payroll/PrintablePayrollSheet";
import { BatchReceiptPrinter } from "@/components/payroll/BatchReceiptPrinter";
import type { PayrollEntry } from "@/types/payroll";
import { FIXED_TOOLBAR_PAGE } from "@/lib/page-layout";
import {
  getEarlyPaymentRecordAmount,
  getTotalPaidToEmployee,
} from "@/lib/payroll-payout";
import { exportPayrollToCSV } from "@/lib/export-utils";
import { toast } from "sonner";

const PayrollHistory = () => {
  const { t, language } = useLanguage();
  const pt = language === "pt";
  const { periods, entries } = usePayrollStore();
  const { employees } = useEmployeeStore();
  const { branches } = useBranchStore();
  const { settings } = useSettingsStore();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
  const [printSheetOpen, setPrintSheetOpen] = useState(false);
  const [batchReceiptOpen, setBatchReceiptOpen] = useState(false);

  const archivedPeriods = useMemo(
    () =>
      periods
        .filter((p) => p.status === "paid")
        .sort((a, b) => (a.year !== b.year ? b.year - a.year : b.month - a.month)),
    [periods]
  );

  const years = useMemo(() => {
    const set = new Set(archivedPeriods.map((p) => p.year));
    set.add(currentYear);
    return [...set].sort((a, b) => b - a);
  }, [archivedPeriods, currentYear]);

  const monthsInYear = useMemo(() => {
    return archivedPeriods
      .filter((p) => p.year === selectedYear)
      .map((p) => p.month)
      .sort((a, b) => b - a);
  }, [archivedPeriods, selectedYear]);

  const selectedPeriod = useMemo(
    () =>
      archivedPeriods.find((p) => p.year === selectedYear && p.month === selectedMonth) ?? null,
    [archivedPeriods, selectedYear, selectedMonth]
  );

  const monthNames =
    language === "pt"
      ? [
          "Janeiro",
          "Fevereiro",
          "Março",
          "Abril",
          "Maio",
          "Junho",
          "Julho",
          "Agosto",
          "Setembro",
          "Outubro",
          "Novembro",
          "Dezembro",
        ]
      : [
          "January",
          "February",
          "March",
          "April",
          "May",
          "June",
          "July",
          "August",
          "September",
          "October",
          "November",
          "December",
        ];

  const getPeriodLabel = (year: number, month: number) => `${monthNames[month - 1]} ${year}`;

  const periodEntries = useMemo(() => {
    if (!selectedPeriod) return [];
    return entries
      .filter((e) => e.payrollPeriodId === selectedPeriod.id)
      .map((e) => {
        const employeeData = employees.find((emp) => emp.id === e.employeeId);
        return { ...e, employee: employeeData || e.employee };
      })
      .sort((a, b) => {
        const posA = (a.employee?.position || "").toLowerCase();
        const posB = (b.employee?.position || "").toLowerCase();
        if (posA !== posB) return posA.localeCompare(posB);
        const nameA = `${a.employee?.firstName || ""} ${a.employee?.lastName || ""}`.toLowerCase();
        const nameB = `${b.employee?.firstName || ""} ${b.employee?.lastName || ""}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [selectedPeriod, entries, employees]);

  const branchFilteredEntries = useMemo(() => {
    if (selectedBranchId === "all") return periodEntries;
    return periodEntries.filter((e) => e.employee?.branchId === selectedBranchId);
  }, [periodEntries, selectedBranchId]);

  const displayedEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branchFilteredEntries;
    return branchFilteredEntries.filter((e) => {
      const name = `${e.employee?.firstName || ""} ${e.employee?.lastName || ""}`.toLowerCase();
      const num = (e.employee?.employeeNumber || "").toLowerCase();
      return name.includes(q) || num.includes(q);
    });
  }, [branchFilteredEntries, search]);

  const totals = useMemo(
    () =>
      branchFilteredEntries.reduce(
        (acc, e) => ({
          gross: acc.gross + e.grossSalary,
          deductions: acc.deductions + e.totalDeductions,
          payout: acc.payout + getTotalPaidToEmployee(e),
          earlyPayCount: acc.earlyPayCount + (e.paidEarly ? 1 : 0),
        }),
        { gross: 0, deductions: 0, payout: 0, earlyPayCount: 0 }
      ),
    [branchFilteredEntries]
  );

  const branchOptions = useMemo(() => {
    const active = branches.filter((b) => b.isActive);
    return active.length > 0 ? active : branches;
  }, [branches]);

  const selectedBranch = branchOptions.find((b) => b.id === selectedBranchId);

  const handleViewReceipt = (entry: PayrollEntry) => {
    setSelectedEntry(entry);
    setReceiptOpen(true);
  };

  const handleExport = () => {
    if (!selectedPeriod || branchFilteredEntries.length === 0) return;
    exportPayrollToCSV(
      branchFilteredEntries,
      getPeriodLabel(selectedPeriod.year, selectedPeriod.month),
      language
    );
    toast.success(pt ? "Exportado" : "Exported");
  };

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${FIXED_TOOLBAR_PAGE} gap-2`}>
        {/* Toolbar */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm">
          <Archive className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm font-semibold shrink-0">
            {pt ? "Histórico Folha" : "Payroll History"}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{pt ? "Filial" : "Branch"}</span>
          </div>
          <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder={pt ? "Seleccionar filial" : "Select branch"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{pt ? "Todas as filiais" : "All branches"}</SelectItem>
              {branchOptions.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                  {branch.code ? ` (${branch.code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(selectedYear)}
            onValueChange={(v) => {
              setSelectedYear(Number(v));
              setSelectedMonth(null);
            }}
            disabled={years.length === 0}
          >
            <SelectTrigger className="h-8 w-[90px] text-xs">
              <SelectValue placeholder={pt ? "Ano" : "Year"} />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth?.toString() ?? "none"}
            onValueChange={(v) => setSelectedMonth(v === "none" ? null : Number(v))}
            disabled={monthsInYear.length === 0}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder={pt ? "Mês" : "Month"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{pt ? "— Mês —" : "— Month —"}</SelectItem>
              {monthsInYear.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {monthNames[m - 1]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[120px] max-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder={pt ? "Funcionário..." : "Employee..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs shrink-0"
            disabled={!selectedPeriod || branchFilteredEntries.length === 0}
            onClick={() => {
              if (selectedBranchId === "all") {
                toast.error(pt ? "Seleccione uma filial para imprimir" : "Select a branch to print");
                return;
              }
              setPrintSheetOpen(true);
            }}
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            {pt ? "Imprimir" : "Print"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs shrink-0"
            disabled={!selectedPeriod || periodEntries.length === 0}
            onClick={() => setBatchReceiptOpen(true)}
          >
            <Receipt className="h-3.5 w-3.5 mr-1.5" />
            {t.payroll.batchReceipts}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs shrink-0"
            disabled={!selectedPeriod || branchFilteredEntries.length === 0}
            onClick={handleExport}
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5" />
            Excel
          </Button>
        </div>

        {/* KPIs */}
        {selectedPeriod && (
          <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                icon: Users,
                label: pt ? "Funcionários" : "Employees",
                value: String(branchFilteredEntries.length),
              },
              {
                icon: DollarSign,
                label: pt ? "Bruto" : "Gross",
                value: formatAOA(totals.gross),
              },
              {
                icon: TrendingDown,
                label: pt ? "Descontos" : "Deductions",
                value: formatAOA(totals.deductions),
              },
              {
                icon: DollarSign,
                label: pt ? "Líquido pago" : "Net paid",
                value: formatAOA(totals.payout),
                highlight: true,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-lg border border-border/50 bg-card px-3 py-2 flex items-center gap-2"
              >
                <kpi.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
                  <p
                    className={`text-sm font-bold truncate ${kpi.highlight ? "text-primary" : ""}`}
                  >
                    {kpi.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {!selectedPeriod && (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground rounded-xl border border-dashed">
            <Archive className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm font-medium">
              {archivedPeriods.length === 0
                ? pt
                  ? "Nenhum período fechado"
                  : "No closed periods"
                : monthsInYear.length === 0
                  ? pt
                    ? `Sem folhas fechadas em ${selectedYear}`
                    : `No closed payroll in ${selectedYear}`
                  : pt
                    ? "Seleccione o mês"
                    : "Select month"}
            </p>
            <p className="text-xs mt-1 max-w-sm text-center px-4">
              {archivedPeriods.length === 0
                ? pt
                  ? "Períodos pagos/arquivados na Folha aparecem aqui."
                  : "Paid/archived payroll periods appear here."
                : monthsInYear.length === 0
                  ? pt
                    ? "Escolha outro ano ou feche um período na Folha."
                    : "Pick another year or close a period in Payroll."
                  : pt
                    ? `Ano ${selectedYear} — escolha o mês do histórico.`
                    : `Year ${selectedYear} — pick the history month.`}
            </p>
          </div>
        )}

        {selectedPeriod && (
          <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <div className="shrink-0 px-3 py-1.5 border-b bg-muted/30 flex justify-between items-center text-xs text-muted-foreground">
              <span>
                {getPeriodLabel(selectedPeriod.year, selectedPeriod.month)}
                {selectedBranchId !== "all" && selectedBranch && ` · ${selectedBranch.name}`}
                {selectedPeriod.paidAt &&
                  ` · ${pt ? "Fechado" : "Closed"} ${new Date(selectedPeriod.paidAt).toLocaleDateString(pt ? "pt-AO" : "en-US")}`}
              </span>
              <span>
                {displayedEntries.length}/{branchFilteredEntries.length}
                {totals.earlyPayCount > 0 &&
                  ` · ${totals.earlyPayCount} PA`}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-auto overscroll-contain">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">
                      {pt ? "Funcionário" : "Employee"}
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">
                      {pt ? "Bruto" : "Gross"}
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">
                      IRT
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">
                      INSS
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">
                      {pt ? "Desc." : "Ded."}
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-medium text-muted-foreground uppercase">
                      {pt ? "Líquido" : "Net"}
                    </th>
                    <th className="px-3 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase w-16">
                      {pt ? "Recibo" : "Rcpt"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayedEntries.map((entry) => {
                    const otherDed =
                      (entry.absenceDeduction || 0) +
                      (entry.advanceDeduction || 0) +
                      (entry.loanDeduction || 0) +
                      (entry.otherDeductions || 0);
                    return (
                      <tr key={entry.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {entry.employee?.firstName} {entry.employee?.lastName}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {entry.employee?.employeeNumber} · {entry.employee?.position}
                              </p>
                            </div>
                            {entry.paidEarly && (
                              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-medium">
                                PA
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {formatAOA(entry.grossSalary)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-destructive">
                          {formatAOA(entry.irt)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-destructive">
                          {formatAOA(entry.inssEmployee)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-destructive">
                          {otherDed > 0 ? formatAOA(otherDed) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs font-bold text-primary">
                          {entry.paidEarly ? (
                            <span className="inline-flex items-center justify-end gap-1">
                              <span className="line-through text-muted-foreground font-normal">
                                {formatAOA(getEarlyPaymentRecordAmount(entry))}
                              </span>
                              <span>{formatAOA(0)}</span>
                            </span>
                          ) : (
                            formatAOA(getTotalPaidToEmployee(entry))
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewReceipt(entry)}>
                            <Receipt className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {displayedEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-sm">
                        {pt ? "Nenhum resultado" : "No results"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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

      <Dialog open={printSheetOpen} onOpenChange={setPrintSheetOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pt ? "Folha Salarial — Histórico" : "Payroll Sheet — History"}</DialogTitle>
          </DialogHeader>
          {selectedPeriod && (
            <PrintablePayrollSheet
              entries={branchFilteredEntries}
              periodLabel={getPeriodLabel(selectedPeriod.year, selectedPeriod.month)}
              companyName={settings.companyName}
              companyNif={settings.nif}
              branch={selectedBranchId !== "all" ? selectedBranch : undefined}
              warehouseName=""
            />
          )}
        </DialogContent>
      </Dialog>

      {selectedPeriod && (
        <BatchReceiptPrinter
          open={batchReceiptOpen}
          onOpenChange={setBatchReceiptOpen}
          entries={periodEntries}
          periodLabel={getPeriodLabel(selectedPeriod.year, selectedPeriod.month)}
          companyName={settings.companyName}
          companyNif={settings.nif}
        />
      )}
    </TopNavLayout>
  );
};

export default PayrollHistory;
