import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, Banknote } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { DeductionsTab } from '@/components/employee-profile/DeductionsTab';
import { LoansTab } from '@/components/employee-profile/LoansTab';

interface FinanceiroTabProps {
  employeeId: string;
}

export function FinanceiroTab({ employeeId }: FinanceiroTabProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const [subTab, setSubTab] = useState('deductions');

  return (
    <Tabs
      value={subTab}
      onValueChange={setSubTab}
      className="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <TabsList className="h-8 w-fit shrink-0 mb-2">
        <TabsTrigger value="deductions" className="text-xs gap-1.5 h-7 px-3">
          <Receipt className="h-3.5 w-3.5" />
          {pt ? 'Deduções' : 'Deductions'}
        </TabsTrigger>
        <TabsTrigger value="loans" className="text-xs gap-1.5 h-7 px-3">
          <Banknote className="h-3.5 w-3.5" />
          {pt ? 'Empréstimos' : 'Loans'}
        </TabsTrigger>
      </TabsList>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {subTab === 'deductions' && <DeductionsTab employeeId={employeeId} />}
        {subTab === 'loans' && <LoansTab employeeId={employeeId} />}
      </div>
    </Tabs>
  );
}
