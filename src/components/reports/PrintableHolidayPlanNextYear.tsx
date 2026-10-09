import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Save } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { useHolidayStore, type HolidayRecord as StoreHolidayRecord } from '@/stores/holiday-store';
import { printHtml } from '@/lib/print';
import { toast } from 'sonner';
import type { Employee } from '@/types/employee';
import type { Branch } from '@/types/branch';
import { useCompanyLogo } from '@/hooks/use-company-logo';
import { calculateHolidayEntitlement } from '@/lib/holiday-utils';

export type HolidayPlanRecord = Pick<
  StoreHolidayRecord,
  'employeeId' | 'year' | 'daysUsed' | 'startDate' | 'endDate' | 'notes'
>;

interface PrintableHolidayPlanNextYearProps {
  employees: Employee[];
  branch?: Branch;
  companyName?: string;
  companyNif?: string;
  /** Upcoming years available for planning (defaults to next 3 years). */
  yearOptions?: number[];
  holidayRecords?: HolidayPlanRecord[];
  onSaveRecords?: (records: HolidayPlanRecord[]) => void;
  onClose?: () => void;
}

function getDefaultUpcomingYears(count = 3): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => current + 1 + i);
}

export function PrintableHolidayPlanNextYear({
  employees,
  branch,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '',
  yearOptions,
  holidayRecords = [],
  onSaveRecords,
  onClose,
}: PrintableHolidayPlanNextYearProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { records: storeRecords } = useHolidayStore();
  const printRef = useRef<HTMLDivElement>(null);
  const companyLogo = useCompanyLogo();

  const upcomingYears = useMemo(
    () => (yearOptions && yearOptions.length > 0 ? yearOptions : getDefaultUpcomingYears(3)),
    [yearOptions]
  );

  const [planningYear, setPlanningYear] = useState(upcomingYears[0]);
  const [editableRecords, setEditableRecords] = useState<HolidayPlanRecord[]>([]);

  useEffect(() => {
    if (!upcomingYears.includes(planningYear)) {
      setPlanningYear(upcomingYears[0]);
    }
  }, [upcomingYears, planningYear]);

  useEffect(() => {
    const active = employees.filter((e) => e.status === 'active');
    const seeded = active.map((emp) => {
      const store = storeRecords.find((r) => r.employeeId === emp.id && r.year === planningYear);
      const prop = holidayRecords.find((r) => r.employeeId === emp.id && r.year === planningYear);
      return {
        employeeId: emp.id,
        year: planningYear,
        daysUsed: 0,
        startDate: prop?.startDate || store?.startDate || '',
        endDate: prop?.endDate || store?.endDate || '',
        notes: prop?.notes || store?.notes || '',
      } satisfies HolidayPlanRecord;
    });
    setEditableRecords(seeded);
    // Intentionally only reseed when year/employees change — not on every store tick while editing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, planningYear]);

  const rows = useMemo(() => {
    return employees
      .filter((e) => e.status === 'active')
      .map((emp, index) => {
        const { daysEntitled } = calculateHolidayEntitlement(emp, planningYear);
        const plan = editableRecords.find((r) => r.employeeId === emp.id && r.year === planningYear);
        return {
          index: index + 1,
          emp,
          daysEntitled,
          startDate: plan?.startDate || '',
          endDate: plan?.endDate || '',
          notes: plan?.notes || '',
        };
      });
  }, [employees, editableRecords, planningYear]);

  const updateField = (
    employeeId: string,
    field: 'startDate' | 'endDate' | 'notes',
    value: string
  ) => {
    setEditableRecords((prev) => {
      const idx = prev.findIndex((r) => r.employeeId === employeeId && r.year === planningYear);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], year: planningYear, [field]: value };
        return next;
      }
      return [
        ...prev,
        {
          employeeId,
          year: planningYear,
          daysUsed: 0,
          startDate: '',
          endDate: '',
          notes: '',
          [field]: value,
        },
      ];
    });
  };

  const handleSave = () => {
    const toSave = editableRecords.filter(
      (r) => r.year === planningYear && (r.startDate || r.endDate || r.notes)
    );
    if (toSave.length === 0) {
      toast.error(pt ? 'Nenhum plano preenchido para guardar' : 'No plan filled to save');
      return;
    }
    for (const r of toSave) {
      if ((r.startDate && !r.endDate) || (!r.startDate && r.endDate)) {
        toast.error(
          pt
            ? 'Preencha início e fim das férias para cada linha planeada'
            : 'Fill both start and end dates for each planned row'
        );
        return;
      }
      if (r.startDate && r.endDate && r.startDate > r.endDate) {
        toast.error(pt ? 'Data de fim deve ser após a data de início' : 'End date must be after start date');
        return;
      }
    }
    // Do not force daysUsed:0 — merge in saveRecords must keep gozo/buyout already recorded for that year.
    onSaveRecords?.(
      toSave.map(({ employeeId, year, startDate, endDate, notes }) => ({
        employeeId,
        year: planningYear || year,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        notes: notes || undefined,
      })) as HolidayPlanRecord[]
    );
    toast.success(
      pt
        ? `Plano de férias ${planningYear} guardado (${toSave.length})`
        : `Holiday plan ${planningYear} saved (${toSave.length})`
    );
  };

  const handlePrint = async () => {
    const content = printRef.current;
    if (!content) return;
    const cloned = content.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('input').forEach((input) => {
      const el = input as HTMLInputElement;
      const span = document.createElement('span');
      span.textContent = el.value || '____________________';
      span.style.display = 'inline-block';
      span.style.minWidth = el.type === 'date' ? '90px' : '120px';
      el.replaceWith(span);
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>${pt ? 'Plano Anual de Férias' : 'Annual Holiday Plan'} ${planningYear}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; padding: 14px; color: #111; }
    .header { display: flex; gap: 16px; align-items: center; margin-bottom: 14px; }
    .logo { width: 64px; height: auto; }
    .header-info { flex: 1; text-align: center; }
    .company-name { font-size: 15px; font-weight: 700; }
    .doc-title { font-size: 13px; font-weight: 700; margin-top: 6px; text-transform: uppercase; color: #1f6b4a; }
    .year { font-size: 12px; font-weight: 700; color: #1f6b4a; }
    .hint { margin: 8px 0 12px; font-size: 9px; color: #444; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #222; padding: 5px 4px; vertical-align: middle; }
    th { background: #1f6b4a; color: #fff; font-size: 9px; }
    td.left { text-align: left; }
    .footer { margin-top: 28px; display: flex; justify-content: space-between; gap: 24px; }
    .sign { width: 220px; text-align: center; }
    .sign-line { border-top: 1px solid #000; margin-top: 42px; padding-top: 4px; font-size: 9px; }
    .legal { margin-top: 14px; font-size: 8px; color: #555; font-style: italic; }
    @media print { @page { size: landscape; margin: 8mm; } }
  </style>
</head>
<body>${cloned.innerHTML}</body>
</html>`;

    await printHtml(html, { width: 1200, height: 800 });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
        {pt
          ? `Planeamento anual obrigatório (normalmente Nov/Dez). Escolha o ano a planear (${upcomingYears.join(', ')}), imprima para RH preencher, depois introduza as datas e guarde.`
          : `Mandatory annual planning (usually Nov/Dec). Pick the year to plan (${upcomingYears.join(', ')}), print for HR to fill, then enter dates and save.`}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs mb-1 block">{pt ? 'Ano a planear' : 'Year to plan'}</Label>
          <select
            value={planningYear}
            onChange={(e) => setPlanningYear(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm bg-background"
          >
            {upcomingYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={handlePrint} variant="accent">
          <Printer className="h-4 w-4 mr-2" />
          {pt ? 'Imprimir plano' : 'Print plan'}
        </Button>
        {onSaveRecords && (
          <Button onClick={handleSave} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            {pt ? 'Guardar plano no sistema' : 'Save plan to system'}
          </Button>
        )}
        {onClose && (
          <Button onClick={onClose} variant="outline">
            {pt ? 'Fechar' : 'Close'}
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
          {pt
            ? 'Sem funcionários activos para este filtro. Escolha «Todas as filiais» ou outra filial.'
            : 'No active employees for this filter. Choose “All branches” or another branch.'}
        </div>
      ) : (
        <div ref={printRef} className="bg-white text-black p-3 text-xs max-h-[60vh] overflow-auto rounded border">
          <div className="header flex gap-4 items-center mb-3">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="logo" style={{ width: 64 }} />
            ) : null}
            <div className="header-info flex-1 text-center">
              <div className="company-name font-bold text-base">{companyName}</div>
              {companyNif ? <div>NIF: {companyNif}</div> : null}
              {branch ? (
                <div className="text-[10px] mt-1">
                  <strong>{pt ? 'Filial' : 'Branch'}:</strong> {branch.name} ({branch.code})
                </div>
              ) : null}
              <div className="doc-title font-bold uppercase text-sm mt-2 text-emerald-800">
                {pt ? 'Plano Anual de Férias' : 'Annual Holiday Plan'}
              </div>
              <div className="year font-bold text-emerald-800">
                {pt ? 'Ano planeado' : 'Planning year'}: {planningYear}
              </div>
              <div className="text-[10px] text-neutral-500">
                {pt ? 'Elaborado em' : 'Prepared on'}: {new Date().toLocaleDateString('pt-AO')}
              </div>
            </div>
          </div>

          <p className="hint mb-2 text-[10px] text-neutral-600">
            {pt
              ? 'RH: preencha o período planeado (início / fim) e observações para cada trabalhador.'
              : 'HR: fill the planned period (start / end) and notes for each worker.'}
          </p>

          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-emerald-800 text-white">
                <th className="border px-1 py-1 w-8">Nº</th>
                <th className="border px-1 py-1 text-left">{pt ? 'Funcionário' : 'Employee'}</th>
                <th className="border px-1 py-1 text-left">{pt ? 'Departamento' : 'Department'}</th>
                <th className="border px-1 py-1 w-16">{pt ? 'Dias direito' : 'Days due'}</th>
                <th className="border px-1 py-1 w-28">{pt ? 'Início planeado' : 'Planned start'}</th>
                <th className="border px-1 py-1 w-28">{pt ? 'Fim planeado' : 'Planned end'}</th>
                <th className="border px-1 py-1">{pt ? 'Observações / Assinatura' : 'Notes / Signature'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.emp.id}>
                  <td className="border px-1 py-1 text-center">{row.index}</td>
                  <td className="border px-1 py-1 left">
                    <div className="font-medium">
                      {row.emp.firstName} {row.emp.lastName}
                    </div>
                    <div className="text-[10px] text-neutral-500">{row.emp.employeeNumber}</div>
                  </td>
                  <td className="border px-1 py-1 left">{row.emp.department || '—'}</td>
                  <td className="border px-1 py-1 text-center font-semibold">{row.daysEntitled}</td>
                  <td className="border px-1 py-1">
                    <Input
                      type="date"
                      className="h-7 text-[11px]"
                      value={row.startDate}
                      onChange={(e) => updateField(row.emp.id, 'startDate', e.target.value)}
                    />
                  </td>
                  <td className="border px-1 py-1">
                    <Input
                      type="date"
                      className="h-7 text-[11px]"
                      value={row.endDate}
                      onChange={(e) => updateField(row.emp.id, 'endDate', e.target.value)}
                    />
                  </td>
                  <td className="border px-1 py-1">
                    <Input
                      className="h-7 text-[11px]"
                      value={row.notes}
                      placeholder={pt ? 'Obs. / assinatura' : 'Notes / signature'}
                      onChange={(e) => updateField(row.emp.id, 'notes', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="footer mt-8 flex justify-between gap-6">
            <div className="sign text-center w-52">
              <div className="sign-line border-t border-black mt-10 pt-1 text-[10px]">
                {pt ? 'Elaborado por (RH)' : 'Prepared by (HR)'}
              </div>
            </div>
            <div className="sign text-center w-52">
              <div className="sign-line border-t border-black mt-10 pt-1 text-[10px]">
                {pt ? 'Aprovado por (Direcção)' : 'Approved by (Management)'}
              </div>
            </div>
          </div>

          <p className="legal mt-4 text-[9px] italic text-neutral-600">
            {pt
              ? `Plano anual de férias para ${planningYear}, elaborado em ${new Date().getFullYear()} (programação Nov/Dez) — Lei Geral do Trabalho (Lei n.º 12/23).`
              : `Annual holiday plan for ${planningYear}, prepared in ${new Date().getFullYear()} (Nov/Dec scheduling) — General Labor Law (Law No. 12/23).`}
          </p>
        </div>
      )}
    </div>
  );
}
