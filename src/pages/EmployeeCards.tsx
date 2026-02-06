import { useState, useRef } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Printer, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { useBranchStore } from "@/stores/branch-store";
import { PrintableEmployeeCard } from "@/components/employees/PrintableEmployeeCard";
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

const EmployeeCards = () => {
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { branches } = useBranchStore();
  const [search, setSearch] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const activeEmployees = employees.filter(emp => emp.status === "active");

  const filteredEmployees = activeEmployees.filter(emp => {
    const matchesSearch = 
      emp.firstName.toLowerCase().includes(search.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(search.toLowerCase()) ||
      emp.employeeNumber.toLowerCase().includes(search.toLowerCase());
    
    const matchesBranch = selectedBranchFilter === "all" || emp.branchId === selectedBranchFilter;
    
    return matchesSearch && matchesBranch;
  });

  const getBranchName = (branchId?: string) => {
    if (!branchId) return "-";
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : "-";
  };

  const handlePrint = useReactToPrint({
    contentRef: cardRef,
    documentTitle: selectedEmployee 
      ? `Cartao-${selectedEmployee.firstName}-${selectedEmployee.lastName}` 
      : "Cartao-Funcionario",
  });

  const currentIndex = selectedEmployee 
    ? filteredEmployees.findIndex(e => e.id === selectedEmployee.id)
    : -1;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setSelectedEmployee(filteredEmployees[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredEmployees.length - 1) {
      setSelectedEmployee(filteredEmployees[currentIndex + 1]);
    }
  };

  return (
    <TopNavLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-primary" />
            {language === "pt" ? "Cartões de Identificação" : "ID Cards"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {language === "pt" 
              ? "Selecione um funcionário para visualizar e imprimir o cartão" 
              : "Select an employee to view and print their ID card"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search and Filter */}
          <div className="stat-card space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={language === "pt" ? "Pesquisar funcionário..." : "Search employee..."}
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
              <SelectTrigger>
                <SelectValue placeholder={language === "pt" ? "Filtrar por filial" : "Filter by branch"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {language === "pt" ? "Todas as filiais" : "All branches"}
                </SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee List */}
          <div className="stat-card p-0 max-h-[60vh] overflow-y-auto">
            <div className="p-3 border-b border-border bg-muted/30">
              <p className="text-sm font-medium text-muted-foreground">
                {filteredEmployees.length} {language === "pt" ? "funcionário(s)" : "employee(s)"}
              </p>
            </div>
            <div className="divide-y divide-border">
              {filteredEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3 ${
                    selectedEmployee?.id === emp.id ? "bg-primary/10 border-l-4 border-l-primary" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={emp.photoUrl} alt={`${emp.firstName} ${emp.lastName}`} />
                    <AvatarFallback className="bg-accent/20 text-accent text-sm">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emp.position} • {getBranchName(emp.branchId)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {emp.employeeNumber}
                  </span>
                </button>
              ))}

              {filteredEmployees.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>{language === "pt" ? "Nenhum funcionário encontrado" : "No employees found"}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Preview */}
        <div className="lg:col-span-2">
          <div className="stat-card">
            {selectedEmployee ? (
              <>
                {/* Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePrevious}
                      disabled={currentIndex <= 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentIndex + 1} / {filteredEmployees.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNext}
                      disabled={currentIndex >= filteredEmployees.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="accent" onClick={() => handlePrint()}>
                    <Printer className="h-4 w-4 mr-2" />
                    {language === "pt" ? "Imprimir Cartão" : "Print Card"}
                  </Button>
                </div>

                {/* Card Display */}
                <div className="flex justify-center overflow-auto py-4">
                  <PrintableEmployeeCard ref={cardRef} employee={selectedEmployee} />
                </div>

                {/* Employee Summary */}
                <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-medium text-foreground mb-2">
                    {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">
                        {language === "pt" ? "Nº Funcionário" : "Employee #"}
                      </p>
                      <p className="font-medium">{selectedEmployee.employeeNumber}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {language === "pt" ? "Departamento" : "Department"}
                      </p>
                      <p className="font-medium">{selectedEmployee.department}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">BI</p>
                      <p className="font-medium">{selectedEmployee.bilheteIdentidade || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">INSS</p>
                      <p className="font-medium">{selectedEmployee.inssNumber || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">
                  {language === "pt" ? "Nenhum funcionário selecionado" : "No employee selected"}
                </h3>
                <p className="text-sm">
                  {language === "pt" 
                    ? "Selecione um funcionário da lista para visualizar o cartão" 
                    : "Select an employee from the list to view their card"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default EmployeeCards;
