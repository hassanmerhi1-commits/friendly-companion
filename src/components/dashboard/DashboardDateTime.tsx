import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { useLanguage } from '@/lib/i18n';

export function DashboardDateTime() {
  const { language } = useLanguage();
  const ptLang = language === 'pt';
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateLabel = format(now, ptLang ? "EEEE" : 'EEEE', {
    locale: ptLang ? pt : undefined,
  });

  const dateShort = format(now, ptLang ? "d 'de' MMMM yyyy" : 'MMMM d, yyyy', {
    locale: ptLang ? pt : undefined,
  });

  const timeLabel = format(now, 'HH:mm:ss');

  return (
    <div className="shrink-0 pt-3 mt-3 border-t border-border/40">
      <div className="flex items-center gap-2 mb-2">
        <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-semibold text-foreground">
          {ptLang ? 'Data & Hora' : 'Date & Time'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 items-stretch">
        {/* Clock — left */}
        <div className="flex flex-col items-center justify-center rounded-lg border border-border/50 bg-muted/20 px-3 py-4 min-h-[11rem]">
          <p className="text-2xl sm:text-3xl font-display font-bold tabular-nums tracking-tight text-foreground">
            {timeLabel}
          </p>
          <p className="text-xs font-medium text-foreground mt-2 capitalize text-center">{dateLabel}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 text-center capitalize">{dateShort}</p>
        </div>

        {/* Calendar — right */}
        <div className="flex items-center justify-center rounded-lg border border-border/50 bg-card p-1 min-h-[11rem] overflow-visible">
          <Calendar
            mode="single"
            selected={now}
            month={now}
            onSelect={() => {}}
            locale={ptLang ? pt : undefined}
            showOutsideDays={false}
            className="p-0 pointer-events-none"
            classNames={{
              months: 'flex flex-col',
              month: 'space-y-1',
              caption: 'flex justify-center relative items-center py-0.5',
              caption_label: 'text-[10px] font-semibold',
              nav: 'hidden',
              table: 'w-full border-collapse',
              head_row: 'flex',
              head_cell: 'text-muted-foreground w-7 font-normal text-[9px] text-center',
              row: 'flex w-full mt-0.5',
              cell: 'h-7 w-7 text-center text-[10px] p-0 relative',
              day: 'h-7 w-7 p-0 font-normal text-[10px] aria-selected:opacity-100',
              day_selected:
                'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
              day_today: 'ring-1 ring-primary/40 font-semibold',
              day_outside: 'text-muted-foreground opacity-30',
              day_disabled: 'text-muted-foreground opacity-50',
            }}
          />
        </div>
      </div>
    </div>
  );
}
