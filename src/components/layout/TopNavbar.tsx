import { useState } from "react";
import { TourButton } from "@/components/AppTour";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  UsersRound,
  IdCard,
  Receipt,
  History,
  Briefcase,
  CalendarCheck,
  HandCoins,
  Building2,
  Scale,
  Percent,
  FileSignature,
  BarChart3,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronDown,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useAuthStore, type Permission } from "@/stores/auth-store";
import { useCompanyLogo } from "@/hooks/use-company-logo";
import payrollaoLogo from "@/assets/payrollao-logo-preview.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DbStatusIndicator } from "@/components/layout/DbStatusIndicator";
import { UpdateNotification } from "@/components/UpdateNotification";

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { currentUser, logout, hasPermission } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const companyLogo = useCompanyLogo();

  // Navigation items with required permissions
  const allNavigation: Array<{
    name: string;
    href: string;
    icon: LucideIcon;
    permission?: Permission;
  }> = [
    { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
    { name: t.nav.employees, href: "/employees", icon: UsersRound, permission: 'employees.view' },
    { name: t.nav.idCards, href: "/employee-cards", icon: IdCard, permission: 'employees.view' },
    { name: t.nav.payroll, href: "/payroll", icon: Receipt, permission: 'payroll.view' },
    { name: t.nav.payrollHistory, href: "/payroll-history", icon: History, permission: 'payroll.view' },
    { name: t.nav.hrDashboard, href: "/hr-dashboard", icon: Briefcase, permission: 'hr.view' },
    { name: t.nav.attendance, href: "/attendance", icon: CalendarCheck, permission: 'attendance.view' },
    { name: t.nav.deductions, href: "/deductions", icon: HandCoins, permission: 'deductions.view' },
    { name: t.nav.branches, href: "/branches", icon: Building2, permission: 'branches.view' },
    { name: t.nav.laborLaw, href: "/labor-law", icon: Scale, permission: 'laborlaw.view' },
    { name: t.nav.taxSimulator, href: "/tax-simulator", icon: Percent, permission: 'payroll.view' },
    { name: t.nav.documents, href: "/documents", icon: FileSignature, permission: 'documents.view' },
    { name: t.nav.reports, href: "/reports", icon: BarChart3, permission: 'reports.view' },
    { name: t.nav.settings, href: "/settings", icon: Settings, permission: 'settings.view' },
    { name: t.nav.users, href: "/users", icon: Shield, permission: 'users.view' },
  ];

  const renderNavIcon = (Icon: LucideIcon, active: boolean) => (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
        active
          ? "bg-primary-foreground/20 shadow-sm ring-1 ring-primary-foreground/25"
          : "bg-primary/10 text-primary group-hover:bg-primary/15 group-hover:scale-105"
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
    </span>
  );

  // Filter navigation based on user permissions
  const navigation = allNavigation.filter(item => {
    // Dashboard is always visible
    if (!item.permission) return true;
    // Check permission
    return hasPermission(item.permission);
  });

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isElectronEnv = typeof window !== 'undefined' && (window as any).electronAPI?.isElectron === true;

  const handleCheckForUpdates = async () => {
    if (!isElectronEnv) {
      setUpdateResult(language === 'pt' ? 'Apenas disponível na aplicação desktop' : 'Only available in desktop app');
      setTimeout(() => setUpdateResult(null), 3000);
      return;
    }
    setCheckingUpdate(true);
    setUpdateResult(null);
    try {
      const api = (window as any).electronAPI;
      const response = await api.updater.check();
      if (response.success && response.updateInfo) {
        setUpdateResult(language === 'pt' ? `Nova versão: ${response.updateInfo.version}` : `New version: ${response.updateInfo.version}`);
      } else if (response.success) {
        setUpdateResult(language === 'pt' ? 'Já tem a versão mais recente' : 'Already up to date');
      } else {
        setUpdateResult(response.error || (language === 'pt' ? 'Erro ao verificar' : 'Check failed'));
      }
    } catch {
      setUpdateResult(language === 'pt' ? 'Erro ao verificar' : 'Check failed');
    } finally {
      setCheckingUpdate(false);
      setTimeout(() => setUpdateResult(null), 5000);
    }
  };

  const isActive = (href: string) => location.pathname === href;
  const navColumnCount = Math.max(1, Math.ceil(navigation.length / 2));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex min-h-[4.25rem] items-center justify-between gap-3 px-4 py-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link to="/" className="flex shrink-0 items-center">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt="Company Logo"
                className="h-14 max-h-14 w-auto max-w-[200px] object-contain"
              />
            ) : (
              <img
                src={payrollaoLogo}
                alt="PayrollAO"
                className="h-12 w-auto object-contain"
              />
            )}
          </Link>

          <div className="hidden sm:block w-px h-9 bg-border/60 shrink-0" aria-hidden />

          <DbStatusIndicator variant="compact" className="hidden sm:flex min-w-0" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <UpdateNotification />
          <LanguageSwitcher />
          <TourButton />
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UsersRound className="h-4 w-4 text-primary" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {currentUser.role === 'admin' 
                        ? (language === 'pt' ? 'Admin' : 'Admin')
                        : (language === 'pt' ? 'Utilizador' : 'User')
                      }
                    </p>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    <span>{t.nav.settings}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleCheckForUpdates}
                  disabled={checkingUpdate}
                  className="cursor-pointer"
                >
                  {checkingUpdate ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>{language === 'pt' ? 'A verificar...' : 'Checking...'}</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      <span>{language === 'pt' ? 'Verificar Actualizações' : 'Check for Updates'}</span>
                    </>
                  )}
                </DropdownMenuItem>
                {updateResult && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {updateResult}
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>{t.nav.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile menu toggle */}
          <Button 
            variant="ghost" 
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile: server/client status above nav tabs */}
      <div className="sm:hidden px-4 pb-2 border-b border-border/30">
        <DbStatusIndicator variant="compact" />
      </div>

      {/* Desktop navigation — two equal rows, uniform column widths */}
      <nav
        className="hidden lg:grid gap-1 px-4 pb-2.5"
        style={{
          gridTemplateRows: 'repeat(2, minmax(2.75rem, auto))',
          gridAutoFlow: 'column',
          gridTemplateColumns: `repeat(${navColumnCount}, minmax(0, 1fr))`,
        }}
      >
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group flex h-full min-h-[2.75rem] flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-medium leading-tight transition-all duration-200',
                active
                  ? 'bg-primary text-primary-foreground shadow-md ring-1 ring-primary/20'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
              title={item.name}
            >
              {renderNavIcon(item.icon, active)}
              <span className="w-full truncate text-center">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/40 bg-background p-4">
          <nav className="grid gap-2">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <span className="scale-110">{renderNavIcon(item.icon, active)}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
