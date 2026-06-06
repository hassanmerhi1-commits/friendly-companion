import { ReactNode } from "react";
import { TopNavbar } from "./TopNavbar";

interface TopNavLayoutProps {
  children: ReactNode;
  /** When false, content fills the viewport with no page scroll (e.g. dashboard). */
  scrollable?: boolean;
}

/**
 * App shell: navbar (logo + server/client + tabs) fixed; main content scrolls below.
 */
export function TopNavLayout({ children, scrollable = true }: TopNavLayoutProps) {
  return (
    <div className="h-dvh min-h-0 bg-background flex flex-col overflow-hidden">
      <TopNavbar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          className={
            scrollable
              ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain'
              : 'flex-1 min-h-0 overflow-hidden flex flex-col'
          }
        >
          <div
            className={
              scrollable
                ? 'px-6 pt-4 pb-6'
                : 'flex-1 min-h-0 flex flex-col px-6 py-3 overflow-hidden'
            }
          >
            {children}
          </div>
        </div>

        {scrollable && (
          <footer className="shrink-0 px-6 pb-4 text-center border-t border-border/30 bg-background">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} • Desenvolvido por <span className="font-medium">Hassan Merhi</span>
            </p>
          </footer>
        )}
      </main>
    </div>
  );
}
