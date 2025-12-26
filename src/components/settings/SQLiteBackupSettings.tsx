import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HardDrive, Download, Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/i18n";
import { isElectron } from "@/lib/electron-storage";

interface BackupStats {
  employees: number;
  branches: number;
  deductions: number;
  payroll_records: number;
  holidays: number;
  users: number;
  settings: number;
}

export function SQLiteBackupSettings() {
  const { t, language } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const isElectronApp = isElectron();

  const handleExportDatabase = async () => {
    if (!isElectronApp || !window.electronAPI?.db) {
      toast.error(language === 'pt' 
        ? "Esta funcionalidade só está disponível na aplicação desktop" 
        : "This feature is only available in the desktop app"
      );
      return;
    }

    setIsExporting(true);
    try {
      const data = await window.electronAPI.db.export();
      
      // Create a downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `payrollao-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setLastBackup(new Date().toLocaleString());
      toast.success(language === 'pt' 
        ? "Base de dados exportada com sucesso!" 
        : "Database exported successfully!"
      );
    } catch (error) {
      console.error('Export error:', error);
      toast.error(language === 'pt' 
        ? "Erro ao exportar base de dados" 
        : "Error exporting database"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isElectronApp || !window.electronAPI?.db) {
      toast.error(language === 'pt' 
        ? "Esta funcionalidade só está disponível na aplicação desktop" 
        : "This feature is only available in the desktop app"
      );
      return;
    }

    if (!file.name.endsWith('.json')) {
      toast.error(language === 'pt' 
        ? "Por favor selecione um ficheiro .json válido" 
        : "Please select a valid .json file"
      );
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate the backup structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid backup structure');
      }

      // Check if it has expected tables
      const expectedTables = ['employees', 'branches', 'deductions', 'users'];
      const hasValidStructure = expectedTables.some(table => Array.isArray(data[table]));
      
      if (!hasValidStructure) {
        throw new Error('Invalid backup file - missing expected data tables');
      }

      // Confirm with user
      const stats = getBackupStats(data);
      const confirmMessage = language === 'pt'
        ? `Importar backup com:\n• ${stats.employees} funcionários\n• ${stats.branches} filiais\n• ${stats.payroll_records} registos de folha\n• ${stats.users} utilizadores\n\nIsto irá substituir todos os dados actuais. Continuar?`
        : `Import backup with:\n• ${stats.employees} employees\n• ${stats.branches} branches\n• ${stats.payroll_records} payroll records\n• ${stats.users} users\n\nThis will replace all current data. Continue?`;

      if (!confirm(confirmMessage)) {
        setIsImporting(false);
        return;
      }

      await window.electronAPI.db.import(data);

      toast.success(language === 'pt' 
        ? "Base de dados importada com sucesso! A recarregar..." 
        : "Database imported successfully! Reloading..."
      );

      // Reload after a short delay to allow toast to show
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(language === 'pt' 
        ? "Erro ao importar backup. Verifique se o ficheiro é válido." 
        : "Error importing backup. Please check if the file is valid."
      );
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const getBackupStats = (data: any): BackupStats => {
    return {
      employees: Array.isArray(data.employees) ? data.employees.length : 0,
      branches: Array.isArray(data.branches) ? data.branches.length : 0,
      deductions: Array.isArray(data.deductions) ? data.deductions.length : 0,
      payroll_records: Array.isArray(data.payroll_records) ? data.payroll_records.length : 0,
      holidays: Array.isArray(data.holidays) ? data.holidays.length : 0,
      users: Array.isArray(data.users) ? data.users.length : 0,
      settings: data.settings ? 1 : 0,
    };
  };

  if (!isElectronApp) {
    return (
      <div className="stat-card animate-slide-up border-2 border-muted">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-foreground">
              {language === 'pt' ? "Backup SQLite" : "SQLite Backup"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === 'pt' 
                ? "Exportar/importar base de dados local" 
                : "Export/import local database"
              }
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-muted/50 rounded-lg flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {language === 'pt' 
              ? "Esta funcionalidade está disponível apenas na aplicação desktop (Electron)." 
              : "This feature is only available in the desktop application (Electron)."
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card animate-slide-up border-2 border-primary/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HardDrive className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-foreground">
            {language === 'pt' ? "Backup da Base de Dados SQLite" : "SQLite Database Backup"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {language === 'pt' 
              ? "Exportar e restaurar a base de dados local completa" 
              : "Export and restore the complete local database"
            }
          </p>
        </div>
      </div>

      {/* Status indicator */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium text-foreground">
            {language === 'pt' ? "Base de dados SQLite activa" : "SQLite database active"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {language === 'pt' 
            ? "Os dados são guardados automaticamente em payroll.db" 
            : "Data is automatically saved to payroll.db"
          }
        </p>
        {lastBackup && (
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'pt' ? "Último backup: " : "Last backup: "}{lastBackup}
          </p>
        )}
      </div>

      {/* Export/Import Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          variant="default" 
          className="flex-1"
          onClick={handleExportDatabase}
          disabled={isExporting || isImporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {language === 'pt' ? "Exportar Base de Dados" : "Export Database"}
        </Button>
        
        <label className="flex-1">
          <Button 
            variant="outline" 
            className="w-full"
            disabled={isExporting || isImporting}
            asChild
          >
            <span>
              {isImporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {language === 'pt' ? "Restaurar Backup" : "Restore Backup"}
            </span>
          </Button>
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportDatabase}
            disabled={isExporting || isImporting}
          />
        </label>
      </div>

      {/* Warning message */}
      <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-xs text-destructive">
          {language === 'pt' 
            ? "⚠️ Atenção: Restaurar um backup irá substituir TODOS os dados actuais. Faça primeiro uma exportação de segurança." 
            : "⚠️ Warning: Restoring a backup will replace ALL current data. Export a backup first for safety."
          }
        </p>
      </div>
    </div>
  );
}
