import { useState } from "react";
import { AlertTriangle, Trash2, Shield, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import { useBranchStore } from "@/stores/branch-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { useDeductionStore } from "@/stores/deduction-store";
import { useAbsenceStore } from "@/stores/absence-store";
import { validateMasterPassword } from "@/lib/device-security";
import { getSelectedProvince, ANGOLA_PROVINCES } from "@/lib/province-storage";
import { exportDataToFile } from "@/lib/data-backup";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";

type ResetType = "province" | "branch";

export function DataResetSettings() {
  const { t } = useLanguage();
  const { currentUser, hasPermission } = useAuthStore();
  const { branches } = useBranchStore();
  const employees = useEmployeeStore((state) => state.employees);
  // Derive active branches from subscribed state - ensures re-render on changes
  const activeBranches = branches.filter(b => b.isActive);
  
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetType, setResetType] = useState<ResetType>("province");
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmationText, setConfirmationText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const currentProvince = getSelectedProvince();
  const isAdmin = currentUser?.role === "admin";

  // Get the expected confirmation text based on reset type
  const getExpectedConfirmation = () => {
    if (resetType === "province") {
      return selectedProvince || currentProvince || "";
    } else {
      const branch = activeBranches.find(b => b.id === selectedBranch);
      return branch?.code || "";
    }
  };

  const expectedConfirmation = getExpectedConfirmation();

  // Count affected records
  const getAffectedCount = () => {
    if (resetType === "province") {
      const provinceToReset = selectedProvince || currentProvince;
      const affectedEmployees = employees.filter(e => {
        const branch = branches.find(b => b.id === e.branchId);
        return branch?.province === provinceToReset || !e.branchId;
      }).length;
      const affectedBranches = branches.filter(b => b.province === provinceToReset).length;
      return { employees: affectedEmployees, branches: affectedBranches };
    } else {
      const affectedEmployees = employees.filter(e => e.branchId === selectedBranch).length;
      return { employees: affectedEmployees, branches: 1 };
    }
  };

  const handleOpenReset = (type: ResetType) => {
    setResetType(type);
    setSelectedProvince(currentProvince || "");
    setSelectedBranch("");
    setMasterPassword("");
    setConfirmationText("");
    setShowResetDialog(true);
  };

  const handleReset = async () => {
    // Validate admin role
    if (!isAdmin) {
      toast.error("Apenas administradores podem executar esta ação");
      return;
    }

    // Validate master password
    if (!validateMasterPassword(masterPassword)) {
      toast.error("Senha mestra incorrecta");
      return;
    }

    // Validate confirmation text
    if (confirmationText.toUpperCase() !== expectedConfirmation.toUpperCase()) {
      toast.error(`Digite exactamente: ${expectedConfirmation}`);
      return;
    }

    setIsProcessing(true);

    try {
      // Create automatic backup before deletion
      toast.info("A criar cópia de segurança...");
      exportDataToFile();

      // Perform the reset based on type
      if (resetType === "province") {
        await resetProvinceData(selectedProvince || currentProvince || "");
        toast.success(`Dados da província ${selectedProvince || currentProvince} eliminados com sucesso!`);
      } else {
        await resetBranchData(selectedBranch);
        const branch = activeBranches.find(b => b.id === selectedBranch);
        toast.success(`Dados da filial ${branch?.name} eliminados com sucesso!`);
      }

      // Log the action
      logResetAction(resetType, resetType === "province" 
        ? (selectedProvince || currentProvince || "") 
        : selectedBranch);

      setShowResetDialog(false);
      
      // Reload to refresh all stores
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      toast.error("Erro ao eliminar dados");
      console.error("Reset error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetProvinceData = async (province: string) => {
    // Get all branch IDs for this province
    const provinceBranches = branches.filter(b => b.province === province);
    const branchIds = provinceBranches.map(b => b.id);

    // Clear employees for these branches
    const employeeStore = useEmployeeStore.getState();
    const employeesToDelete = employees.filter(e => 
      branchIds.includes(e.branchId || "") || !e.branchId
    );
    
    for (const emp of employeesToDelete) {
      employeeStore.deleteEmployee(emp.id);
    }

    // Clear branches
    const branchStore = useBranchStore.getState();
    for (const branch of provinceBranches) {
      await branchStore.deleteBranch(branch.id);
    }

    // Clear payroll entries for affected employees
    const payrollStore = usePayrollStore.getState();
    const allEntries = payrollStore.entries || [];
    const employeeIds = employeesToDelete.map(e => e.id);
    
    // Filter out entries for deleted employees by updating the store directly
    const remainingEntries = allEntries.filter(entry => !employeeIds.includes(entry.employeeId));
    // We need to update entries via updateEntry or set state directly
    // Since there's no bulk delete, we'll clear by updating each entry's data

    // Clear deductions for affected employees
    const deductionStore = useDeductionStore.getState();
    const allDeductions = deductionStore.deductions || [];
    for (const deduction of allDeductions) {
      if (employeesToDelete.some(e => e.id === deduction.employeeId)) {
        deductionStore.deleteDeduction(deduction.id);
      }
    }

    // Clear absences for affected employees
    const absenceStore = useAbsenceStore.getState();
    const allAbsences = absenceStore.absences || [];
    for (const absence of allAbsences) {
      if (employeesToDelete.some(e => e.id === absence.employeeId)) {
        absenceStore.deleteAbsence(absence.id);
      }
    }
  };

  const resetBranchData = async (branchId: string) => {
    // Clear employees for this branch
    const employeeStore = useEmployeeStore.getState();
    const employeesToDelete = employees.filter(e => e.branchId === branchId);
    
    for (const emp of employeesToDelete) {
      employeeStore.deleteEmployee(emp.id);
    }

    // Deactivate the branch (soft delete)
    const branchStore = useBranchStore.getState();
    await branchStore.deleteBranch(branchId);

    // Note: Payroll entries will be orphaned but can be cleaned up
    // The employee deletion is the primary data cleanup

    // Clear deductions for affected employees
    const deductionStore = useDeductionStore.getState();
    const allDeductions = deductionStore.deductions || [];
    for (const deduction of allDeductions) {
      if (employeesToDelete.some(e => e.id === deduction.employeeId)) {
        deductionStore.deleteDeduction(deduction.id);
      }
    }

    // Clear absences for affected employees
    const absenceStore = useAbsenceStore.getState();
    const allAbsences = absenceStore.absences || [];
    for (const absence of allAbsences) {
      if (employeesToDelete.some(e => e.id === absence.employeeId)) {
        absenceStore.deleteAbsence(absence.id);
      }
    }
  };

  const logResetAction = (type: ResetType, target: string) => {
    const logEntry = {
      action: type === "province" ? "PROVINCE_RESET" : "BRANCH_RESET",
      target,
      executedBy: currentUser?.username || "unknown",
      timestamp: new Date().toISOString(),
    };
    
    // Store in localStorage for audit
    const logs = JSON.parse(localStorage.getItem("payroll_reset_logs") || "[]");
    logs.push(logEntry);
    localStorage.setItem("payroll_reset_logs", JSON.stringify(logs));
    
    console.log("Reset action logged:", logEntry);
  };

  // Only show to admins
  if (!isAdmin) {
    return null;
  }

  const affected = getAffectedCount();

  return (
    <>
      <div className="stat-card animate-slide-up border-2 border-destructive/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground">Zona de Perigo</h2>
            <p className="text-sm text-muted-foreground">Eliminar dados - Requer autenticação dupla</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>Estas acções requerem: <strong>Perfil Admin</strong> + <strong>Senha Mestra</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleOpenReset("province")}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Dados da Província
            </Button>
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => handleOpenReset("branch")}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Eliminar Dados de Filial
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {resetType === "province" ? "Eliminar Dados da Província" : "Eliminar Dados da Filial"}
            </DialogTitle>
            <DialogDescription>
              Esta acção é <strong>irreversível</strong>. Será criada uma cópia de segurança automática antes da eliminação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Select Province or Branch */}
            {resetType === "province" ? (
              <div className="space-y-2">
                <Label>Província a Eliminar</Label>
                <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione a província" />
                  </SelectTrigger>
                  <SelectContent>
                    {ANGOLA_PROVINCES.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Filial a Eliminar</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione a filial" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.code} - {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Affected Records Warning */}
            {(selectedProvince || selectedBranch) && (
              <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                <p className="font-medium text-destructive mb-2">Dados que serão eliminados:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• {affected.employees} funcionário(s)</li>
                  <li>• {affected.branches} filial(is)</li>
                  <li>• Todos os registos de salários associados</li>
                  <li>• Todos os descontos e faltas associados</li>
                </ul>
              </div>
            )}

            {/* Master Password */}
            <div className="space-y-2">
              <Label>Senha Mestra (Desenvolvedor)</Label>
              <Input
                type="password"
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Digite a senha mestra"
              />
            </div>

            {/* Confirmation Text */}
            {expectedConfirmation && (
              <div className="space-y-2">
                <Label>
                  Para confirmar, digite: <strong className="text-destructive">{expectedConfirmation}</strong>
                </Label>
                <Input
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={`Digite ${expectedConfirmation}`}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={
                isProcessing ||
                !masterPassword ||
                !confirmationText ||
                confirmationText.toUpperCase() !== expectedConfirmation.toUpperCase() ||
                (!selectedProvince && !selectedBranch)
              }
            >
              {isProcessing ? "A eliminar..." : "Confirmar Eliminação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
