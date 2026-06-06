import { useRef, useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Search, FileText, Users, TrendingUp } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useEmployeeStore } from '@/stores/employee-store';
import { useBulkAttendanceStore } from '@/stores/bulk-attendance-store';
import { useBranchStore } from '@/stores/branch-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/lib/i18n';
import { format } from 'date-fns';
import { pt as ptLocale, enUS } from 'date-fns/locale';
import {
  AttendanceTablePanel,
  ATTENDANCE_TH,
  ATTENDANCE_TH_CENTER,
  ATTENDANCE_TH_RIGHT,
  ATTENDANCE_THEAD,
  ATTENDANCE_TD,
  ATTENDANCE_TBODY,
} from '@/components/attendance/AttendanceTablePanel';

const WORKING_DAYS_IN_MONTH = 26;

interface PrintableAttendanceMapProps {
  month: number;
  year: number;
  embedded?: boolean;
  branchFilter?: string;
}

interface EffectivenessRow {
  employeeId: string;
  name: string;
  department: string;
  branch: string;
  presentDays: number;
  absenceDays: number;
  justifiedDays: number;
  delayHours: number;
  effectivenessRate: number;
  notes: string;
}

export function PrintableAttendanceMap({
  month,
  year,
  embedded: _embedded = false,
  branchFilter,
}: PrintableAttendanceMapProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const locale = pt ? ptLocale : enUS;
  const printRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');

  const { employees, getActiveEmployees } = useEmployeeStore();
  const { entries, loadEntries, isLoaded } = useBulkAttendanceStore();
  const { getActiveBranches, getBranch } = useBranchStore();
  const { settings } = useSettingsStore();
  const { currentUser } = useAuthStore();

  const isAdmin = currentUser?.role?.trim().toLowerCase() === 'admin';
  const isBranchLocked = !!currentUser?.branchId && !isAdmin;
  const branches = getActiveBranches();

  const showBranchPicker = !isBranchLocked && !branchFilter;
  const effectiveBranchId =
    branchFilter ||
    (isBranchLocked ? currentUser?.branchId : selectedBranch !== 'all' ? selectedBranch : undefined);
  const showBranchColumn = !isBranchLocked && !effectiveBranchId;

  useEffect(() => {
    if (branchFilter) setSelectedBranch(branchFilter);
  }, [branchFilter]);

  useEffect(() => {
    if (!isLoaded) loadEntries();
  }, [isLoaded, loadEntries]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Mapa-Efectividade-${month}-${year}`,
  });

  const monthNames = pt
    ? ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const periodLabel = `${monthNames[month - 1]} ${year}`;

  const buildRows = (employeeList: typeof employees): EffectivenessRow[] => {
    return employeeList
      .filter((e) => e.status === 'active')
      .filter((e) => !effectiveBranchId || e.branchId === effectiveBranchId)
      .map((emp) => {
        const entry = entries.find((e) => e.employeeId === emp.id && e.month === month && e.year === year);
        const branch = emp.branchId ? getBranch(emp.branchId) : undefined;
        const absenceDays = entry?.absenceDays || 0;
        const justifiedDays = entry?.justifiedAbsenceDays || 0;
        const delayHours = entry?.delayHours || 0;
        const presentDays = Math.max(0, WORKING_DAYS_IN_MONTH - absenceDays - justifiedDays);
        const effectivenessRate =
          WORKING_DAYS_IN_MONTH > 0
            ? Math.round((presentDays / WORKING_DAYS_IN_MONTH) * 100)
            : 100;

        return {
          employeeId: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department || '—',
          branch: branch?.name || '—',
          presentDays,
          absenceDays,
          justifiedDays,
          delayHours,
          effectivenessRate,
          notes: entry?.notes || '',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const allRows = useMemo(() => buildRows(employees), [employees, entries, month, year, effectiveBranchId, getBranch]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.branch.toLowerCase().includes(q)
    );
  }, [allRows, search]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          presentDays: acc.presentDays + r.presentDays,
          absenceDays: acc.absenceDays + r.absenceDays,
          justifiedDays: acc.justifiedDays + r.justifiedDays,
          delayHours: acc.delayHours + r.delayHours,
        }),
        { presentDays: 0, absenceDays: 0, justifiedDays: 0, delayHours: 0 }
      ),
    [rows]
  );

  const avgEffectiveness =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.effectivenessRate, 0) / rows.length)
      : 100;

  const t = {
    title: pt ? 'Mapa de Efectividade' : 'Effectiveness Map',
    subtitle: pt ? 'Relatório mensal de assiduidade' : 'Monthly attendance report',
    search: pt ? 'Pesquisar...' : 'Search...',
    allBranches: pt ? 'Todas as filiais' : 'All branches',
    print: pt ? 'Imprimir' : 'Print',
    workingDays: pt ? 'Dias úteis' : 'Working days',
    employee: pt ? 'Funcionário' : 'Employee',
    dept: pt ? 'Departamento' : 'Department',
    branch: pt ? 'Filial' : 'Branch',
    present: pt ? 'Presença' : 'Present',
    unjustified: pt ? 'Faltas Injust.' : 'Unjust. abs.',
    justified: pt ? 'Faltas Just.' : 'Just. abs.',
    delays: pt ? 'Atrasos' : 'Delays',
    rate: pt ? 'Taxa' : 'Rate',
    notes: pt ? 'Obs.' : 'Notes',
    noData: pt ? 'Sem dados para este período' : 'No data for this period',
    employees: pt ? 'funcionários' : 'employees',
    avgRate: pt ? 'taxa média' : 'avg rate',
    totals: pt ? 'TOTAIS / MÉDIA' : 'TOTALS / AVERAGE',
    summary: pt ? 'Resumo de Efectividade' : 'Effectiveness Summary',
    totalWorkers: pt ? 'Total de Trabalhadores' : 'Total Workers',
    totalAbsences: pt ? 'Total Faltas Injustificadas' : 'Total Unjustified Absences',
    totalJustified: pt ? 'Total Faltas Justificadas' : 'Total Justified Absences',
    totalDelays: pt ? 'Total Horas de Atraso' : 'Total Delay Hours',
    company: pt ? 'Entidade Empregadora' : 'Company',
    issueDate: pt ? 'Data de Emissão' : 'Issue Date',
    period: pt ? 'Período' : 'Period',
    hrManager: pt ? 'Responsável pelos Recursos Humanos' : 'HR Manager',
    admin: pt ? 'Representante Legal / Administração' : 'Legal Representative',
    legalNote: pt
      ? 'Documento elaborado nos termos da Lei Geral do Trabalho de Angola (Lei nº 12/23).'
      : 'Document prepared under Angolan General Labor Law (Law No. 12/23).',
    num: 'Nº',
  };

  const rateBadge = (rate: number) => {
    const cls =
      rate < 85
        ? 'bg-destructive/15 text-destructive border-destructive/30'
        : rate >= 95
          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
          : 'bg-amber-500/15 text-amber-700 border-amber-500/30';
    return (
      <Badge variant="outline" className={`text-[10px] font-bold ${cls}`}>
        {rate}%
      </Badge>
    );
  };

  const colSpan = showBranchColumn ? 10 : 9;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold">
        <FileText className="h-3.5 w-3.5 text-primary" />
        {t.title}
      </div>

      <span className="text-xs text-muted-foreground capitalize shrink-0">
        {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale })}
      </span>

      <div className="relative flex-1 min-w-[140px] max-w-[220px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pl-8 h-8 text-xs"
          placeholder={t.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showBranchPicker && (
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="h-8 w-[150px] text-xs shrink-0">
            <SelectValue placeholder={t.allBranches} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allBranches}</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        <Users className="h-3 w-3" />
        <span className="font-medium text-foreground">{rows.length}</span> {t.employees}
        <span className="text-border">|</span>
        <TrendingUp className="h-3 w-3" />
        <span className="font-medium text-foreground">{avgEffectiveness}%</span> {t.avgRate}
        <span className="text-border">|</span>
        <span className="text-muted-foreground">{WORKING_DAYS_IN_MONTH} {t.workingDays}</span>
      </div>

      <Button size="sm" className="h-8 text-xs shrink-0 ml-auto gap-1" onClick={() => handlePrint()}>
        <Printer className="h-3.5 w-3.5" />
        {t.print}
      </Button>
    </div>
  );

  const screenTable = (
    <table className="w-full min-w-[960px] text-sm">
      <thead className={ATTENDANCE_THEAD}>
        <tr>
          <th className={`${ATTENDANCE_TH_CENTER} w-10`}>{t.num}</th>
          <th className={ATTENDANCE_TH}>{t.employee}</th>
          {showBranchColumn && <th className={ATTENDANCE_TH}>{t.branch}</th>}
          <th className={ATTENDANCE_TH}>{t.dept}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.present}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.unjustified}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.justified}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.delays}</th>
          <th className={ATTENDANCE_TH_CENTER}>{t.rate}</th>
          <th className={ATTENDANCE_TH}>{t.notes}</th>
        </tr>
      </thead>
      <tbody className={ATTENDANCE_TBODY}>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={colSpan} className="px-3 py-8 text-center text-muted-foreground text-sm">
              {t.noData}
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => (
            <tr key={row.employeeId} className="hover:bg-muted/20">
              <td className={`${ATTENDANCE_TD} text-center text-xs text-muted-foreground`}>{idx + 1}</td>
              <td className={ATTENDANCE_TD}>
                <span className="font-medium text-sm">{row.name}</span>
              </td>
              {showBranchColumn && (
                <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>{row.branch}</td>
              )}
              <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground`}>{row.department}</td>
              <td className={`${ATTENDANCE_TD} text-center text-xs font-medium`}>{row.presentDays}</td>
              <td className={`${ATTENDANCE_TD} text-center text-xs font-medium ${row.absenceDays >= 3 ? 'text-destructive' : ''}`}>
                {row.absenceDays}
              </td>
              <td className={`${ATTENDANCE_TD} text-center text-xs`}>{row.justifiedDays}</td>
              <td className={`${ATTENDANCE_TD} text-center text-xs`}>
                {row.delayHours > 0 ? `${row.delayHours}h` : '—'}
              </td>
              <td className={`${ATTENDANCE_TD} text-center`}>{rateBadge(row.effectivenessRate)}</td>
              <td className={`${ATTENDANCE_TD} text-xs text-muted-foreground max-w-[140px] truncate`}>
                {row.notes || '—'}
              </td>
            </tr>
          ))
        )}
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <tr className="bg-muted/40 font-medium border-t">
            <td colSpan={showBranchColumn ? 4 : 3} className={`${ATTENDANCE_TD} text-xs`}>
              {t.totals}
            </td>
            <td className={`${ATTENDANCE_TD} text-center text-xs`}>{totals.presentDays}</td>
            <td className={`${ATTENDANCE_TD} text-center text-xs`}>{totals.absenceDays}</td>
            <td className={`${ATTENDANCE_TD} text-center text-xs`}>{totals.justifiedDays}</td>
            <td className={`${ATTENDANCE_TD} text-center text-xs`}>
              {totals.delayHours > 0 ? `${totals.delayHours}h` : '—'}
            </td>
            <td className={`${ATTENDANCE_TD} text-center`}>{rateBadge(avgEffectiveness)}</td>
            <td className={ATTENDANCE_TD} />
          </tr>
        </tfoot>
      )}
    </table>
  );

  const printRows = buildRows(getActiveEmployees());

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full">
      <AttendanceTablePanel toolbar={toolbar}>{screenTable}</AttendanceTablePanel>

      {/* Hidden printable document */}
      <div className="hidden">
        <div ref={printRef} className="bg-white text-black p-8">
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h1 className="text-xl font-bold uppercase">{t.title}</h1>
            <h2 className="text-lg font-semibold mt-2">{t.subtitle}</h2>
            <p className="text-sm mt-1">
              {t.period}: {periodLabel}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p>
                <strong>{t.company}:</strong> {settings.companyName}
              </p>
              <p>
                <strong>NIF:</strong> {settings.nif}
              </p>
            </div>
            <div className="text-right">
              <p>
                <strong>{t.issueDate}:</strong> {new Date().toLocaleDateString('pt-AO')}
              </p>
              <p>
                <strong>{t.workingDays}:</strong> {WORKING_DAYS_IN_MONTH}
              </p>
            </div>
          </div>

          <table className="w-full border-collapse text-xs mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-left">{t.num}</th>
                <th className="border border-black p-1 text-left">{t.employee}</th>
                <th className="border border-black p-1 text-left">{t.dept}</th>
                <th className="border border-black p-1 text-right">{t.present}</th>
                <th className="border border-black p-1 text-right">{t.unjustified}</th>
                <th className="border border-black p-1 text-right">{t.justified}</th>
                <th className="border border-black p-1 text-right">{t.delays}</th>
                <th className="border border-black p-1 text-right">{t.rate}</th>
                <th className="border border-black p-1 text-left">{t.notes}</th>
              </tr>
            </thead>
            <tbody>
              {printRows.map((row, idx) => (
                <tr key={row.employeeId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-black p-1">{idx + 1}</td>
                  <td className="border border-black p-1">{row.name}</td>
                  <td className="border border-black p-1">{row.department}</td>
                  <td className="border border-black p-1 text-right">{row.presentDays}</td>
                  <td
                    className="border border-black p-1 text-right font-medium"
                    style={{ color: row.absenceDays >= 3 ? '#dc2626' : 'inherit' }}
                  >
                    {row.absenceDays}
                  </td>
                  <td className="border border-black p-1 text-right">{row.justifiedDays}</td>
                  <td className="border border-black p-1 text-right">
                    {row.delayHours > 0 ? `${row.delayHours}h` : '-'}
                  </td>
                  <td
                    className="border border-black p-1 text-right font-bold"
                    style={{
                      color:
                        row.effectivenessRate < 85
                          ? '#dc2626'
                          : row.effectivenessRate >= 95
                            ? '#16a34a'
                            : 'inherit',
                    }}
                  >
                    {row.effectivenessRate}%
                  </td>
                  <td className="border border-black p-1 text-xs max-w-[100px] truncate">
                    {row.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border border-black p-4 mb-6 text-sm">
            <h3 className="font-bold mb-2">{t.summary}</h3>
            <p>
              {t.totalWorkers}: <strong>{printRows.length}</strong> — {t.avgRate}:{' '}
              <strong>{avgEffectiveness}%</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-12 text-sm">
            <div className="text-center">
              <div className="border-t border-black pt-2 mt-16">
                <p>{t.hrManager}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-2 mt-16">
                <p>{t.admin}</p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-xs text-gray-600 border-t pt-4">{t.legalNote}</p>
        </div>
      </div>
    </div>
  );
}
