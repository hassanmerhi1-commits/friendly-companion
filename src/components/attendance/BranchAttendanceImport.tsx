import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAttendanceStore } from '@/stores/attendance-store';
import { useBranchStore } from '@/stores/branch-store';
import { useLanguage } from '@/lib/i18n';
import { Upload, Check, X, FileJson, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { BranchAttendanceData } from '@/pages/BranchAttendance';
import type { AttendanceRecord } from '@/types/attendance';

interface BranchAttendanceImportProps {
  onImported?: () => void;
}

export function BranchAttendanceImport({ onImported }: BranchAttendanceImportProps) {
  const { language } = useLanguage();
  const { clockIn, updateAttendance, records, loadAttendance } = useAttendanceStore();
  const { getBranch } = useBranchStore();
  const [open, setOpen] = useState(false);
  const [importData, setImportData] = useState<BranchAttendanceData | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const t = {
    importBtn: language === 'pt' ? 'Importar Presenças Filial' : 'Import Branch Attendance',
    title: language === 'pt' ? 'Importar Presenças da Filial' : 'Import Branch Attendance',
    selectFile: language === 'pt' ? 'Selecionar Ficheiro' : 'Select File',
    branch: language === 'pt' ? 'Filial' : 'Branch',
    date: language === 'pt' ? 'Data' : 'Date',
    present: language === 'pt' ? 'Presentes' : 'Present',
    absent: language === 'pt' ? 'Ausentes' : 'Absent',
    import: language === 'pt' ? 'Importar' : 'Import',
    cancel: language === 'pt' ? 'Cancelar' : 'Cancel',
    success: language === 'pt' ? 'Presenças importadas com sucesso!' : 'Attendance imported successfully!',
    error: language === 'pt' ? 'Erro ao importar ficheiro' : 'Error importing file',
    invalidFile: language === 'pt' ? 'Ficheiro inválido' : 'Invalid file',
    submittedAt: language === 'pt' ? 'Enviado em' : 'Submitted at',
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string) as BranchAttendanceData;
        if (!data.branchId || !data.date || !data.entries) {
          toast.error(t.invalidFile);
          return;
        }
        setImportData(data);
        setOpen(true);
      } catch {
        toast.error(t.invalidFile);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!importData) return;
    setImporting(true);

    try {
      for (const entry of importData.entries) {
        // Check if attendance record already exists for this employee on this date
        const existing = records.find(
          r => r.employeeId === entry.employeeId && r.date === importData.date
        );

        if (entry.status === 'present') {
          if (!existing) {
            // Create a clocked-in record
            await clockIn(entry.employeeId);
          }
        } else {
          // Mark as absent
          if (existing) {
            await updateAttendance(existing.id, { status: 'absent', notes: `Marked absent by branch: ${importData.branchName}` });
          } else {
            // We need to create an absent record directly via the store
            const { liveInsert } = await import('@/lib/db-live');
            const now = new Date().toISOString();
            const absentRecord: Record<string, any> = {
              id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              employee_id: entry.employeeId,
              date: importData.date,
              clock_in: null,
              clock_out: null,
              status: 'absent',
              scheduled_start: '08:00',
              scheduled_end: '17:00',
              break_duration_minutes: 60,
              late_minutes: 0,
              early_leave_minutes: 0,
              worked_minutes: 0,
              overtime_minutes: 0,
              notes: `Marked absent by branch: ${importData.branchName}`,
              created_at: now,
              updated_at: now,
            };
            await liveInsert('attendance', absentRecord);
          }
        }
      }

      await loadAttendance();
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

  const branch = importData ? getBranch(importData.branchId) : null;
  const presentCount = importData?.entries.filter(e => e.status === 'present').length || 0;
  const absentCount = importData?.entries.filter(e => e.status === 'absent').length || 0;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
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
                  <span className="font-medium">{importData.branchName} ({importData.branchCode})</span>
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

              {/* Absent list */}
              {absentCount > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{language === 'pt' ? 'Ausentes:' : 'Absent:'}</p>
                  {importData.entries.filter(e => e.status === 'absent').map(e => (
                    <div key={e.employeeId} className="text-sm flex items-center gap-1">
                      <X className="h-3 w-3 text-destructive" />
                      {e.employeeName}
                    </div>
                  ))}
                </div>
              )}

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
