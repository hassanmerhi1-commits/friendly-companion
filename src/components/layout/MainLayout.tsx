import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64">
        <div className="flex justify-end p-4 pb-0">
          <LanguageSwitcher />
        </div>
        <div className="p-8 pt-4">
          {children}
        </div>
      </main>
    </div>
  );
}
