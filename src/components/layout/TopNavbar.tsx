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
  Menu,
  X,
  ChevronDown
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import companyLogo from "@/assets/distri-good-logo.jpeg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { currentUser, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Main navigation items (most used)
  const mainNavigation = [
    { name: t.nav.dashboard, href: "/", icon: LayoutDashboard },
    { name: t.nav.employees, href: "/employees", icon: Users },
    { name: t.nav.payroll, href: "/payroll", icon: DollarSign },
    { name: t.nav.reports, href: "/reports", icon: FileText },
  ];

  // Dropdown items for "More" menu
  const moreNavigation = [
    { name: language === 'pt' ? 'Cartões ID' : 'ID Cards', href: "/employee-cards", icon: CreditCard },
    { name: language === 'pt' ? 'Histórico Folhas' : 'Payroll History', href: "/payroll-history", icon: Archive },
    { name: language === 'pt' ? 'Painel RH' : 'HR Dashboard', href: "/hr-dashboard", icon: UserCheck },
    { name: language === 'pt' ? 'Presenças' : 'Attendance', href: "/attendance", icon: Clock },
    { name: language === 'pt' ? 'Descontos' : 'Deductions', href: "/deductions", icon: Wallet },
    { name: language === 'pt' ? 'Filiais' : 'Branches', href: "/branches", icon: MapPin },
    { name: language === 'pt' ? 'Lei do Trabalho' : 'Labor Law', href: "/labor-law", icon: Scale },
    { name: language === 'pt' ? 'Simulador IRT' : 'Tax Simulator', href: "/tax-simulator", icon: Calculator },
    { name: language === 'pt' ? 'Documentos' : 'Documents', href: "/documents", icon: FileWarning },
    { name: t.nav.settings, href: "/settings", icon: Settings },
  ];

  // Add users management for admins
  if (currentUser?.role === 'admin') {
    moreNavigation.push({ 
      name: language === 'pt' ? 'Utilizadores' : 'Users', 
      href: "/users", 
      icon: UserCog 
    });
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (href: string) => location.pathname === href;
  const isMoreActive = moreNavigation.some(item => isActive(item.href));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <img 
            src={companyLogo} 
            alt="Company Logo" 
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {mainNavigation.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          ))}

          {/* More Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={isMoreActive ? "default" : "ghost"} 
                className={cn(
                  "flex items-center gap-2",
                  isMoreActive && "bg-primary text-primary-foreground"
                )}
              >
                <Menu className="h-4 w-4" />
                <span>{language === 'pt' ? 'Mais' : 'More'}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {moreNavigation.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 cursor-pointer",
                      isActive(item.href) && "bg-muted"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right side - User menu */}
        <div className="flex items-center gap-3">
          {/* User Dropdown */}
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                    <Settings className="h-4 w-4" />
                    <span>{t.nav.settings}</span>
                  </Link>
                </DropdownMenuItem>
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

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/40 bg-background p-4">
          <nav className="grid gap-2">
            {[...mainNavigation, ...moreNavigation].map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
