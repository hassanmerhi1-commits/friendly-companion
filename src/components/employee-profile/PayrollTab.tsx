import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, HandCoins } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { usePayrollStore } from '@/stores/payroll-store';
import { PayrollHistoryTab } from '@/components/employee-profile/PayrollHistoryTab';
import { EarlyPaymentsTab } from '@/components/employee-profile/EarlyPaymentsTab';

interface PayrollTabProps {
  employeeId: string;
}

export function PayrollTab({ employeeId }: PayrollTabProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const { periods, entries } = usePayrollStore();
  const [subTab, setSubTab] = useState('history');

  const { historyCount, earlyCount } = useMemo(() => {
    const periodIdsWithEntry = new Set(
      entries.filter((e) => e.employeeId === employeeId).map((e) => e.payrollPeriodId)
    );
    const historyCount = periods.filter((p) => periodIdsWithEntry.has(p.id)).length;
    const earlyCount = entries.filter((e) => e.employeeId === employeeId && e.paidEarly).length;
    return { historyCount, earlyCount };
  }, [periods, entries, employeeId]);

  return (
    <Tabs
      value={subTab}
      onValueChange={setSubTab}
      className="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <TabsList className="h-8 w-fit shrink-0 mb-2">
        <TabsTrigger value="history" className="text-xs gap-1.5 h-7 px-3">
          <Wallet className="h-3.5 w-3.5" />
          {pt ? 'Histórico salarial' : 'Salary history'}
          {historyCount > 0 && (
            <span className="ml-1 rounded bg-muted px-1 text-[10px] font-mono">{historyCount}</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="early" className="text-xs gap-1.5 h-7 px-3">
          <HandCoins className="h-3.5 w-3.5" />
          {pt ? 'Pagamentos antecipados' : 'Early payments'}
          {earlyCount > 0 && (
            <span className="ml-1 rounded bg-muted px-1 text-[10px] font-mono">{earlyCount}</span>
          )}
        </TabsTrigger>
      </TabsList>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {subTab === 'history' && <PayrollHistoryTab employeeId={employeeId} variant="slim" />}
        {subTab === 'early' && <EarlyPaymentsTab employeeId={employeeId} />}
      </div>
    </Tabs>
  );
}
