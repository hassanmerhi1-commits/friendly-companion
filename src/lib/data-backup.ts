// Data Backup Utility - Export and Import all app data as JSON file

export interface AppBackupData {
  version: string;
  exportedAt: string;
  employees: unknown[];
  branches: unknown[];
  payroll: {
    periods: unknown[];
    entries: unknown[];
  };
  deductions: unknown[];
  holidays: unknown[];
  settings: unknown;
}

const BACKUP_VERSION = "1.0";

// Get all data from localStorage
export function getAllAppData(): AppBackupData {
  const employees = JSON.parse(localStorage.getItem('payrollao-employees') || '{"state":{"employees":[]}}');
  const branches = JSON.parse(localStorage.getItem('payrollao-branches') || '{"state":{"branches":[]}}');
  const payroll = JSON.parse(localStorage.getItem('payrollao-payroll') || '{"state":{"periods":[],"entries":[]}}');
  const deductions = JSON.parse(localStorage.getItem('payrollao-deductions') || '{"state":{"deductions":[]}}');
  const holidays = JSON.parse(localStorage.getItem('payrollao-holidays') || '{"state":{"records":[]}}');
  const settings = JSON.parse(localStorage.getItem('payrollao-settings') || '{"state":{"settings":{}}}');

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    employees: employees.state?.employees || [],
    branches: branches.state?.branches || [],
    payroll: {
      periods: payroll.state?.periods || [],
      entries: payroll.state?.entries || [],
    },
    deductions: deductions.state?.deductions || [],
    holidays: holidays.state?.records || [],
    settings: settings.state?.settings || {},
  };
}

// Export data to JSON file
export function exportDataToFile(): void {
  const data = getAllAppData();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const date = new Date().toISOString().split('T')[0];
  const filename = `payroll-backup-${date}.json`;
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Validate backup file structure
export function validateBackupData(data: unknown): data is AppBackupData {
  if (!data || typeof data !== 'object') return false;
  
  const backup = data as AppBackupData;
  
  // Check required fields exist
  if (!backup.version || !backup.exportedAt) return false;
  if (!Array.isArray(backup.employees)) return false;
  if (!Array.isArray(backup.branches)) return false;
  if (!backup.payroll || !Array.isArray(backup.payroll.periods) || !Array.isArray(backup.payroll.entries)) return false;
  if (!Array.isArray(backup.deductions)) return false;
  
  return true;
}

// Import data from backup
export function importDataFromBackup(data: AppBackupData): void {
  // Restore employees
  localStorage.setItem('payrollao-employees', JSON.stringify({
    state: { employees: data.employees },
    version: 0
  }));
  
  // Restore branches
  localStorage.setItem('payrollao-branches', JSON.stringify({
    state: { branches: data.branches },
    version: 0
  }));
  
  // Restore payroll
  const periods = data.payroll.periods as Array<{ id: string }>;
  localStorage.setItem('payrollao-payroll', JSON.stringify({
    state: { 
      periods: data.payroll.periods,
      entries: data.payroll.entries,
      currentPeriodId: periods.length > 0 ? periods[periods.length - 1].id : null
    },
    version: 0
  }));
  
  // Restore deductions
  localStorage.setItem('payrollao-deductions', JSON.stringify({
    state: { deductions: data.deductions },
    version: 0
  }));
  
  // Restore holidays
  if (data.holidays) {
    localStorage.setItem('payrollao-holidays', JSON.stringify({
      state: { records: data.holidays },
      version: 0
    }));
  }
  
  // Restore settings
  if (data.settings && Object.keys(data.settings).length > 0) {
    localStorage.setItem('payrollao-settings', JSON.stringify({
      state: { settings: data.settings },
      version: 0
    }));
  }
}

// Read file as JSON
export function readFileAsJson(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (err) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// Get backup statistics
export function getBackupStats(): { 
  employees: number; 
  branches: number; 
  payrollPeriods: number;
  payrollEntries: number;
  deductions: number;
} {
  const data = getAllAppData();
  return {
    employees: data.employees.length,
    branches: data.branches.length,
    payrollPeriods: data.payroll.periods.length,
    payrollEntries: data.payroll.entries.length,
    deductions: data.deductions.length,
  };
}
