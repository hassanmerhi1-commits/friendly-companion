import { useParams, useNavigate } from 'react-router-dom';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Wallet, Clock, FileWarning, Banknote, Printer } from 'lucide-react';
import { useEmployeeStore } from '@/stores/employee-store';
import { useLanguage } from '@/lib/i18n';
import { ProfileHeader } from '@/components/employee-profile/ProfileHeader';
import { PayrollHistoryTab } from '@/components/employee-profile/PayrollHistoryTab';
import { AttendanceTab } from '@/components/employee-profile/AttendanceTab';
import { DisciplinaryTab } from '@/components/employee-profile/DisciplinaryTab';
import { LoansTab } from '@/components/employee-profile/LoansTab';

const EmployeeProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();

  const employee = employees.find((e) => e.id === id);

  if (!employee) {
    return (
      <TopNavLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-muted-foreground">
          <User className="h-16 w-16 mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">
            {language === 'pt' ? 'Funcionário não encontrado' : 'Employee not found'}
          </h2>
          <Button variant="outline" onClick={() => navigate('/employees')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Voltar aos Funcionários' : 'Back to Employees'}
          </Button>
        </div>
      </TopNavLayout>
    );
  }

  return (
    <TopNavLayout>
      {/* Back button */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/employees')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {language === 'pt' ? 'Voltar aos Funcionários' : 'Back to Employees'}
        </Button>
      </div>

      {/* Employee Header Card */}
      <ProfileHeader employee={employee} />

      {/* Tabs for different sections */}
      <Tabs defaultValue="payroll" className="mt-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="payroll" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === 'pt' ? 'Histórico Salarial' : 'Salary History'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === 'pt' ? 'Assiduidade' : 'Attendance'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="disciplinary" className="gap-2">
            <FileWarning className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === 'pt' ? 'Disciplina' : 'Disciplinary'}
            </span>
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-2">
            <Banknote className="h-4 w-4" />
            <span className="hidden sm:inline">
              {language === 'pt' ? 'Empréstimos' : 'Loans'}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="mt-6">
          <PayrollHistoryTab employeeId={employee.id} />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceTab employeeId={employee.id} />
        </TabsContent>

        <TabsContent value="disciplinary" className="mt-6">
          <DisciplinaryTab employeeId={employee.id} />
        </TabsContent>

        <TabsContent value="loans" className="mt-6">
          <LoansTab employeeId={employee.id} />
        </TabsContent>
      </Tabs>
    </TopNavLayout>
  );
};

export default EmployeeProfile;
