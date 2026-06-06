import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Umbrella, FileWarning } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { HolidaysTab } from '@/components/employee-profile/HolidaysTab';
import { DisciplinaryTab } from '@/components/employee-profile/DisciplinaryTab';

interface RHTabProps {
  employeeId: string;
}

export function RHTab({ employeeId }: RHTabProps) {
  const { language } = useLanguage();
  const pt = language === 'pt';
  const [subTab, setSubTab] = useState('holidays');

  return (
    <Tabs
      value={subTab}
      onValueChange={setSubTab}
      className="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <TabsList className="h-8 w-fit shrink-0 mb-2">
        <TabsTrigger value="holidays" className="text-xs gap-1.5 h-7 px-3">
          <Umbrella className="h-3.5 w-3.5" />
          {pt ? 'Férias' : 'Holidays'}
        </TabsTrigger>
        <TabsTrigger value="disciplinary" className="text-xs gap-1.5 h-7 px-3">
          <FileWarning className="h-3.5 w-3.5" />
          {pt ? 'Disciplina' : 'Disciplinary'}
        </TabsTrigger>
      </TabsList>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {subTab === 'holidays' && <HolidaysTab employeeId={employeeId} />}
        {subTab === 'disciplinary' && <DisciplinaryTab employeeId={employeeId} />}
      </div>
    </Tabs>
  );
}
