import { ReactNode } from "react";
import { TopNavbar } from "./TopNavbar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DbStatusIndicator } from "./DbStatusIndicator";
import { UpdateNotification } from "@/components/UpdateNotification";

interface TopNavLayoutProps {
  children: ReactNode;
}

export function TopNavLayout({ children }: TopNavLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavbar />
      <main className="flex-1 flex flex-col">
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/40 bg-muted/30">
          <div className="flex items-center gap-4">
            <DbStatusIndicator />
            <UpdateNotification />
          </div>
          <LanguageSwitcher />
        </div>
        
        {/* Content area - full width now! */}
        <div className="p-6 flex-1">
          {children}
        </div>
        
        <footer className="px-6 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} • Desenvolvido por <span className="font-medium">Hassan Merhi</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
