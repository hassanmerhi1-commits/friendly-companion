import { ReactNode } from 'react';

interface AttendanceTablePanelProps {
  toolbar: ReactNode;
  children: ReactNode;
}

/** Fixed toolbar + single scroll region (same pattern as Payroll History). */
export function AttendanceTablePanel({ toolbar, children }: AttendanceTablePanelProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full w-full overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="shrink-0 border-b border-border/50 bg-card">{toolbar}</div>
      <div className="flex-1 min-h-0 overflow-auto overscroll-contain">{children}</div>
    </div>
  );
}

export const ATTENDANCE_TH =
  'px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase whitespace-nowrap';
export const ATTENDANCE_TH_CENTER = `${ATTENDANCE_TH} text-center`;
export const ATTENDANCE_TH_RIGHT = `${ATTENDANCE_TH} text-right`;
export const ATTENDANCE_THEAD = 'sticky top-0 z-10 bg-muted/95 backdrop-blur-sm border-b';
export const ATTENDANCE_TD = 'px-3 py-2 align-middle';
export const ATTENDANCE_TBODY = 'divide-y divide-border';
