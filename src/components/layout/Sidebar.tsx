import { useState } from "react";
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  FileText, 
  Settings,
  LogOut,
  Wallet,
  MapPin,
  UserCog,
  Scale,
  FileWarning,
  CreditCard,
  UserCheck,
  Clock,
  Calculator,
  Archive,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { useCompanyLogo } from "@/hooks/use-company-logo";
import payrollaoLogo from "@/assets/payrollao-logo-preview.png";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { currentUser, logout } = useAuthStore();
  const companyLogo = useCompanyLogo();

  const navigation = [
    { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
    { name: t.nav.employees, href: "/employees", icon: Users },
    { name: t.nav.idCards, href: "/employee-cards", icon: CreditCard },
    { name: t.nav.payroll, href: "/payroll", icon: DollarSign },
    { name: t.nav.payrollHistory, href: "/payroll-history", icon: Archive },
    { name: t.nav.hrDashboard, href: "/hr-dashboard", icon: UserCheck },
    { name: t.nav.attendance, href: "/attendance", icon: Clock },
    { name: t.nav.deductions, href: "/deductions", icon: Wallet },
    { name: t.nav.branches, href: "/branches", icon: MapPin },
    { name: t.nav.laborLaw, href: "/labor-law", icon: Scale },
    { name: t.nav.taxSimulator, href: "/tax-simulator", icon: Calculator },
    { name: t.nav.documents, href: "/documents", icon: FileWarning },
    { name: t.nav.reports, href: "/reports", icon: FileText },
    { name: t.nav.settings, href: "/settings", icon: Settings },
  ];
  // Add users management for admins
  if (currentUser?.role === 'admin') {
    navigation.push({ 
      name: t.nav.users, 
      href: "/users", 
      icon: UserCog 
    });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 px-4 border-b border-sidebar-border">
          {companyLogo ? (
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              className="h-12 w-auto object-contain"
            />
          ) : (
            <div className="flex items-center gap-2">
              <img src={payrollaoLogo} alt="PayrollAO" className="h-10 w-auto object-contain" />
            </div>
          )}
        </div>

        {/* User Info */}
        {currentUser && (
          <div className="px-4 py-3 border-b border-sidebar-border bg-sidebar-accent/30">
            <p className="font-medium text-sm text-sidebar-foreground truncate">
              {currentUser.name}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {currentUser.role === 'admin' 
                ? (language === 'pt' ? 'Administrador' : 'Admin')
                : (language === 'pt' ? 'Utilizador' : 'User')
              }
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "sidebar-link",
                  isActive && "sidebar-link-active"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <SidebarUpdateButton language={language} />
          <button 
            onClick={handleLogout}
            className="sidebar-link w-full text-sidebar-foreground/60 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span>{t.nav.logout}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarUpdateButton({ language }: { language: string }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const isElectronEnv = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;

  const handleCheck = async () => {
    if (!isElectronEnv) {
      setResult(language === 'pt' ? 'Apenas no desktop' : 'Desktop only');
      setTimeout(() => setResult(null), 3000);
      return;
    }
    setChecking(true);
    setResult(null);
    try {
      const api = (window as any).electronAPI;
      const response = await api.updater.check();
      if (response.success && response.updateInfo) {
        setResult(`v${response.updateInfo.version}`);
      } else if (response.success) {
        setResult(language === 'pt' ? 'Actualizado ✓' : 'Up to date ✓');
      } else {
        setResult(language === 'pt' ? 'Erro' : 'Error');
      }
    } catch {
      setResult(language === 'pt' ? 'Erro' : 'Error');
    } finally {
      setChecking(false);
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <div>
      <button
        onClick={handleCheck}
        disabled={checking}
        className="sidebar-link w-full text-sidebar-foreground/60 hover:text-primary"
      >
        {checking ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <RefreshCw className="h-5 w-5" />
        )}
        <span>{checking ? (language === 'pt' ? 'A verificar...' : 'Checking...') : (language === 'pt' ? 'Actualizações' : 'Updates')}</span>
      </button>
      {result && (
        <p className="text-xs text-muted-foreground px-3 py-1">{result}</p>
      )}
    </div>
  );
}
