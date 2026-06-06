import { useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  ArrowLeft,
  User,
  LayoutDashboard,
  Wallet,
  Clock,
  Receipt,
  Users,
  History,
  Pencil,
  CreditCard,
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEmployeeStore } from '@/stores/employee-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/lib/i18n';
import { ATTENDANCE_PAGE } from '@/lib/page-layout';
import { ProfileHeader } from '@/components/employee-profile/ProfileHeader';
import { OverviewTab, type DossierTab } from '@/components/employee-profile/OverviewTab';
import { PayrollTab } from '@/components/employee-profile/PayrollTab';
import { AttendanceTab } from '@/components/employee-profile/AttendanceTab';
import { FinanceiroTab } from '@/components/employee-profile/FinanceiroTab';
import { RHTab } from '@/components/employee-profile/RHTab';
import { AuditHistoryTab } from '@/components/employee-profile/AuditHistoryTab';
import { EmployeeFormDialog } from '@/components/employees/EmployeeFormDialog';
import { PrintableEmployeeCard } from '@/components/employees/PrintableEmployeeCard';

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useLanguage();
  const { employees } = useEmployeeStore();
  const { hasPermission } = useAuthStore();
  const canEdit = hasPermission('employees.edit');

  const backTarget = location.search ? `/employees${location.search}` : '/employees';
  const employee = employees.find((e) => e.id === id);

  const [activeTab, setActiveTab] = useState<DossierTab>('overview');
  const [formOpen, setFormOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: cardRef,
    documentTitle: employee
      ? `Cartao-${employee.firstName}-${employee.lastName}`
      : 'Cartao-Funcionario',
    onBeforePrint: async () => {
      if (employee && !employee.photoUrl) {
        toast.warning(
          language === 'pt'
            ? 'Este funcionário não tem foto no dossier.'
            : 'This employee has no photo on file.'
        );
      }
    },
  });

  const handleEdit = () => {
    if (!canEdit) {
      toast.error(
        language === 'pt' ? 'Sem permissão para editar funcionários' : 'No permission to edit employees'
      );
      return;
    }
    setFormOpen(true);
  };

  const handlePrintCard = () => {
    setCardDialogOpen(true);
  };

  if (!employee) {
    return (
      <TopNavLayout scrollable={false}>
        <div className="flex flex-col items-center justify-center flex-1 min-h-[40vh] text-muted-foreground">
          <User className="h-16 w-16 mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">
            {language === 'pt' ? 'Funcionário não encontrado' : 'Employee not found'}
          </h2>
          <Button variant="outline" onClick={() => navigate(backTarget)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Voltar aos Funcionários' : 'Back to Employees'}
          </Button>
        </div>
      </TopNavLayout>
    );
  }

  const headerActions = (
    <>
      {canEdit && (
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleEdit}>
          <Pencil className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{language === 'pt' ? 'Editar' : 'Edit'}</span>
        </Button>
      )}
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handlePrintCard}>
        <CreditCard className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{language === 'pt' ? 'Cartão ID' : 'ID card'}</span>
      </Button>
    </>
  );

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-2`}>
        <div className="shrink-0">
          <div className="flex items-start gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backTarget)}
              className="h-8 shrink-0 gap-1.5 px-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">
                {language === 'pt' ? 'Funcionários' : 'Employees'}
              </span>
            </Button>
            <div className="flex-1 min-w-0">
              <ProfileHeader employee={employee} actions={headerActions} />
            </div>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as DossierTab)}
          className="flex flex-col flex-1 min-h-0 overflow-hidden"
        >
          <TabsList className="h-8 w-full justify-start overflow-x-auto shrink-0 mb-2">
            <TabsTrigger value="overview" className="text-xs gap-1.5 h-7 px-3 shrink-0">
              <LayoutDashboard className="h-3.5 w-3.5" />
              {language === 'pt' ? 'Resumo' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="folha" className="text-xs gap-1.5 h-7 px-3 shrink-0">
              <Wallet className="h-3.5 w-3.5" />
              {language === 'pt' ? 'Folha' : 'Payroll'}
            </TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs gap-1.5 h-7 px-3 shrink-0">
              <Clock className="h-3.5 w-3.5" />
              {language === 'pt' ? 'Presenças' : 'Attendance'}
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="text-xs gap-1.5 h-7 px-3 shrink-0">
              <Receipt className="h-3.5 w-3.5" />
              {language === 'pt' ? 'Financeiro' : 'Financial'}
            </TabsTrigger>
            <TabsTrigger value="rh" className="text-xs gap-1.5 h-7 px-3 shrink-0">
              <Users className="h-3.5 w-3.5" />
              RH
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="text-xs gap-1.5 h-7 px-3 shrink-0">
              <History className="h-3.5 w-3.5" />
              {language === 'pt' ? 'Auditoria' : 'Audit'}
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {activeTab === 'overview' && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <OverviewTab
                  employee={employee}
                  onNavigateTab={setActiveTab}
                  onEdit={handleEdit}
                  onPrintCard={handlePrintCard}
                  canEdit={canEdit}
                />
              </div>
            )}
            {activeTab === 'folha' && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <PayrollTab employeeId={employee.id} />
              </div>
            )}
            {activeTab === 'attendance' && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <AttendanceTab employeeId={employee.id} />
              </div>
            )}
            {activeTab === 'financeiro' && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <FinanceiroTab employeeId={employee.id} />
              </div>
            )}
            {activeTab === 'rh' && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <RHTab employeeId={employee.id} />
              </div>
            )}
            {activeTab === 'auditoria' && (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <AuditHistoryTab employeeId={employee.id} />
              </div>
            )}
          </div>
        </Tabs>
      </div>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={employee} />

      <Dialog open={cardDialogOpen} onOpenChange={setCardDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {language === 'pt' ? 'Cartão de Identificação' : 'ID Card'}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">
            <PrintableEmployeeCard ref={cardRef} employee={employee} language={language} />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCardDialogOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="accent" onClick={() => handlePrint()}>
              <FileDown className="h-4 w-4 mr-2" />
              {language === 'pt' ? 'Imprimir Cartão' : 'Print Card'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TopNavLayout>
  );
};

export default EmployeeProfile;
