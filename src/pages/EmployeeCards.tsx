import { useState, useRef, useMemo } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Printer, CreditCard, ChevronLeft, ChevronRight, CameraOff } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { useBranchStore } from "@/stores/branch-store";
import {
  PrintableEmployeeCard,
  PrintableEmployeeCardBatch,
  EmployeeCardFront,
  EmployeeCardBack,
} from "@/components/employees/PrintableEmployeeCard";
import type { Employee } from "@/types/employee";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

const EmployeeCards = () => {
  const { language } = useLanguage();
  const pt = language === "pt";
  const { employees } = useEmployeeStore();
  const { branches } = useBranchStore();
  const [search, setSearch] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");
  const [missingPhotoOnly, setMissingPhotoOnly] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const cardRef = useRef<HTMLDivElement>(null);
  const batchRef = useRef<HTMLDivElement>(null);

  const activeEmployees = employees.filter((emp) => emp.status === "active");

  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter((emp) => {
      const matchesSearch =
        emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeNumber.toLowerCase().includes(search.toLowerCase());
      const matchesBranch =
        selectedBranchFilter === "all" || emp.branchId === selectedBranchFilter;
      const matchesPhoto = !missingPhotoOnly || !emp.photoUrl;
      return matchesSearch && matchesBranch && matchesPhoto;
    });
  }, [activeEmployees, search, selectedBranchFilter, missingPhotoOnly]);

  const selectedForBatch = useMemo(
    () => filteredEmployees.filter((e) => selectedIds.has(e.id)),
    [filteredEmployees, selectedIds]
  );

  const getBranchName = (branchId?: string) => {
    if (!branchId) return "-";
    const branch = branches.find((b) => b.id === branchId);
    return branch ? branch.name : "-";
  };

  const warnMissingPhotos = (list: Employee[]) => {
    const missing = list.filter((e) => !e.photoUrl);
    if (missing.length > 0) {
      toast.warning(
        pt
          ? `${missing.length} cartão(ões) sem foto.`
          : `${missing.length} card(s) without photo.`
      );
    }
  };

  const handlePrintSingle = useReactToPrint({
    contentRef: cardRef,
    documentTitle: selectedEmployee
      ? `Cartao-${selectedEmployee.firstName}-${selectedEmployee.lastName}`
      : "Cartao-Funcionario",
    onBeforePrint: async () => {
      const target =
        selectedForBatch.length === 1 ? selectedForBatch[0] : selectedEmployee;
      if (target) warnMissingPhotos([target]);
    },
  });

  const handlePrintBatch = useReactToPrint({
    contentRef: batchRef,
    documentTitle: pt ? "Cartoes-Funcionarios" : "Employee-ID-Cards",
    onBeforePrint: async () => {
      warnMissingPhotos(selectedForBatch);
    },
  });

  const printEmployee =
    selectedForBatch.length === 1
      ? selectedForBatch[0]
      : selectedForBatch.length === 0
        ? selectedEmployee
        : null;

  const handlePrint = () => {
    if (selectedForBatch.length > 1) {
      handlePrintBatch();
    } else if (printEmployee) {
      handlePrintSingle();
    }
  };

  const canPrint = selectedForBatch.length > 1 || !!printEmployee;

  const currentIndex = selectedEmployee
    ? filteredEmployees.findIndex((e) => e.id === selectedEmployee.id)
    : -1;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const printLabel =
    selectedForBatch.length > 1
      ? pt
        ? `Imprimir ${selectedForBatch.length}`
        : `Print ${selectedForBatch.length}`
      : pt
        ? "Imprimir"
        : "Print";

  return (
    <TopNavLayout scrollable={false}>
      <div className="flex flex-col flex-1 min-h-0 gap-2 overflow-hidden">
        {/* Top toolbar — search & filters above everything */}
        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2 shadow-sm">
          <CreditCard className="h-5 w-5 text-primary shrink-0" />
          <span className="text-sm font-semibold shrink-0">{pt ? "Cartões ID" : "ID Cards"}</span>

          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={pt ? "Nome ou nº..." : "Name or no..."}
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder={pt ? "Filial" : "Branch"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{pt ? "Todas" : "All"}</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer shrink-0">
            <Checkbox
              checked={missingPhotoOnly}
              onCheckedChange={(v) => setMissingPhotoOnly(v === true)}
            />
            <CameraOff className="h-3.5 w-3.5" />
            {pt ? "Sem foto" : "No photo"}
          </label>

          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={selectAllFiltered}>
            {pt ? "Todos" : "All"}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearSelection}>
            {pt ? "Limpar" : "Clear"}
          </Button>

          {selectedIds.size > 0 && (
            <span className="text-xs text-primary font-medium shrink-0">
              {selectedIds.size} {pt ? "sel." : "sel."}
            </span>
          )}

          <Button
            variant="accent"
            size="sm"
            className="h-8 shrink-0 ml-auto"
            disabled={!canPrint}
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-1.5" />
            {printLabel}
          </Button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr] gap-2 overflow-hidden">
          {/* Employee list — full column height */}
          <div className="flex flex-col min-h-0 rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            <div className="shrink-0 px-3 py-1.5 border-b border-border bg-muted/30">
              <p className="text-xs text-muted-foreground">
                {filteredEmployees.length} {pt ? "funcionários" : "employees"}
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-border">
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className={`flex items-start gap-2.5 px-3 py-2.5 ${
                    selectedEmployee?.id === emp.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <Checkbox
                    className="mt-1"
                    checked={selectedIds.has(emp.id)}
                    onCheckedChange={() => toggleSelect(emp.id)}
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedEmployee(emp)}
                    className="flex-1 text-left flex items-start gap-3 min-w-0 rounded hover:opacity-90"
                  >
                    <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                      <AvatarImage src={emp.photoUrl} alt={`${emp.firstName} ${emp.lastName}`} />
                      <AvatarFallback className="bg-accent/20 text-accent text-xs">
                        {emp.firstName[0]}
                        {emp.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 pr-1">
                      <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{emp.employeeNumber}</p>
                      <p className="text-[11px] text-muted-foreground/80 truncate">
                        {emp.position}
                      </p>
                    </div>
                    {!emp.photoUrl && (
                      <CameraOff className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-1" />
                    )}
                  </button>
                </div>
              ))}
              {filteredEmployees.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  {pt ? "Nenhum funcionário" : "No employees"}
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="flex flex-col min-h-0 rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
            {selectedEmployee ? (
              <>
                <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border/50">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() =>
                      currentIndex > 0 && setSelectedEmployee(filteredEmployees[currentIndex - 1])
                    }
                    disabled={currentIndex <= 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 min-w-0 text-center">
                    <p className="text-base font-semibold text-foreground leading-tight truncate">
                      {selectedEmployee.firstName} {selectedEmployee.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEmployee.employeeNumber} · {getBranchName(selectedEmployee.branchId)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {currentIndex + 1}/{filteredEmployees.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() =>
                      currentIndex < filteredEmployees.length - 1 &&
                      setSelectedEmployee(filteredEmployees[currentIndex + 1])
                    }
                    disabled={currentIndex >= filteredEmployees.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex-1 min-h-0 flex items-center justify-center gap-5 px-4 overflow-hidden">
                  <div className="origin-center scale-[0.8] sm:scale-[0.88] lg:scale-[0.92] xl:scale-100">
                    <EmployeeCardFront employee={selectedEmployee} language={language} />
                  </div>
                  <div className="origin-center scale-[0.8] sm:scale-[0.88] lg:scale-[0.92] xl:scale-100">
                    <EmployeeCardBack employee={selectedEmployee} language={language} />
                  </div>
                </div>

              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
                <CreditCard className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">
                  {pt ? "Seleccione um funcionário" : "Select an employee"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {printEmployee && selectedForBatch.length <= 1 && (
        <div className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none" aria-hidden>
          <PrintableEmployeeCard ref={cardRef} employee={printEmployee} language={language} />
        </div>
      )}

      {selectedForBatch.length > 1 && (
        <PrintableEmployeeCardBatch
          ref={batchRef}
          employees={selectedForBatch}
          language={language}
        />
      )}
    </TopNavLayout>
  );
};

export default EmployeeCards;
