import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  CreditCard,
  Briefcase,
  LogOut,
} from 'lucide-react';
import { getExitReasonLabel } from '@/lib/employee-exit';
import { Employee } from '@/types/employee';
import { formatAOA } from '@/lib/angola-labor-law';
import { useLanguage } from '@/lib/i18n';
import { useBranchStore } from '@/stores/branch-store';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ProfileHeaderProps {
  employee: Employee;
  actions?: ReactNode;
  className?: string;
}

export function ProfileHeader({ employee, actions, className }: ProfileHeaderProps) {
  const { language, t } = useLanguage();
  const { branches } = useBranchStore();

  const branch = branches.find((b) => b.id === employee.branchId);

  const getStatusBadge = (status: Employee['status']) => {
    const colors = {
      active: 'bg-accent/10 text-accent border-accent/20',
      inactive: 'bg-destructive/10 text-destructive border-destructive/20',
      on_leave: 'bg-warning/10 text-warning border-warning/20',
      terminated: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    const labels = {
      active: t.common.active,
      inactive: t.common.inactive,
      on_leave: t.common.onLeave,
      terminated: language === 'pt' ? 'Fora da empresa' : 'Left company',
    };
    return (
      <Badge variant="outline" className={cn('text-[10px] h-5', colors[status])}>
        {labels[status]}
      </Badge>
    );
  };

  const getContractLabel = (contract: Employee['contractType']) => {
    const labels: Record<Employee['contractType'], string> = {
      permanent: t.employees.permanent,
      fixed_term: t.employees.fixedTerm,
      part_time: t.employees.partTime,
      probation: t.employees.probation,
      colaborador:
        t.employees?.colaborador ??
        (language === 'pt' ? 'Colaborador' : 'Collaborator'),
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

  const initials = `${employee.firstName[0] || ''}${employee.lastName[0] || ''}`;

  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 p-3">
        <Avatar className="h-12 w-12 shrink-0 border-2 border-background shadow-sm">
          {employee.photoUrl ? (
            <AvatarImage src={employee.photoUrl} alt={`${employee.firstName} ${employee.lastName}`} />
          ) : null}
          <AvatarFallback className="bg-primary/15 text-primary font-semibold">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-semibold text-foreground truncate">
              {employee.firstName} {employee.lastName}
            </h1>
            {employee.employeeNumber && (
              <span className="text-[10px] font-mono text-muted-foreground">#{employee.employeeNumber}</span>
            )}
            {getStatusBadge(employee.status)}
            {employee.isRetired && (
              <Badge variant="outline" className="text-[10px] h-5 bg-muted text-muted-foreground">
                {language === 'pt' ? 'Reformado' : 'Retired'}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] h-5">
              {getContractLabel(employee.contractType)}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Briefcase className="h-3 w-3 shrink-0" />
              {employee.position}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
              {employee.department}
            </span>
            {branch && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                {branch.name}
              </span>
            )}
            {employee.email && (
              <span className="flex items-center gap-1 hidden sm:flex">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[12rem]">{employee.email}</span>
              </span>
            )}
            {employee.phone && (
              <span className="flex items-center gap-1 hidden md:flex">
                <Phone className="h-3 w-3 shrink-0" />
                {employee.phone}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right hidden sm:block">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {language === 'pt' ? 'Remuneração' : 'Compensation'}
          </div>
          <div className="text-sm font-bold text-primary font-mono">{formatAOA(totalCompensation)}</div>
        </div>

        {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 pb-3 border-t border-border/40 pt-2 bg-muted/20">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {language === 'pt' ? 'Admissão' : 'Hire date'}
          </div>
          <div className="text-xs font-medium">
            {employee.hireDate
              ? format(new Date(employee.hireDate), 'dd/MM/yyyy', { locale: pt })
              : '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t.employees.contract}
          </div>
          <div className="text-xs font-medium">{getContractLabel(employee.contractType)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <CreditCard className="h-3 w-3" />
            BI
          </div>
          <div className="text-xs font-medium font-mono">{employee.bilheteIdentidade || '—'}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">NIF</div>
          <div className="text-xs font-medium font-mono">{employee.nif || '—'}</div>
        </div>
      </div>

      {employee.status === 'terminated' && (employee.exitDate || employee.exitNote) && (
        <div className="mx-3 mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs">
          <div className="flex items-start gap-2 font-medium text-destructive">
            <LogOut className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{language === 'pt' ? 'Saída da empresa' : 'Left the company'}</span>
          </div>
          {employee.exitDate && (
            <p className="mt-1 text-muted-foreground">
              {format(new Date(employee.exitDate), 'dd MMM yyyy', { locale: pt })}
              {employee.exitReason && ` · ${getExitReasonLabel(employee.exitReason, language)}`}
            </p>
          )}
          {employee.exitNote && <p className="mt-0.5 text-foreground">{employee.exitNote}</p>}
        </div>
      )}
    </div>
  );
}
