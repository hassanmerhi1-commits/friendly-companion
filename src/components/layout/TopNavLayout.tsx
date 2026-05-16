import { ReactNode } from "react";
import { TopNavbar } from "./TopNavbar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DbStatusIndicator } from "./DbStatusIndicator";
import { UpdateNotification } from "@/components/UpdateNotification";

interface TopNavLayoutProps {
  children: ReactNode;
}

/**
 * App shell: navbar + status bar fixed; main content scrolls in the area below.
 * Folha, Funcionários, Deduções use FIXED_TOOLBAR_PAGE (viewport height + internal scroll).
 */
export function TopNavLayout({ children }: TopNavLayoutProps) {
  return (
    <div className="h-dvh min-h-0 bg-background flex flex-col overflow-hidden">
      <TopNavbar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border/40 bg-muted/30">
          <div className="flex items-center gap-4">
            <DbStatusIndicator />
            <UpdateNotification />
          </div>
          <LanguageSwitcher />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-6 pt-6 pb-6">{children}</div>
        </div>

        <footer className="shrink-0 px-6 pb-4 text-center border-t border-border/30 bg-background">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} • Desenvolvido por <span className="font-medium">Hassan Merhi</span>
          </p>
        </footer>
      </main>
    </div>
  );
}

