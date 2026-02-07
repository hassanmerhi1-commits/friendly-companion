import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Calendar, 
  CreditCard,
  Briefcase
} from 'lucide-react';
import { Employee } from '@/types/employee';
import { formatAOA } from '@/lib/angola-labor-law';
import { useLanguage } from '@/lib/i18n';
import { useBranchStore } from '@/stores/branch-store';

interface ProfileHeaderProps {
  employee: Employee;
}

export function ProfileHeader({ employee }: ProfileHeaderProps) {
  const { language, t } = useLanguage();
  const { branches } = useBranchStore();

  const branch = branches.find((b) => b.id === employee.branchId);

  const getStatusBadge = (status: Employee['status']) => {
    const colors = {
      active: 'bg-accent/10 text-accent border-accent/20',
      inactive: 'bg-destructive/10 text-destructive border-destructive/20',
      on_leave: 'bg-warning/10 text-warning border-warning/20',
      terminated: 'bg-muted text-muted-foreground',
    };
    const labels = {
      active: t.common.active,
      inactive: t.common.inactive,
      on_leave: t.common.onLeave,
      terminated: t.common.inactive,
    };
    return (
      <Badge variant="outline" className={colors[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getContractLabel = (contract: Employee['contractType']) => {
    const labels = {
      permanent: t.employees.permanent,
      fixed_term: t.employees.fixedTerm,
      part_time: t.employees.partTime,
      probation: t.employees.probation,
    };
    return labels[contract];
  };

  const totalCompensation =
    (employee.baseSalary || 0) +
    (employee.mealAllowance || 0) +
    (employee.transportAllowance || 0) +
    (employee.familyAllowance || 0) +
    (employee.monthlyBonus || 0) +
    (employee.otherAllowances || 0);

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-background shadow-lg">
              <span className="text-3xl font-bold text-primary">
                {employee.firstName[0]}
                {employee.lastName[0]}
              </span>
            </div>
          </div>

          {/* Main Info */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {employee.firstName} {employee.lastName}
              </h1>
              {getStatusBadge(employee.status)}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                {employee.position}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {employee.department}
              </span>
              {branch && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {branch.name}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                {employee.email}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4" />
                  {employee.phone}
                </span>
              )}
            </div>
          </div>

          {/* Salary Info */}
          <div className="flex-shrink-0 text-right space-y-2">
            <div className="text-sm text-muted-foreground">
              {language === 'pt' ? 'Remuneração Total' : 'Total Compensation'}
            </div>
            <div className="text-2xl font-bold text-primary font-mono">
              {formatAOA(totalCompensation)}
            </div>
            <div className="text-xs text-muted-foreground">
              {language === 'pt' ? 'Base' : 'Base'}: {formatAOA(employee.baseSalary)}
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-6 pt-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Contract Type */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {t.employees.contract}
            </div>
            <div className="text-sm font-medium">{getContractLabel(employee.contractType)}</div>
          </div>

          {/* Hire Date */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {language === 'pt' ? 'Data de Admissão' : 'Hire Date'}
            </div>
            <div className="text-sm font-medium">
              {employee.hireDate
                ? format(new Date(employee.hireDate), 'dd/MM/yyyy', { locale: pt })
                : '-'}
            </div>
          </div>

          {/* BI */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              BI
            </div>
            <div className="text-sm font-medium font-mono">{employee.bilheteIdentidade || '-'}</div>
          </div>

          {/* NIF */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">NIF</div>
            <div className="text-sm font-medium font-mono">{employee.nif || '-'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
