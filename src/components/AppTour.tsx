import { useState, useCallback, createContext, useContext } from "react";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";
import { useLocation, useNavigate } from "react-router-dom";

interface TourStep {
  title: { pt: string; en: string };
  description: { pt: string; en: string };
  route?: string;
}

const tourSteps: TourStep[] = [
  // Dashboard
  {
    title: { pt: "Painel Principal", en: "Dashboard" },
    description: {
      pt: "O painel principal mostra um resumo da empresa: total de funcionários, folha salarial do mês, pagamentos pendentes, contratos a expirar e aniversários. Use os cartões KPI para ver métricas em tempo real.",
      en: "The dashboard shows a company summary: total employees, monthly payroll, pending payments, expiring contracts and birthdays. Use the KPI cards for real-time metrics."
    },
    route: "/"
  },
  {
    title: { pt: "Ações Rápidas", en: "Quick Actions" },
    description: {
      pt: "Os botões coloridos permitem navegar rapidamente: adicionar funcionário, calcular folha salarial, ver relatórios, exportar dados, gerir empréstimos e registar presenças.",
      en: "The colorful buttons allow quick navigation: add employee, calculate payroll, view reports, export data, manage loans and register attendance."
    },
    route: "/"
  },
  // Employees
  {
    title: { pt: "Gestão de Funcionários", en: "Employee Management" },
    description: {
      pt: "Aqui pode adicionar, editar e remover funcionários. Cada funcionário tem dados pessoais, contrato, salário base e subsídios. Use o botão '+ Adicionar' para criar novos registos. Clique num funcionário para ver o dossier completo.",
      en: "Here you can add, edit and remove employees. Each employee has personal data, contract, base salary and allowances. Use the '+ Add' button to create new records. Click an employee to view their full dossier."
    },
    route: "/employees"
  },
  {
    title: { pt: "Cartões de Identificação", en: "ID Cards" },
    description: {
      pt: "Gere e imprima cartões de identificação profissional para os funcionários com foto, dados e código QR.",
      en: "Generate and print professional ID cards for employees with photo, data and QR code."
    },
    route: "/employee-cards"
  },
  // Payroll
  {
    title: { pt: "Processamento Salarial", en: "Payroll Processing" },
    description: {
      pt: "O módulo de folha salarial permite: 1) Criar um novo período (mês/ano), 2) Calcular salários automaticamente com INSS e IRT, 3) Registar horas extra e faltas, 4) Aprovar e marcar como pago. Cada funcionário recebe um recibo detalhado que pode ser impresso.",
      en: "The payroll module allows: 1) Create a new period (month/year), 2) Calculate salaries automatically with INSS and IRT, 3) Register overtime and absences, 4) Approve and mark as paid. Each employee gets a detailed receipt that can be printed."
    },
    route: "/payroll"
  },
  {
    title: { pt: "Histórico de Processamento", en: "Payroll History" },
    description: {
      pt: "Consulte todos os períodos salariais anteriores, compare valores entre meses e reimprima recibos de qualquer período passado.",
      en: "View all previous payroll periods, compare values between months and reprint receipts from any past period."
    },
    route: "/payroll-history"
  },
  // HR
  {
    title: { pt: "Gestão de RH", en: "HR Management" },
    description: {
      pt: "Painel de Recursos Humanos para: registar advertências e suspensões, ajustar salários com histórico, processar rescisões contratuais. Cada acção gera um documento imprimível (carta de advertência, termo de suspensão, carta de rescisão).",
      en: "HR panel for: registering warnings and suspensions, adjusting salaries with history, processing contract terminations. Each action generates a printable document (warning letter, suspension term, termination letter)."
    },
    route: "/hr-dashboard"
  },
  // Attendance
  {
    title: { pt: "Presenças e Faltas", en: "Attendance & Absences" },
    description: {
      pt: "Registe faltas e atrasos em massa por mês. Seleccione a filial, marque os dias de falta e horas de atraso para cada funcionário. Os valores são automaticamente deduzidos na folha salarial.",
      en: "Register absences and delays in bulk by month. Select the branch, mark absence days and delay hours for each employee. Values are automatically deducted from payroll."
    },
    route: "/attendance"
  },
  // Deductions
  {
    title: { pt: "Deduções", en: "Deductions" },
    description: {
      pt: "Configure deduções personalizadas (adiantamentos, empréstimos, pensão alimentar, etc.). As deduções podem ser fixas ou percentuais e são aplicadas automaticamente no processamento salarial.",
      en: "Configure custom deductions (advances, loans, alimony, etc.). Deductions can be fixed or percentage-based and are automatically applied in payroll processing."
    },
    route: "/deductions"
  },
  // Branches
  {
    title: { pt: "Filiais", en: "Branches" },
    description: {
      pt: "Crie e gerencie as filiais/localizações da empresa. Cada funcionário é associado a uma filial, permitindo filtrar relatórios e processamentos por localização.",
      en: "Create and manage company branches/locations. Each employee is assigned to a branch, allowing you to filter reports and payroll by location."
    },
    route: "/branches"
  },
  // Reports
  {
    title: { pt: "Relatórios - Visão Geral", en: "Reports - Overview" },
    description: {
      pt: "O módulo de relatórios tem 4 categorias: Principais (folha salarial, lista de funcionários, análise de custos, mapa de férias), Fiscais (INSS e IRT), RH (férias, horas extra, empréstimos, custos por filial) e Anuais (resumo anual, declaração de rendimentos).",
      en: "The reports module has 4 categories: Primary (payroll sheet, employee list, cost analysis, holiday map), Fiscal (INSS and IRT), HR (holidays, overtime, loans, branch costs) and Annual (annual summary, income declaration)."
    },
    route: "/reports"
  },
  {
    title: { pt: "Filtros de Relatórios", en: "Report Filters" },
    description: {
      pt: "No topo da página de relatórios, seleccione: Período (mês processado), Filial (filtrar por localização), Ano (para relatórios anuais) e Funcionário (para declaração individual). Clique no cartão do relatório para gerar e imprimir.",
      en: "At the top of the reports page, select: Period (processed month), Branch (filter by location), Year (for annual reports) and Employee (for individual declaration). Click the report card to generate and print."
    },
    route: "/reports"
  },
  // Labor Law
  {
    title: { pt: "Legislação Laboral", en: "Labor Law" },
    description: {
      pt: "Consulta rápida da Lei Geral do Trabalho de Angola. Inclui artigos sobre contratos, férias, horários, rescisão e direitos dos trabalhadores.",
      en: "Quick reference to Angola's General Labor Law. Includes articles on contracts, holidays, working hours, termination and worker rights."
    },
    route: "/labor-law"
  },
  // Tax Simulator
  {
    title: { pt: "Simulador de Impostos", en: "Tax Simulator" },
    description: {
      pt: "Simule o cálculo de IRT e INSS para qualquer valor salarial. Útil para estimar custos antes de definir salários.",
      en: "Simulate IRT and INSS calculations for any salary value. Useful for estimating costs before setting salaries."
    },
    route: "/tax-simulator"
  },
  // Settings
  {
    title: { pt: "Definições", en: "Settings" },
    description: {
      pt: "Configure: dados da empresa (nome, NIF, endereço), base de dados (ligação ao servidor), cópias de segurança, rede e reset de dados. As definições da empresa aparecem em todos os documentos impressos.",
      en: "Configure: company data (name, NIF, address), database (server connection), backups, network and data reset. Company settings appear on all printed documents."
    },
    route: "/settings"
  },
  // Users
  {
    title: { pt: "Gestão de Utilizadores", en: "User Management" },
    description: {
      pt: "Crie utilizadores com diferentes perfis: Admin (acesso total), Gestor, RH, Contabilista, Visualizador. Use 'Permissões Personalizadas' para controlo granular de cada módulo (ver, criar, editar, eliminar).",
      en: "Create users with different roles: Admin (full access), Manager, HR, Accountant, Viewer. Use 'Custom Permissions' for granular control of each module (view, create, edit, delete)."
    },
    route: "/users"
  },
];

interface TourContextType {
  startTour: () => void;
  isOpen: boolean;
}

const TourContext = createContext<TourContextType>({ startTour: () => {}, isOpen: false });

export function useTour() {
  return useContext(TourContext);
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const startTour = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <TourContext.Provider value={{ startTour, isOpen }}>
      {children}
      {isOpen && <TourOverlay onClose={() => setIsOpen(false)} />}
    </TourContext.Provider>
  );
}

function TourOverlay({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const lang = language === 'pt' ? 'pt' : 'en';

  const step = tourSteps[currentStep];
  const total = tourSteps.length;

  const goTo = (idx: number) => {
    const s = tourSteps[idx];
    if (s.route && s.route !== location.pathname) {
      navigate(s.route);
    }
    setCurrentStep(idx);
  };

  const next = () => { if (currentStep < total - 1) goTo(currentStep + 1); else onClose(); };
  const prev = () => { if (currentStep > 0) goTo(currentStep - 1); };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              {currentStep + 1} / {total}
            </span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <h3 className="text-xl font-bold text-foreground mb-3">{step.title[lang]}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description[lang]}</p>
        </div>

        {/* Progress bar */}
        <div className="px-6">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4">
          <Button variant="ghost" size="sm" onClick={prev} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {lang === 'pt' ? 'Anterior' : 'Previous'}
          </Button>

          <div className="flex gap-1">
            {tourSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === currentStep ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          <Button size="sm" onClick={next}>
            {currentStep === total - 1
              ? (lang === 'pt' ? 'Concluir' : 'Finish')
              : (lang === 'pt' ? 'Próximo' : 'Next')
            }
            {currentStep < total - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TourButton() {
  const { startTour } = useTour();
  const { language } = useLanguage();

  return (
    <Button variant="ghost" size="sm" onClick={startTour} className="gap-2">
      <HelpCircle className="h-4 w-4" />
      <span className="hidden sm:inline">{language === 'pt' ? 'Guia' : 'Guide'}</span>
    </Button>
  );
}
