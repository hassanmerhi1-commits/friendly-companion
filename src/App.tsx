import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider, useLanguage } from "@/lib/i18n";
import { useAuthStore, type Permission } from "@/stores/auth-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useBranchStore } from "@/stores/branch-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { useDeductionStore } from "@/stores/deduction-store";
import { useAbsenceStore } from "@/stores/absence-store";
import { useHolidayStore } from "@/stores/holiday-store";
import { useSettingsStore } from "@/stores/settings-store";
import { liveInit, liveGetStatus, initSyncListener } from "@/lib/db-live";
import { initEmployeeStoreSync } from "@/stores/employee-store";
import { initBranchStoreSync } from "@/stores/branch-store";
import { initPayrollStoreSync } from "@/stores/payroll-store";
import { initDeductionStoreSync } from "@/stores/deduction-store";
import { initAbsenceStoreSync } from "@/stores/absence-store";
import { initHolidayStoreSync } from "@/stores/holiday-store";
import { initSettingsStoreSync } from "@/stores/settings-store";
import { initAttendanceStoreSync } from "@/stores/attendance-store";
import { useAttendanceStore } from "@/stores/attendance-store";
import { initBulkAttendanceStoreSync, useBulkAttendanceStore } from "@/stores/bulk-attendance-store";
import { initHRStoreSync, useHRStore } from "@/stores/hr-store";
import { initOvertimePaymentSync, useOvertimePaymentStore } from "@/stores/overtime-payment-store";
import { initActivationStatus } from "@/lib/device-security";
import { isProvinceSelected } from "@/lib/province-storage";
import { DeviceActivation } from "@/components/DeviceActivation";
import { ProvinceSelector } from "@/components/ProvinceSelector";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { TourProvider } from "@/components/AppTour";
import { FirstRunSetup } from "@/components/FirstRunSetup";
import { LoginPage } from "./pages/Login";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import Payroll from "./pages/Payroll";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Branches from "./pages/Branches";
import Deductions from "./pages/Deductions";
import UsersPage from "./pages/Users";
import LaborLaw from "./pages/LaborLaw";
import Documents from "./pages/Documents";
import EmployeeCards from "./pages/EmployeeCards";
import HRDashboard from "./pages/HRDashboard";
import Attendance from "./pages/Attendance";
import NotFound from "./pages/NotFound";
import TaxSimulator from "./pages/TaxSimulator";
import PayrollHistory from "./pages/PayrollHistory";
import EmployeeProfile from "./pages/EmployeeProfile";
import BranchAttendance from "./pages/BranchAttendance";
const queryClient = new QueryClient();

// Check if we're in development/preview mode (not Electron)
const isDevelopmentPreview = () => {
  const isElectron = typeof window !== 'undefined' && 
    (window as any).electronAPI?.isElectron === true;
  const isDev = import.meta.env.DEV;
  return !isElectron && isDev;
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login } = useAuthStore();
  
  useEffect(() => {
    if (isDevelopmentPreview() && !isAuthenticated) {
      login('admin', 'admin');
    }
  }, [isAuthenticated, login]);
  
  if (isDevelopmentPreview()) {
    return <>{children}</>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Route that requires specific permission(s)
function PermissionRoute({ 
  children, 
  requiredPermission 
}: { 
  children: React.ReactNode;
  requiredPermission: Permission | Permission[];
}) {
  const { isAuthenticated, hasPermission, isLoaded, login } = useAuthStore();
  const { language } = useLanguage();
  
  // Auto-login in development preview
  useEffect(() => {
    if (isDevelopmentPreview() && !isAuthenticated) {
      login('admin', 'admin');
    }
  }, [isAuthenticated, login]);
  
  // In development preview, still enforce permissions (don't bypass)
  // This allows testing permission system in preview
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">
          {language === 'pt' ? 'A carregar...' : 'Loading...'}
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated && !isDevelopmentPreview()) {
    return <Navigate to="/login" replace />;
  }
  
  // Check permission(s)
  const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
  const hasAccess = permissions.some(p => hasPermission(p));
  
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {language === 'pt' ? 'Acesso Negado' : 'Access Denied'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {language === 'pt' 
              ? 'Não tem permissão para aceder a esta página. Contacte o administrador.'
              : 'You do not have permission to access this page. Contact the administrator.'}
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

const AppRoutes = () => {
  const { isAuthenticated } = useAuthStore();
  
  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />
      {/* Branch attendance - standalone, PIN-protected (no login required) */}
      <Route path="/branch-attendance" element={<BranchAttendance />} />
      {/* Dashboard - accessible to all authenticated users */}
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      
      {/* Permission-protected routes */}
      <Route path="/employees" element={
        <PermissionRoute requiredPermission="employees.view"><Employees /></PermissionRoute>
      } />
      <Route path="/employee-profile/:id" element={
        <PermissionRoute requiredPermission="employees.view"><EmployeeProfile /></PermissionRoute>
      } />
      <Route path="/employee-cards" element={
        <PermissionRoute requiredPermission="employees.view"><EmployeeCards /></PermissionRoute>
      } />
      <Route path="/payroll" element={
        <PermissionRoute requiredPermission="payroll.view"><Payroll /></PermissionRoute>
      } />
      <Route path="/payroll-history" element={
        <PermissionRoute requiredPermission="payroll.view"><PayrollHistory /></PermissionRoute>
      } />
      <Route path="/deductions" element={
        <PermissionRoute requiredPermission="deductions.view"><Deductions /></PermissionRoute>
      } />
      <Route path="/branches" element={
        <PermissionRoute requiredPermission="branches.view"><Branches /></PermissionRoute>
      } />
      <Route path="/attendance" element={
        <PermissionRoute requiredPermission="attendance.view"><Attendance /></PermissionRoute>
      } />
      <Route path="/hr-dashboard" element={
        <PermissionRoute requiredPermission="hr.view"><HRDashboard /></PermissionRoute>
      } />
      <Route path="/reports" element={
        <PermissionRoute requiredPermission="reports.view"><Reports /></PermissionRoute>
      } />
      <Route path="/documents" element={
        <PermissionRoute requiredPermission="documents.view"><Documents /></PermissionRoute>
      } />
      <Route path="/users" element={
        <PermissionRoute requiredPermission="users.view"><UsersPage /></PermissionRoute>
      } />
      <Route path="/settings" element={
        <PermissionRoute requiredPermission="settings.view"><Settings /></PermissionRoute>
      } />
      <Route path="/labor-law" element={
        <PermissionRoute requiredPermission="laborlaw.view"><LaborLaw /></PermissionRoute>
      } />
      <Route path="/tax-simulator" element={
        <PermissionRoute requiredPermission="payroll.view"><TaxSimulator /></PermissionRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// Detect if we're on the branch-attendance route
// BULLETPROOF: Check the full URL because QR scanners handle #/hash/query differently
function isBranchAttendanceRoute(): boolean {
  const href = window.location.href;
  const search = window.location.search;
  
  // Check if 'branch-attendance' appears anywhere in the URL (hash, path, etc.)
  if (href.includes('branch-attendance')) {
    return true;
  }
  
  // Check for the ba= marker (added to QR URLs as reliable fallback)
  if (search.includes('ba=1') || href.includes('ba=1')) {
    return true;
  }
  
  return false;
}

function AppContent() {
  const [deviceActivated, setDeviceActivated] = useState<boolean | null>(null);
  const [provinceSelected, setProvinceSelected] = useState<boolean | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [needsFirstRunSetup, setNeedsFirstRunSetup] = useState(false);
  const [isBranchRoute] = useState(() => {
    const detected = isBranchAttendanceRoute();
    
    if (detected) {
      // Extract the 'd' parameter from wherever it might be
      let dataParam: string | null = null;
      
      // Try search params first
      dataParam = new URLSearchParams(window.location.search).get('d');
      
      // Try hash params
      if (!dataParam) {
        const hash = window.location.hash;
        const hashQ = hash.indexOf('?');
        if (hashQ !== -1) {
          dataParam = new URLSearchParams(hash.substring(hashQ)).get('d');
        }
      }
      
      // Ensure HashRouter gets the right hash
      const newHash = dataParam 
        ? `#/branch-attendance?d=${dataParam}` 
        : '#/branch-attendance';
      
      // Only update if hash doesn't already have branch-attendance
      if (!window.location.hash.includes('branch-attendance')) {
        window.history.replaceState(null, '', window.location.pathname + newHash);
      }
    }
    
    return detected;
  });

  useEffect(() => {
      const initApp = async () => {
        // Bypass activation and province checks in development preview mode
        // but still load data from mock storage
        if (isDevelopmentPreview()) {
          console.log('[App] Running in browser mode');
          setDeviceActivated(true);
          setProvinceSelected(true);
          if (!isProvinceSelected()) {
            localStorage.setItem('payroll_selected_province', 'Luanda');
          }
          
          // Load stores from mock localStorage data
          const { loadUsers } = useAuthStore.getState();
          const { loadEmployees } = useEmployeeStore.getState();
          const { loadBranches } = useBranchStore.getState();
          const { loadPayroll } = usePayrollStore.getState();
          const { loadDeductions } = useDeductionStore.getState();
          const { loadAbsences } = useAbsenceStore.getState();
          const { loadHolidays } = useHolidayStore.getState();
          const { loadSettings } = useSettingsStore.getState();
          const { loadAttendance } = useAttendanceStore.getState();
          const { loadEntries: loadBulkAttendance } = useBulkAttendanceStore.getState();
          const { loadHRData } = useHRStore.getState();
          const { loadPayments: loadOvertimePayments } = useOvertimePaymentStore.getState();

          await Promise.all([
            loadUsers(),
            loadEmployees(),
            loadBranches(),
            loadPayroll(),
            loadDeductions(),
            loadAbsences(),
            loadHolidays(),
            loadSettings(),
            loadAttendance(),
            loadBulkAttendance(),
            loadHRData(),
            loadOvertimePayments(),
          ]);
          
          
          console.log('[App] Browser mode: stores loaded from mock data');
          return;
        }

        try {
          // Check activation status
          const activated = await initActivationStatus();
          const provinceOk = isProvinceSelected();
          setDeviceActivated(activated);
          setProvinceSelected(provinceOk);

          if (activated) {
            // Check if IP file is configured before initializing database
            const isElectron = typeof window !== 'undefined' && 
              (window as any).electronAPI?.isElectron === true;
            
            if (isElectron) {
              try {
                const ipContent = await (window as any).electronAPI.ipfile.read();
                if (!ipContent || !ipContent.trim()) {
                  // IP file is empty - show first run setup
                  setNeedsFirstRunSetup(true);
                  return;
                }
              } catch (e) {
                console.error('[App] Error reading IP file:', e);
              }
            }

            // Initialize database
            const dbOk = await liveInit();
            
            if (!dbOk) {
              // Check if it's a configuration issue
              const isElectronEnv = typeof window !== 'undefined' && 
                (window as any).electronAPI?.isElectron === true;
              if (isElectronEnv) {
                setNeedsFirstRunSetup(true);
              } else {
                setInitError('Base de dados não ligada. Configure em Definições > Base de Dados.');
              }
              return;
            }

            // Initialize real-time sync listener FIRST
            initSyncListener();
            
            // Initialize ALL store sync subscriptions
            initEmployeeStoreSync();
            initBranchStoreSync();
            initPayrollStoreSync();
            initDeductionStoreSync();
            initAbsenceStoreSync();
            initHolidayStoreSync();
            initSettingsStoreSync();
            initAttendanceStoreSync();
            initBulkAttendanceStoreSync();
            initHRStoreSync();
            initOvertimePaymentSync();

            // Get database status for logging
            const dbStatus = await liveGetStatus();
            console.log('[App] DB Status:', JSON.stringify(dbStatus, null, 2));
            
            if (dbStatus.isServer) {
              console.log('[App] SERVER MODE - WS clients:', dbStatus.wsClients);
            } else if (dbStatus.isClient) {
              console.log('[App] CLIENT MODE - Connected:', dbStatus.wsClientConnected);
            }

            // Load ALL stores from database
            const { loadUsers } = useAuthStore.getState();
            const { loadEmployees } = useEmployeeStore.getState();
            const { loadBranches } = useBranchStore.getState();
            const { loadPayroll } = usePayrollStore.getState();
            const { loadDeductions } = useDeductionStore.getState();
            const { loadAbsences } = useAbsenceStore.getState();
            const { loadHolidays } = useHolidayStore.getState();
            const { loadSettings } = useSettingsStore.getState();
            const { loadAttendance } = useAttendanceStore.getState();
            const { loadEntries: loadBulkAttendance } = useBulkAttendanceStore.getState();
            const { loadHRData } = useHRStore.getState();
            const { loadPayments: loadOvertimePayments } = useOvertimePaymentStore.getState();

            await Promise.all([
              loadUsers(),
              loadEmployees(),
              loadBranches(),
              loadPayroll(),
              loadDeductions(),
              loadAbsences(),
              loadHolidays(),
              loadSettings(),
              loadAttendance(),
              loadBulkAttendance(),
              loadHRData(),
              loadOvertimePayments(),
            ]);

            console.log('[App] All stores loaded from database');
          }
        } catch (error) {
          console.error('Error during initial checks:', error);
          setInitError(error instanceof Error ? error.message : 'Unknown error');
          setDeviceActivated(false);
          setProvinceSelected(false);
        }
      };

    initApp();
  }, []);

  // Show first run setup if IP file is not configured
  // Branch attendance route bypasses ALL guards (activation, province, first-run, errors)
  if (isBranchRoute) {
    return (
      <HashRouter>
        <AppErrorBoundary>
          <Routes>
            <Route path="/branch-attendance" element={<BranchAttendance />} />
            <Route path="*" element={<Navigate to="/branch-attendance" replace />} />
          </Routes>
        </AppErrorBoundary>
      </HashRouter>
    );
  }

  if (needsFirstRunSetup) {
    return (
      <FirstRunSetup 
        onComplete={() => {
          setNeedsFirstRunSetup(false);
          window.location.reload();
        }} 
      />
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full space-y-4">
          <h2 className="text-lg font-semibold text-destructive">Erro de Inicialização</h2>
          <p className="text-sm text-muted-foreground">{initError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90"
          >
            Reiniciar
          </button>
        </div>
      </div>
    );
  }

  if (deviceActivated === null || provinceSelected === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">A verificar...</div>
      </div>
    );
  }

  if (!deviceActivated && !isBranchRoute) {
    return (
      <DeviceActivation 
        onActivated={() => setDeviceActivated(true)} 
      />
    );
  }

  if (!provinceSelected && !isBranchRoute) {
    return (
      <ProvinceSelector 
        onProvinceSelected={() => {
          setProvinceSelected(true);
          window.location.reload();
        }} 
      />
    );
  }

  return (
    <HashRouter>
      <AppErrorBoundary>
        <TourProvider>
          <AppRoutes />
        </TourProvider>
      </AppErrorBoundary>
    </HashRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
