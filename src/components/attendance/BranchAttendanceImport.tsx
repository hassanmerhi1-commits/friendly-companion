import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useDailyAttendanceStore } from '@/stores/daily-attendance-store';
import { useBulkAttendanceStore } from '@/stores/bulk-attendance-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { usePayrollStore } from '@/stores/payroll-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/lib/i18n';
import { buildBulkEntriesFromDailyMarks } from '@/lib/daily-attendance-aggregate';
import { Upload, Check, X, FileJson, Building2, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { parseISO } from 'date-fns';
import type { BranchAttendanceData } from '@/pages/BranchAttendance';

const INBOX_KEY = 'branch_attendance_inbox';

interface BranchAttendanceImportProps {
  onImported?: () => void;
  compact?: boolean;
}

export function BranchAttendanceImport({ onImported, compact }: BranchAttendanceImportProps) {
  const { language } = useLanguage();
  const { markAttendance, loadRecords } = useDailyAttendanceStore();
  const { saveBulkEntries } = useBulkAttendanceStore();
  const { employees } = useEmployeeStore();
  const { periods } = usePayrollStore();
  const { currentUser } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [importData, setImportData] = useState<BranchAttendanceData | null>(null);
  const [importing, setImporting] = useState(false);
  const [inboxCount, setInboxCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const pt = language === 'pt';

  const refreshInboxCount = () => {
    try {
      const existing = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]') as BranchAttendanceData[];
      setInboxCount(existing.length);
    } catch {
      setInboxCount(0);
    }
  };

  useEffect(() => {
    refreshInboxCount();
  }, []);

  const t = {
    importBtn: pt ? 'Importar Filial' : 'Import Branch',
    inboxBtn: pt ? 'Caixa de Entrada' : 'Inbox',
    title: pt ? 'Importar Presenças da Filial' : 'Import Branch Attendance',
    branch: pt ? 'Filial' : 'Branch',
    date: pt ? 'Data' : 'Date',
    present: pt ? 'Presentes' : 'Present',
    absent: pt ? 'Ausentes' : 'Absent',
    import: pt ? 'Importar' : 'Import',
    cancel: pt ? 'Cancelar' : 'Cancel',
    success: pt ? 'Presenças importadas e agregadas à folha!' : 'Attendance imported and aggregated to payroll!',
    error: pt ? 'Erro ao importar ficheiro' : 'Error importing file',
    invalidFile: pt ? 'Ficheiro inválido' : 'Invalid file',
    submittedAt: pt ? 'Enviado em' : 'Submitted at',
    pending: pt ? 'pendentes' : 'pending',
  };

  const openImportPreview = (data: BranchAttendanceData) => {
    if (!data.branchId || !data.date || !data.entries) {
      toast.error(t.invalidFile);
      return;
    }
    setImportData(data);
    setOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string) as BranchAttendanceData;
        openImportPreview(data);
      } catch {
        toast.error(t.invalidFile);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenInbox = () => {
    try {
      const existing = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]') as BranchAttendanceData[];
      if (existing.length === 0) {
        toast.info(pt ? 'Nenhuma presença pendente' : 'No pending attendance');
        return;
      }
      openImportPreview(existing[0]);
    } catch {
      toast.error(t.invalidFile);
    }
  };

  const runImport = async (data: BranchAttendanceData, removeFromInbox = false) => {
    setImporting(true);

    try {
      const markedBy = currentUser?.id || 'branch-import';
      const employeeIds = [...new Set(data.entries.map((e) => e.employeeId))];

      for (const entry of data.entries) {
        await markAttendance({
          employeeId: entry.employeeId,
          date: data.date,
          status: entry.status === 'absent' ? 'absent' : 'present',
          delayHours: 0,
          notes: `Branch import: ${data.branchName}`,
          markedBy,
          branchId: data.branchId,
        });
      }

      await loadRecords();

      const referenceDate = parseISO(data.date);
      const bulkEntries = buildBulkEntriesFromDailyMarks(
        employeeIds,
        referenceDate,
        employees,
        periods,
        'Auto-aggregated from branch import'
      );

      if (bulkEntries.length > 0) {
        await saveBulkEntries(bulkEntries);
      }

      if (removeFromInbox) {
        const existing = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]') as BranchAttendanceData[];
        const next = existing.filter(
          (item) =>
            !(item.branchId === data.branchId && item.date === data.date && item.submittedAt === data.submittedAt)
        );
        localStorage.setItem(INBOX_KEY, JSON.stringify(next));
        refreshInboxCount();
      }

      toast.success(t.success);
      setOpen(false);
      setImportData(null);
      onImported?.();
    } catch (error) {
      console.error('Import error:', error);
      toast.error(t.error);
    } finally {
      setImporting(false);
    }
  };

  const handleImport = async () => {
    if (!importData) return;

    let fromInbox = false;
    try {
      const existing = JSON.parse(localStorage.getItem(INBOX_KEY) || '[]') as BranchAttendanceData[];
      fromInbox = existing.some(
        (item) =>
          item.branchId === importData.branchId &&
          item.date === importData.date &&
          item.submittedAt === importData.submittedAt
      );
    } catch {
      fromInbox = false;
    }

    await runImport(importData, fromInbox);
  };

  const presentCount = importData?.entries.filter((e) => e.status === 'present').length || 0;
  const absentCount = importData?.entries.filter((e) => e.status === 'absent').length || 0;

  const btnSize = compact ? 'sm' : 'default';
  const btnClass = compact ? 'h-8 text-xs shrink-0' : '';

  return (
    <>
      <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />

      {inboxCount > 0 && (
        <Button variant="outline" size={btnSize} className={btnClass} onClick={handleOpenInbox}>
          <Inbox className="h-3.5 w-3.5 mr-1.5" />
          {t.inboxBtn}
          <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
            {inboxCount}
          </Badge>
        </Button>
      )}

      <Button variant="outline" size={btnSize} className={btnClass} onClick={() => fileRef.current?.click()}>
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        {t.importBtn}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              {t.title}
            </DialogTitle>
          </DialogHeader>

          {importData && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {t.branch}
                  </span>
                  <span className="font-medium">
                    {importData.branchName} ({importData.branchCode})
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.date}</span>
                  <span className="font-medium">{importData.date}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.present}</span>
                  <Badge variant="default">{presentCount}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.absent}</span>
                  <Badge variant="destructive">{absentCount}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t.submittedAt}</span>
                  <span className="text-xs">{new Date(importData.submittedAt).toLocaleString()}</span>
                </div>
              </div>

              {absentCount > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{pt ? 'Ausentes:' : 'Absent:'}</p>
                  {importData.entries
                    .filter((e) => e.status === 'absent')
                    .map((e) => (
                      <div key={e.employeeId} className="text-sm flex items-center gap-1">
                        <X className="h-3 w-3 text-destructive" />
                        {e.employeeName}
                      </div>
                    ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {pt
                  ? 'Os dados serão gravados na marcação diária e agregados automaticamente à folha.'
                  : 'Data will be saved to daily marking and auto-aggregated to payroll.'}
              </p>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
                  {t.cancel}
                </Button>
                <Button onClick={handleImport} disabled={importing} className="flex-1">
                  <Check className="h-4 w-4 mr-1" />
                  {importing ? '...' : t.import}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
