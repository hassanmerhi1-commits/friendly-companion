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
  Archive
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import companyLogo from "@/assets/distri-good-logo.jpeg";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { currentUser, logout } = useAuthStore();

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
          <img 
            src={companyLogo} 
            alt="Company Logo" 
            className="h-12 w-auto object-contain"
          />
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
        <div className="border-t border-sidebar-border p-3">
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
