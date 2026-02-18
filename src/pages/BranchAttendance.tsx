import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBranchStore } from '@/stores/branch-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { useLanguage } from '@/lib/i18n';
import { Check, X, Download, Send, ArrowLeft, Lock, Building2, Calendar, Users, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { liveInit, initSyncListener } from '@/lib/db-live';
import { initBranchStoreSync } from '@/stores/branch-store';
import { initEmployeeStoreSync } from '@/stores/employee-store';

interface AttendanceEntry {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  status: 'present' | 'absent';
}

export interface BranchAttendanceData {
  branchId: string;
  branchName: string;
  branchCode: string;
  date: string;
  entries: AttendanceEntry[];
  submittedAt: string;
  submittedBy: string;
}

// Imported branch package shape
interface BranchPackage {
  type: 'branch_package';
  branch: {
    id: string;
    name: string;
    code: string;
    province: string;
    city: string;
    pin: string;
  };
  employees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    position?: string;
    department?: string;
  }>;
}

type Step = 'pin' | 'attendance' | 'summary';

export default function BranchAttendance() {
  const { language } = useLanguage();
  const { branches, isLoaded: branchesLoaded, loadBranches } = useBranchStore();
  const { employees, isLoaded: employeesLoaded, loadEmployees } = useEmployeeStore();
  const [selfInitialized, setSelfInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [importedPackage, setImportedPackage] = useState<BranchPackage | null>(() => {
    // Check localStorage for previously imported package
    try {
      const saved = localStorage.getItem('branch_attendance_package');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Self-initialize: load stores if they haven't been loaded yet (standalone mode)
  useEffect(() => {
    const init = async () => {
      if (branchesLoaded && employeesLoaded) {
        setSelfInitialized(true);
        return;
      }
      try {
        await liveInit();
        initSyncListener();
        initBranchStoreSync();
        initEmployeeStoreSync();
        await Promise.all([loadBranches(), loadEmployees()]);
        setSelfInitialized(true);
      } catch (error) {
        console.error('[BranchAttendance] Init error:', error);
        // Even if DB init fails, mark as initialized — user can import package
        setSelfInitialized(true);
      }
    };
    init();
  }, []);

  const [step, setStep] = useState<Step>('pin');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);

  // Merge DB branches with imported package
  const activeBranches = useMemo(() => {
    const dbBranches = branches.filter(b => b.isActive && b.pin);
    if (importedPackage && !dbBranches.find(b => b.id === importedPackage.branch.id)) {
      // Add imported branch as a virtual branch
      dbBranches.push({
        id: importedPackage.branch.id,
        name: importedPackage.branch.name,
        code: importedPackage.branch.code,
        province: importedPackage.branch.province,
        city: importedPackage.branch.city,
        pin: importedPackage.branch.pin,
        isActive: true,
        isHeadquarters: false,
        address: '',
        createdAt: '',
        updatedAt: '',
      });
    }
    return dbBranches;
  }, [branches, importedPackage]);

  const selectedBranch = useMemo(() => activeBranches.find(b => b.id === selectedBranchId), [activeBranches, selectedBranchId]);
  
  const branchEmployees = useMemo(() => {
    if (!selectedBranchId) return [];
    // Check imported package first
    if (importedPackage && importedPackage.branch.id === selectedBranchId) {
      return importedPackage.employees.map(e => ({
        ...e,
        branchId: selectedBranchId,
        status: 'active' as const,
      }));
    }
    return employees.filter(e => e.branchId === selectedBranchId && e.status === 'active');
  }, [selectedBranchId, employees, importedPackage]);

  // Handle file import
  const handleImportPackage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const pkg = JSON.parse(e.target?.result as string) as BranchPackage;
        if (pkg.type !== 'branch_package' || !pkg.branch || !pkg.employees) {
          toast.error(language === 'pt' ? 'Ficheiro inválido' : 'Invalid file');
          return;
        }
        setImportedPackage(pkg);
        localStorage.setItem('branch_attendance_package', JSON.stringify(pkg));
        setInitError(null);
        toast.success(language === 'pt' 
          ? `Filial carregada: ${pkg.branch.name} (${pkg.employees.length} funcionários)` 
          : `Branch loaded: ${pkg.branch.name} (${pkg.employees.length} employees)`);
      } catch {
        toast.error(language === 'pt' ? 'Erro ao ler ficheiro' : 'Error reading file');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    event.target.value = '';
  };

  // Loading state while self-initializing
  if (!selfInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {language === 'pt' ? 'A carregar dados...' : 'Loading data...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No early return for initError — show import option instead in PIN screen

  const t = {
    title: language === 'pt' ? 'Presenças da Filial' : 'Branch Attendance',
    selectBranch: language === 'pt' ? 'Selecionar Filial' : 'Select Branch',
    enterPin: language === 'pt' ? 'Introduza o PIN' : 'Enter PIN',
    pinPlaceholder: language === 'pt' ? 'PIN de 4-6 dígitos' : '4-6 digit PIN',
    wrongPin: language === 'pt' ? 'PIN incorrecto' : 'Wrong PIN',
    noBranches: language === 'pt' ? 'Nenhuma filial com PIN configurado' : 'No branches with PIN configured',
    unlock: language === 'pt' ? 'Desbloquear' : 'Unlock',
    date: language === 'pt' ? 'Data' : 'Date',
    markAll: language === 'pt' ? 'Marcar Todos' : 'Mark All',
    allPresent: language === 'pt' ? 'Todos Presentes' : 'All Present',
    allAbsent: language === 'pt' ? 'Todos Ausentes' : 'All Absent',
    present: language === 'pt' ? 'Presente' : 'Present',
    absent: language === 'pt' ? 'Ausente' : 'Absent',
    summary: language === 'pt' ? 'Resumo' : 'Summary',
    totalPresent: language === 'pt' ? 'Total Presentes' : 'Total Present',
    totalAbsent: language === 'pt' ? 'Total Absent' : 'Total Absent',
    exportFile: language === 'pt' ? 'Exportar Ficheiro' : 'Export File',
    sendNetwork: language === 'pt' ? 'Enviar pela Rede' : 'Send via Network',
    back: language === 'pt' ? 'Voltar' : 'Back',
    confirm: language === 'pt' ? 'Confirmar Presenças' : 'Confirm Attendance',
    noEmployees: language === 'pt' ? 'Nenhum funcionário nesta filial' : 'No employees in this branch',
    exported: language === 'pt' ? 'Ficheiro exportado com sucesso!' : 'File exported successfully!',
    sent: language === 'pt' ? 'Dados enviados com sucesso!' : 'Data sent successfully!',
    employees: language === 'pt' ? 'funcionários' : 'employees',
  };

  const handlePinSubmit = () => {
    if (!selectedBranchId) return;
    const branch = activeBranches.find(b => b.id === selectedBranchId);
    if (!branch || !branch.pin) return;

    if (pinInput === branch.pin) {
      setPinError('');
      const initialEntries: AttendanceEntry[] = branchEmployees.map(emp => ({
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeNumber: emp.employeeNumber,
        status: 'present' as const,
      }));
      setEntries(initialEntries);
      setStep('attendance');
    } else {
      setPinError(t.wrongPin);
    }
  };

  const toggleStatus = (employeeId: string) => {
    setEntries(prev => prev.map(e =>
      e.employeeId === employeeId
        ? { ...e, status: e.status === 'present' ? 'absent' : 'present' }
        : e
    ));
  };

  const markAll = (status: 'present' | 'absent') => {
    setEntries(prev => prev.map(e => ({ ...e, status })));
  };

  const presentCount = entries.filter(e => e.status === 'present').length;
  const absentCount = entries.filter(e => e.status === 'absent').length;

  const buildExportData = (): BranchAttendanceData => ({
    branchId: selectedBranchId,
    branchName: selectedBranch?.name || '',
    branchCode: selectedBranch?.code || '',
    date,
    entries,
    submittedAt: new Date().toISOString(),
    submittedBy: `Branch Chief - ${selectedBranch?.name}`,
  });

  const handleExportFile = () => {
    const data = buildExportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presencas-${selectedBranch?.code}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.exported);
  };

  const handleSendNetwork = async () => {
    try {
      const data = buildExportData();
      // Try to send via WebSocket if available
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;
      if (isElectron && (window as any).electronAPI?.ws) {
        (window as any).electronAPI.ws.send(JSON.stringify({
          type: 'branch_attendance',
          payload: data,
        }));
        toast.success(t.sent);
      } else {
        // Fallback: save to localStorage for import
        const existing = JSON.parse(localStorage.getItem('branch_attendance_inbox') || '[]');
        existing.push(data);
        localStorage.setItem('branch_attendance_inbox', JSON.stringify(existing));
        toast.success(t.sent);
      }
    } catch (error) {
      console.error('Error sending attendance:', error);
      // Fallback to file export
      handleExportFile();
    }
  };

  // PIN entry step
  if (step === 'pin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">{t.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Import button - always visible */}
            <div className="space-y-2">
              <label htmlFor="import-package" className="w-full cursor-pointer">
                <div className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors text-sm text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  {language === 'pt' ? 'Importar Pacote da Filial' : 'Import Branch Package'}
                </div>
              </label>
              <input
                id="import-package"
                type="file"
                accept=".json"
                onChange={handleImportPackage}
                className="hidden"
              />
              {importedPackage && (
                <p className="text-xs text-center text-muted-foreground">
                  ✓ {importedPackage.branch.name} ({importedPackage.employees.length} {language === 'pt' ? 'funcionários' : 'employees'})
                </p>
              )}
            </div>

            {activeBranches.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">{t.noBranches}</p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.selectBranch}</label>
                  <div className="space-y-2">
                    {activeBranches.map(branch => (
                      <button
                        key={branch.id}
                        onClick={() => { setSelectedBranchId(branch.id); setPinInput(''); setPinError(''); }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedBranchId === branch.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="font-medium">{branch.name}</div>
                        <div className="text-xs text-muted-foreground">{branch.code} • {branch.city}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedBranchId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {t.enterPin}
                    </label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                      placeholder={t.pinPlaceholder}
                      className="text-center text-2xl tracking-widest"
                      onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                    />
                    {pinError && <p className="text-sm text-destructive text-center">{pinError}</p>}
                    <Button
                      onClick={handlePinSubmit}
                      disabled={pinInput.length < 4}
                      className="w-full"
                      size="lg"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {t.unlock}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Attendance marking step
  if (step === 'attendance') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setStep('pin')} className="flex items-center gap-1 text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-center">
              <h1 className="font-semibold">{selectedBranch?.name}</h1>
              <p className="text-xs text-muted-foreground">{selectedBranch?.code}</p>
            </div>
            <div className="w-6" />
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Date picker */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Quick actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => markAll('present')} className="flex-1">
              <Check className="h-4 w-4 mr-1 text-green-600" />
              {t.allPresent}
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAll('absent')} className="flex-1">
              <X className="h-4 w-4 mr-1 text-red-600" />
              {t.allAbsent}
            </Button>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between text-sm bg-muted/50 rounded-lg p-2">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {entries.length} {t.employees}
            </span>
            <div className="flex gap-3">
              <span className="text-green-600 font-medium">✓ {presentCount}</span>
              <span className="text-red-600 font-medium">✗ {absentCount}</span>
            </div>
          </div>

          {/* Employee list */}
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.noEmployees}</p>
          ) : (
            <div className="space-y-2">
              {entries.map(entry => (
                <button
                  key={entry.employeeId}
                  onClick={() => toggleStatus(entry.employeeId)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all active:scale-[0.98] ${
                    entry.status === 'present'
                      ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20'
                      : 'border-red-500/30 bg-red-50 dark:bg-red-950/20'
                  }`}
                >
                  <div className="text-left">
                    <div className="font-medium text-sm">{entry.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{entry.employeeNumber}</div>
                  </div>
                  <Badge variant={entry.status === 'present' ? 'default' : 'destructive'} className="min-w-[80px] justify-center">
                    {entry.status === 'present' ? (
                      <><Check className="h-3 w-3 mr-1" />{t.present}</>
                    ) : (
                      <><X className="h-3 w-3 mr-1" />{t.absent}</>
                    )}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Submit button */}
          {entries.length > 0 && (
            <Button onClick={() => setStep('summary')} className="w-full" size="lg">
              {t.confirm}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Summary / export step
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={() => setStep('attendance')} className="flex items-center gap-1 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">{t.summary}</h1>
          <div className="w-6" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{language === 'pt' ? 'Filial' : 'Branch'}</span>
              <span className="font-medium">{selectedBranch?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.date}</span>
              <span className="font-medium">{date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.totalPresent}</span>
              <Badge variant="default">{presentCount}</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.totalAbsent}</span>
              <Badge variant="destructive">{absentCount}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Absent employees list */}
        {absentCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{language === 'pt' ? 'Funcionários Ausentes' : 'Absent Employees'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {entries.filter(e => e.status === 'absent').map(e => (
                  <div key={e.employeeId} className="text-sm flex items-center gap-2">
                    <X className="h-3 w-3 text-destructive" />
                    {e.employeeName}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          <Button onClick={handleExportFile} variant="outline" className="w-full" size="lg">
            <Download className="h-4 w-4 mr-2" />
            {t.exportFile}
          </Button>
          <Button onClick={handleSendNetwork} className="w-full" size="lg">
            <Send className="h-4 w-4 mr-2" />
            {t.sendNetwork}
          </Button>
        </div>
      </div>
    </div>
  );
}
