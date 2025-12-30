import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Sidebar />
      <main className="pl-64 flex-1 flex flex-col">
        <div className="flex justify-end p-4 pb-0">
          <LanguageSwitcher />
        </div>
        <div className="p-8 pt-4 flex-1">
          {children}
        </div>
        <footer className="pl-8 pr-8 pb-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} • Desenvolvido por <span className="font-medium">Hassan Merhi</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
