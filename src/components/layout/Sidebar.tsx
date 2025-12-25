import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  FileText, 
  Settings,
  LogOut,
  Building2,
  Wallet,
  MapPin
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

export function Sidebar() {
  const location = useLocation();
  const { t, language } = useLanguage();

  const navigation = [
    { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
    { name: t.nav.employees, href: "/employees", icon: Users },
    { name: t.nav.payroll, href: "/payroll", icon: DollarSign },
    { name: language === 'pt' ? 'Descontos' : 'Deductions', href: "/deductions", icon: Wallet },
    { name: language === 'pt' ? 'Filiais' : 'Branches', href: "/branches", icon: MapPin },
    { name: t.nav.reports, href: "/reports", icon: FileText },
    { name: t.nav.settings, href: "/settings", icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-sidebar-foreground">
              PayrollAO
            </h1>
            <p className="text-xs text-sidebar-foreground/60">{t.nav.systemTitle}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
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
          <button className="sidebar-link w-full text-sidebar-foreground/60 hover:text-destructive">
            <LogOut className="h-5 w-5" />
            <span>{t.nav.logout}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
