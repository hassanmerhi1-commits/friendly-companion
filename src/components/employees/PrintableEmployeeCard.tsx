import { forwardRef } from 'react';
import type { Employee } from '@/types/employee';
import { useSettingsStore } from '@/stores/settings-store';
import { useBranchStore } from '@/stores/branch-store';
import { format } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { useCompanyLogo } from '@/hooks/use-company-logo';
import payrollaoLogo from '@/assets/payrollao-logo-preview.png';
import { QRCodeSVG } from 'qrcode.react';
import {
  type CardLanguage,
  getCardIssueDates,
  getCardLabels,
  getContractTypeLabel,
  getEmployeeCardQrValue,
  getStatusLabel,
} from '@/lib/employee-card-labels';

const CARD_W = 340;
const CARD_H = 214;

interface CardFaceProps {
  employee: Employee;
  language: CardLanguage;
  scale?: number;
}

export function EmployeeCardFront({ employee, language, scale = 1 }: CardFaceProps) {
  const { settings } = useSettingsStore();
  const { getBranch } = useBranchStore();
  const companyLogo = useCompanyLogo();
  const branch = employee.branchId ? getBranch(employee.branchId) : null;
  const labels = getCardLabels(language);
  const logoSrc = companyLogo || payrollaoLogo;

  const statusColors =
    employee.status === 'active'
      ? { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#1e3a5f' }
      : employee.status === 'terminated' || employee.status === 'inactive'
        ? { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', color: '#fff' }
        : { bg: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff' };

  return (
    <div
      style={{
        width: CARD_W * scale,
        height: CARD_H * scale,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1f33 50%, #1a2f4a 100%)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div
          className="absolute"
          style={{
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />

        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex-shrink-0 bg-white rounded overflow-hidden flex items-center justify-center"
              style={{ width: '52px', height: '52px', padding: '3px' }}
            >
              <img
                src={logoSrc}
                alt="Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm tracking-wide truncate">
                {settings.companyName || (language === 'pt' ? 'EMPRESA' : 'COMPANY')}
              </h1>
              <p className="text-blue-300 text-[10px] tracking-wider">{labels.idCard}</p>
            </div>
          </div>
          <div
            className="shrink-0 px-2 py-1 rounded text-[9px] font-bold tracking-wider"
            style={{ background: statusColors.bg, color: statusColors.color }}
          >
            {getStatusLabel(employee.status, language)}
          </div>
        </div>

        <div className="px-4 flex gap-4">
          <div
            className="flex-shrink-0 overflow-hidden flex items-center justify-center"
            style={{
              width: '90px',
              height: '110px',
              borderRadius: '8px',
              border: '3px solid rgba(255,255,255,0.2)',
              background: employee.photoUrl
                ? 'transparent'
                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            }}
          >
            {employee.photoUrl ? (
              <img
                src={employee.photoUrl}
                alt={`${employee.firstName} ${employee.lastName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-white text-2xl font-bold">
                {employee.firstName[0]}
                {employee.lastName[0]}
              </div>
            )}
          </div>

          <div className="flex-1 py-0.5 min-w-0">
            <p className="text-white font-bold text-[15px] leading-tight line-clamp-2 mb-1.5">
              {employee.firstName} {employee.lastName}
            </p>
            <p className="text-blue-300 text-[8px] uppercase">{labels.position}</p>
            <p className="text-white text-[11px] font-medium truncate mb-1">{employee.position}</p>
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-blue-300 text-[8px] uppercase">{labels.department}</p>
                <p className="text-white text-[11px] font-medium truncate">{employee.department}</p>
              </div>
              <div className="shrink-0">
                <p className="text-blue-300 text-[8px] uppercase">{labels.number}</p>
                <p className="text-white text-[11px] font-bold">{employee.employeeNumber}</p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 px-4 py-2 flex justify-between items-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <p className="text-blue-200 text-[10px] truncate max-w-[55%]">
            {branch?.name || labels.headquarters}
          </p>
          <p className="text-blue-200 text-[10px] shrink-0">
            {getContractTypeLabel(employee.contractType, language)}
          </p>
        </div>
      </div>
    </div>
  );
}

function BackField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-gray-500 text-[8px] uppercase font-medium leading-none mb-0.5">{label}</p>
      <p className="text-gray-800 text-[11px] font-semibold leading-tight truncate">{value}</p>
    </div>
  );
}

export function EmployeeCardBack({ employee, language, scale = 1 }: CardFaceProps) {
  const { settings } = useSettingsStore();
  const labels = getCardLabels(language);
  const { issued, validUntil } = getCardIssueDates(language);
  const dateLocale = language === 'pt' ? pt : enUS;
  const qrValue = getEmployeeCardQrValue(employee, settings.companyName);

  return (
    <div
      style={{
        width: CARD_W * scale,
        height: CARD_H * scale,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
      }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}
      >
        <div
          className="shrink-0 mx-3 mt-2 rounded-sm"
          style={{
            height: '22px',
            background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
          }}
        />

        <div className="flex-1 min-h-0 px-3 pt-2 pb-1 grid grid-cols-2 gap-x-3 gap-y-2 content-start">
          <BackField label={labels.idDocument} value={employee.bilheteIdentidade || '—'} />
          <BackField label="NIF" value={employee.nif || '—'} />
          <BackField label="INSS" value={employee.inssNumber || '—'} />
          <BackField
            label={labels.hireDate}
            value={format(new Date(employee.hireDate), 'dd/MM/yy', { locale: dateLocale })}
          />
          <BackField label={labels.issued} value={issued} />
          <BackField label={labels.validUntil} value={validUntil} />
        </div>

        <div
          className="shrink-0 flex items-center gap-2 px-3 py-1.5"
          style={{ borderTop: '1px solid #cbd5e1' }}
        >
          <p className="text-gray-400 text-[7px] leading-tight flex-1 min-w-0">
            {labels.disclaimer1}
          </p>
          <div
            className="shrink-0 bg-white p-0.5 rounded"
            style={{ border: '1.5px solid #1e3a5f' }}
          >
            <QRCodeSVG value={qrValue} size={40} level="M" bgColor="#ffffff" fgColor="#1e3a5f" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface PrintableEmployeeCardProps {
  employee: Employee;
  language?: CardLanguage;
}

export const PrintableEmployeeCard = forwardRef<HTMLDivElement, PrintableEmployeeCardProps>(
  ({ employee, language = 'pt' }, ref) => {
    const labels = getCardLabels(language);

    return (
      <div ref={ref} className="print-container p-4 bg-white">
        <style>
          {`
            @media print {
              @page { size: A4 portrait; margin: 10mm; }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-container { width: 100%; }
              .card-container { page-break-inside: avoid; }
            }
          `}
        </style>

        <div className="flex flex-col items-center gap-6">
          <div className="card-container">
            <p className="text-xs text-gray-500 mb-2 text-center font-medium print:hidden">
              {labels.front}
            </p>
            <EmployeeCardFront employee={employee} language={language} />
          </div>
          <div className="card-container">
            <p className="text-xs text-gray-500 mb-2 text-center font-medium print:hidden">
              {labels.back}
            </p>
            <EmployeeCardBack employee={employee} language={language} />
          </div>
          <p className="text-xs text-gray-400 text-center print:hidden">{labels.cutHint}</p>
        </div>
      </div>
    );
  }
);

PrintableEmployeeCard.displayName = 'PrintableEmployeeCard';

interface PrintableEmployeeCardBatchProps {
  employees: Employee[];
  language?: CardLanguage;
}

export const PrintableEmployeeCardBatch = forwardRef<HTMLDivElement, PrintableEmployeeCardBatchProps>(
  ({ employees, language = 'pt' }, ref) => {
    const labels = getCardLabels(language);

    return (
      <div
        ref={ref}
        className="print-container p-4 bg-white fixed -left-[9999px] top-0 w-[210mm] opacity-0 pointer-events-none print:static print:left-auto print:opacity-100"
        aria-hidden
      >
        <style>
          {`
            @media print {
              @page { size: A4 portrait; margin: 8mm; }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-container { width: 100%; display: block !important; }
              .batch-page-break { page-break-after: always; }
              .batch-card-cell { page-break-inside: avoid; }
            }
          `}
        </style>

        <div className="batch-page-break">
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">{labels.batchFronts}</p>
          <div
            className="grid gap-4 justify-items-center"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
            {employees.map((emp) => (
              <div key={`front-${emp.id}`} className="batch-card-cell flex flex-col items-center">
                <p className="text-[10px] text-gray-500 mb-1 truncate max-w-[340px]">
                  {emp.employeeNumber} — {emp.firstName} {emp.lastName}
                </p>
                <EmployeeCardFront employee={emp} language={language} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">{labels.batchBacks}</p>
          <div
            className="grid gap-4 justify-items-center"
            style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
          >
            {employees.map((emp) => (
              <div key={`back-${emp.id}`} className="batch-card-cell flex flex-col items-center">
                <p className="text-[10px] text-gray-500 mb-1 truncate max-w-[340px]">
                  {emp.employeeNumber} — {emp.firstName} {emp.lastName}
                </p>
                <EmployeeCardBack employee={emp} language={language} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

PrintableEmployeeCardBatch.displayName = 'PrintableEmployeeCardBatch';
