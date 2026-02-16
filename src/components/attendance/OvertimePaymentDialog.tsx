import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Printer, Plus, Trash2, Calculator } from "lucide-react";
import { useEmployeeStore } from "@/stores/employee-store";
import { useBranchStore } from "@/stores/branch-store";
import { useOvertimePaymentStore, type OvertimePaymentEntry } from "@/stores/overtime-payment-store";
import { useSettingsStore } from "@/stores/settings-store";
import { LABOR_LAW, calculateHourlyRate, calculateOvertime, formatAOA } from "@/lib/angola-labor-law";
import { generateOvertimePaymentHtml } from "./PrintableOvertimePayment";
import { printHtml } from "@/lib/print";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OvertimePaymentDialog({ open, onOpenChange }: Props) {
  const { employees } = useEmployeeStore();
  const { branches, getActiveBranches } = useBranchStore();
  const { addPayment } = useOvertimePaymentStore();
  const { settings } = useSettingsStore();

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<Array<{
    employeeId: string;
    hoursWorked: string;
    overtimeType: 'normal' | 'night' | 'holiday';
  }>>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());

  const activeBranches = getActiveBranches();
  const activeEmployees = employees.filter(e => e.status === 'active');

  // Filter employees by branch
  const branchEmployees = useMemo(() => {
    if (!selectedBranchId) return activeEmployees;
    return activeEmployees.filter(e => e.branchId === selectedBranchId);
  }, [selectedBranchId, activeEmployees]);

  const selectedBranch = branches.find(b => b.id === selectedBranchId);

  // Toggle employee selection
  const toggleEmployee = (empId: string) => {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(empId)) {
      newSet.delete(empId);
      setEntries(prev => prev.filter(e => e.employeeId !== empId));
    } else {
      newSet.add(empId);
      setEntries(prev => [...prev, { employeeId: empId, hoursWorked: "1", overtimeType: 'normal' }]);
    }
    setSelectedEmployees(newSet);
  };

  // Select all employees in branch
  const selectAll = () => {
    const allIds = new Set(branchEmployees.map(e => e.id));
    setSelectedEmployees(allIds);
    setEntries(branchEmployees.map(e => ({
      employeeId: e.id,
      hoursWorked: "1",
      overtimeType: 'normal' as const,
    })));
  };

  const clearAll = () => {
    setSelectedEmployees(new Set());
    setEntries([]);
  };

  // Update entry
  const updateEntry = (empId: string, field: 'hoursWorked' | 'overtimeType', value: string) => {
    setEntries(prev => prev.map(e => 
      e.employeeId === empId ? { ...e, [field]: value } : e
    ));
  };

  // Calculate amounts
  const calculatedEntries: OvertimePaymentEntry[] = useMemo(() => {
    return entries.map(entry => {
      const emp = employees.find(e => e.id === entry.employeeId);
      if (!emp) return null;

      const hours = parseFloat(entry.hoursWorked) || 0;
      const hourlyRate = calculateHourlyRate(emp.baseSalary);
      const amount = calculateOvertime(hourlyRate, hours, entry.overtimeType, 0);

      let rate: number = LABOR_LAW.OVERTIME.NORMAL_RATE_FIRST_30;
      if (entry.overtimeType === 'night') rate = LABOR_LAW.OVERTIME.NIGHT_RATE;
      else if (entry.overtimeType === 'holiday') rate = LABOR_LAW.OVERTIME.HOLIDAY_RATE;

      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        baseSalary: emp.baseSalary,
        hourlyRate,
        hoursWorked: hours,
        overtimeType: entry.overtimeType,
        rate,
        amount,
      };
    }).filter(Boolean) as OvertimePaymentEntry[];
  }, [entries, employees]);

  const totalAmount = calculatedEntries.reduce((sum, e) => sum + e.amount, 0);

  // Save and print
  const handleSaveAndPrint = async () => {
    if (calculatedEntries.length === 0) {
      toast.error("Please select employees and enter hours");
      return;
    }
    if (!selectedBranchId) {
      toast.error("Please select a branch");
      return;
    }

    const payment = await addPayment({
      date,
      branchId: selectedBranchId,
      branchName: selectedBranch?.name || '',
      entries: calculatedEntries,
      totalAmount,
      notes: notes || undefined,
    });

    const html = generateOvertimePaymentHtml({
      payment,
      companyName: settings.companyName,
      companyNif: settings.nif,
    });

    await printHtml(html);
    toast.success("Overtime payment saved and sent to print");
    
    // Reset
    setEntries([]);
    setSelectedEmployees(new Set());
    setNotes("");
    onOpenChange(false);
  };

  // Save only
  const handleSaveOnly = async () => {
    if (calculatedEntries.length === 0) {
      toast.error("Please select employees and enter hours");
      return;
    }
    if (!selectedBranchId) {
      toast.error("Please select a branch");
      return;
    }

    await addPayment({
      date,
      branchId: selectedBranchId,
      branchName: selectedBranch?.name || '',
      entries: calculatedEntries,
      totalAmount,
      notes: notes || undefined,
    });

    toast.success("Overtime payment saved to history");
    setEntries([]);
    setSelectedEmployees(new Set());
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Daily Overtime Payment
          </DialogTitle>
          <DialogDescription>
            Select branch, employees, and hours to calculate overtime payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date and Branch */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Branch / Filial</label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent>
                  {activeBranches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Employee Selection */}
          {selectedBranchId && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Employees ({selectedEmployees.size}/{branchEmployees.length} selected)
                </label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                  <Button variant="outline" size="sm" onClick={clearAll}>Clear All</Button>
                </div>
              </div>

              {/* Employee list with checkboxes */}
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {branchEmployees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 p-1 hover:bg-muted rounded">
                    <Checkbox
                      checked={selectedEmployees.has(emp.id)}
                      onCheckedChange={() => toggleEmployee(emp.id)}
                    />
                    <span className="text-sm">{emp.firstName} {emp.lastName}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{formatAOA(emp.baseSalary)}</span>
                  </div>
                ))}
                {branchEmployees.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No employees in this branch</p>
                )}
              </div>
            </>
          )}

          {/* Hours Entry Table */}
          {calculatedEntries.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="w-24">Hours</TableHead>
                    <TableHead className="w-40">Type</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map(entry => {
                    const calc = calculatedEntries.find(c => c.employeeId === entry.employeeId);
                    if (!calc) return null;
                    return (
                      <TableRow key={entry.employeeId}>
                        <TableCell>
                          <span className="text-sm font-medium">{calc.employeeName}</span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0.5"
                            max="12"
                            step="0.5"
                            value={entry.hoursWorked}
                            onChange={e => updateEntry(entry.employeeId, 'hoursWorked', e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={entry.overtimeType}
                            onValueChange={v => updateEntry(entry.employeeId, 'overtimeType', v)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal (+50%/+75%)</SelectItem>
                              <SelectItem value="night">Night (+75%)</SelectItem>
                              <SelectItem value="holiday">Holiday (+100%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{calc.rate}x</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAOA(calc.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => toggleEmployee(entry.employeeId)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Total row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-right">TOTAL:</TableCell>
                    <TableCell className="text-right text-lg">{formatAOA(totalAmount)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-sm font-medium">Notes / Observações</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="secondary" onClick={handleSaveOnly} disabled={calculatedEntries.length === 0}>
            Save Only
          </Button>
          <Button onClick={handleSaveAndPrint} disabled={calculatedEntries.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Save & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
