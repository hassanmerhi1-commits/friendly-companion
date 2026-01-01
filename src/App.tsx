import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { useEmployeeStore } from "@/stores/employee-store";
import { useBranchStore } from "@/stores/branch-store";
import { dbInit } from "@/lib/db-sync";
import { initActivationStatus } from "@/lib/device-security";
import { isProvinceSelected } from "@/lib/province-storage";
import { DeviceActivation } from "@/components/DeviceActivation";
import { ProvinceSelector } from "@/components/ProvinceSelector";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
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
import NotFound from "./pages/NotFound";

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

const AppRoutes = () => {
  const { isAuthenticated } = useAuthStore();
  
  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute><Payroll /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/branches" element={<ProtectedRoute><Branches /></ProtectedRoute>} />
      <Route path="/deductions" element={<ProtectedRoute><Deductions /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
      <Route path="/labor-law" element={<ProtectedRoute><LaborLaw /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/employee-cards" element={<ProtectedRoute><EmployeeCards /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

function AppContent() {
  const [deviceActivated, setDeviceActivated] = useState<boolean | null>(null);
  const [provinceSelected, setProvinceSelected] = useState<boolean | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
      const initApp = async () => {
        // Bypass checks in development preview mode
        if (isDevelopmentPreview()) {
          setDeviceActivated(true);
          setProvinceSelected(true);
          if (!isProvinceSelected()) {
            localStorage.setItem('payroll_selected_province', 'Luanda');
          }

          // Load local data for preview mode
          const { loadUsers } = useAuthStore.getState();
          const { loadEmployees } = useEmployeeStore.getState();
          const { loadBranches } = useBranchStore.getState();
          await Promise.all([loadUsers(), loadEmployees(), loadBranches()]);
          return;
        }

        try {
          // Check activation status (async)
          const activated = await initActivationStatus();
          const provinceOk = isProvinceSelected();
          setDeviceActivated(activated);
          setProvinceSelected(provinceOk);

          // Load data from database if activated
          if (activated) {
            // Force DB init from renderer too (fixes win-unpacked showing 'Connected: No')
            await dbInit();

            const { loadUsers } = useAuthStore.getState();
            const { loadEmployees } = useEmployeeStore.getState();
            const { loadBranches } = useBranchStore.getState();
            await Promise.all([loadUsers(), loadEmployees(), loadBranches()]);
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

  if (!deviceActivated) {
    return (
      <DeviceActivation 
        onActivated={() => setDeviceActivated(true)} 
      />
    );
  }

  if (!provinceSelected) {
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
        <AppRoutes />
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
