import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { isDeviceActivated } from "@/lib/device-security";
import { isProvinceSelected } from "@/lib/province-storage";
import { DeviceActivation } from "@/components/DeviceActivation";
import { ProvinceSelector } from "@/components/ProvinceSelector";
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
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

  useEffect(() => {
    // Check device activation on mount
    setDeviceActivated(isDeviceActivated());
    setProvinceSelected(isProvinceSelected());
  }, []);

  // Show loading while checking
  if (deviceActivated === null || provinceSelected === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">A verificar...</div>
      </div>
    );
  }

  // Show activation screen if device is not activated
  if (!deviceActivated) {
    return (
      <DeviceActivation 
        onActivated={() => setDeviceActivated(true)} 
      />
    );
  }

  // Show province selector if no province is selected
  if (!provinceSelected) {
    return (
      <ProvinceSelector 
        onProvinceSelected={() => {
          setProvinceSelected(true);
          // Reload the page to reinitialize storage with the new province
          window.location.reload();
        }} 
      />
    );
  }

  return (
    <HashRouter>
      <AppRoutes />
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
