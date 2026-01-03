import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Save } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { printHtml } from '@/lib/print';
import type { Employee } from '@/types/employee';
import type { Branch } from '@/types/branch';
import companyLogo from '@/assets/distri-good-logo.jpeg';

export interface HolidayRecord {
  employeeId: string;
  year: number;
  daysUsed: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

interface PrintableHolidayMapProps {
  employees: Employee[];
  branch?: Branch;
  companyName?: string;
  companyNif?: string;
  year?: number;
  holidayRecords?: HolidayRecord[];
  onSaveRecords?: (records: HolidayRecord[]) => void;
  onClose?: () => void;
}

export function PrintableHolidayMap({
  employees,
  branch,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '5402155682',
  year = new Date().getFullYear(),
  holidayRecords = [],
  onSaveRecords,
  onClose,
}: PrintableHolidayMapProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [editableRecords, setEditableRecords] = useState<HolidayRecord[]>(holidayRecords);
  const [selectedYear, setSelectedYear] = useState(year);
  const [logoBase64, setLogoBase64] = useState<string>('');

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setLogoBase64(canvas.toDataURL('image/jpeg'));
      }
    };
    img.src = companyLogo;
  }, []);

  const t = {
    title: language === 'pt' ? 'MAPA DE FÉRIAS' : 'HOLIDAY MAP',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    department: language === 'pt' ? 'Departamento' : 'Department',
    hireDate: language === 'pt' ? 'Data Admissão' : 'Hire Date',
    yearsWorked: language === 'pt' ? 'Tempo Serviço' : 'Service Time',
    daysEntitled: language === 'pt' ? 'Dias de Direito' : 'Days Entitled',
    daysUsed: language === 'pt' ? 'Dias Gozados' : 'Days Used',
    daysRemaining: language === 'pt' ? 'Dias Restantes' : 'Days Remaining',
    holidayPeriod: language === 'pt' ? 'Período de Férias' : 'Holiday Period',
    print: language === 'pt' ? 'Imprimir Mapa' : 'Print Map',
    save: language === 'pt' ? 'Guardar Alterações' : 'Save Changes',
    preparedBy: language === 'pt' ? 'Elaborado por' : 'Prepared by',
    date: language === 'pt' ? 'Data' : 'Date',
    generatedOn: language === 'pt' ? 'Gerado em' : 'Generated on',
    year: language === 'pt' ? 'Ano' : 'Year',
    legalNote: language === 'pt' 
      ? 'Conforme Lei Geral do Trabalho (Lei n.º 12/23) - Art. 130: 22 dias úteis de férias por ano. O direito a férias reporta-se ao trabalho do ano civil anterior e vence a 1 de Janeiro. No ano de admissão: 2 dias úteis por cada mês completo, mínimo 6 dias.'
      : 'According to General Labor Law (Law No. 12/23) - Art. 130: 22 working days of vacation per year. The right to vacation refers to work in the previous calendar year and is due on January 1st. In the year of admission: 2 working days for each full month, minimum 6 days.',
    summary: language === 'pt' ? 'RESUMO' : 'SUMMARY',
    totalDaysEntitled: language === 'pt' ? 'Total Dias de Direito' : 'Total Days Entitled',
    totalDaysUsed: language === 'pt' ? 'Total Dias Gozados' : 'Total Days Used',
    totalDaysRemaining: language === 'pt' ? 'Total Dias Restantes' : 'Total Days Remaining',
    firstYear: language === 'pt' ? '1º Ano' : '1st Year',
    selectYear: language === 'pt' ? 'Seleccionar Ano' : 'Select Year',
  };

  const activeEmployees = employees.filter(e => e.status === 'active');

  // Calculate holiday entitlement based on Angolan Labor Law (Lei 12/23)
  const calculateHolidayData = (emp: Employee) => {
    const hireDate = new Date(emp.hireDate);
    const referenceDate = new Date(selectedYear, 0, 1); // January 1st of selected year
    const endOfPreviousYear = new Date(selectedYear - 1, 11, 31); // December 31st of previous year
    
    // Check if employee was hired before the selected year
    const wasHiredBeforeYear = hireDate < referenceDate;
    
    // Calculate years and months of service until end of previous year
    let yearsWorked = 0;
    let monthsWorked = 0;
    let isFirstYear = false;
    let daysEntitled = 0;
    
    if (wasHiredBeforeYear) {
      // Employee worked in previous year - entitled to full 22 days or proportional
      const hireYear = hireDate.getFullYear();
      
      if (hireYear < selectedYear - 1) {
        // Worked full previous year - entitled to 22 days
        daysEntitled = 22;
        yearsWorked = selectedYear - hireYear;
      } else {
        // Was hired in the previous year - proportional calculation
        // 2 days per complete month worked in the previous year
        isFirstYear = true;
        const monthsInPreviousYear = 12 - hireDate.getMonth();
        daysEntitled = Math.max(6, monthsInPreviousYear * 2); // Minimum 6 days
        if (daysEntitled > 22) daysEntitled = 22;
        yearsWorked = 0;
        monthsWorked = monthsInPreviousYear;
      }
    } else {
      // Hired in current year - rights vest on July 1st
      isFirstYear = true;
      const vestingDate = new Date(selectedYear, 6, 1); // July 1st
      const today = new Date();
      
      if (today >= vestingDate && hireDate < vestingDate) {
        // Calculate months from hire date to June 30th
        const monthsWorkedFirstHalf = Math.max(0, 6 - hireDate.getMonth());
        daysEntitled = Math.max(6, monthsWorkedFirstHalf * 2);
        if (daysEntitled > 22) daysEntitled = 22;
        monthsWorked = monthsWorkedFirstHalf;
      } else {
        // Rights not yet vested
        daysEntitled = 0;
        monthsWorked = 0;
      }
    }

    // Get used days from records
    const record = editableRecords.find(r => r.employeeId === emp.id && r.year === selectedYear);
    const daysUsed = record?.daysUsed || 0;
    
    return {
      ...emp,
      yearsWorked,
      monthsWorked,
      isFirstYear,
      daysEntitled,
      daysUsed,
      daysRemaining: Math.max(0, daysEntitled - daysUsed),
      startDate: record?.startDate || '',
      endDate: record?.endDate || '',
    };
  };

  const holidayData = activeEmployees.map(calculateHolidayData);

  const totalDaysEntitled = holidayData.reduce((sum, e) => sum + e.daysEntitled, 0);
  const totalDaysUsed = holidayData.reduce((sum, e) => sum + e.daysUsed, 0);
  const totalDaysRemaining = holidayData.reduce((sum, e) => sum + e.daysRemaining, 0);

  const handleDaysUsedChange = (employeeId: string, daysUsed: number) => {
    setEditableRecords(prev => {
      const existing = prev.findIndex(r => r.employeeId === employeeId && r.year === selectedYear);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], daysUsed };
        return updated;
      }
      return [...prev, { employeeId, year: selectedYear, daysUsed }];
    });
  };

  const handleDateChange = (employeeId: string, field: 'startDate' | 'endDate', value: string) => {
    setEditableRecords(prev => {
      const existing = prev.findIndex(r => r.employeeId === employeeId && r.year === selectedYear);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], [field]: value };
        return updated;
      }
      return [...prev, { employeeId, year: selectedYear, daysUsed: 0, [field]: value }];
    });
  };

  const handleSave = () => {
    if (onSaveRecords) {
      onSaveRecords(editableRecords);
    }
  };

  const handlePrint = async () => {
    const content = printRef.current;
    if (!content) return;

    const clonedContent = content.cloneNode(true) as HTMLElement;
    const logoImg = clonedContent.querySelector('img.logo') as HTMLImageElement;
    if (logoImg && logoBase64) logoImg.src = logoBase64;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t.title} - ${selectedYear}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 9px; padding: 15px; }
          .header { display: flex; align-items: center; margin-bottom: 20px; gap: 20px; }
          .logo { width: 70px; height: auto; }
          .header-info { flex: 1; text-align: center; }
          .company-name { font-size: 16px; font-weight: bold; }
          .branch-info { font-size: 10px; margin-top: 5px; }
          .document-title { font-size: 14px; font-weight: bold; margin: 10px 0; text-transform: uppercase; color: #27ae60; }
          .year { font-size: 12px; color: #27ae60; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th, td { border: 1px solid #333; padding: 4px 3px; text-align: center; font-size: 8px; }
          th { background: #27ae60; color: white; font-weight: bold; }
          td:nth-child(2), td:nth-child(3) { text-align: left; }
          .first-year { background: #fef9e7; }
          .days-entitled { background: #d5f5e3; font-weight: bold; }
          .days-remaining { background: #abebc6; font-weight: bold; color: #27ae60; }
          .no-entitlement { color: #999; }
          .summary-box { background: #eafaf1; border: 2px solid #27ae60; padding: 12px; margin-top: 15px; display: inline-block; }
          .summary-box h3 { color: #27ae60; margin-bottom: 8px; font-size: 11px; }
          .summary-item { display: flex; justify-content: space-between; margin: 4px 0; gap: 20px; }
          .footer { margin-top: 30px; }
          .signature-box { width: 180px; text-align: center; display: inline-block; }
          .signature-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 5px; }
          .legal-note { font-size: 7px; font-style: italic; margin-top: 15px; text-align: justify; color: #666; max-width: 600px; }
          .bottom-section { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; }
          @media print {
            @page { size: landscape; margin: 8mm; }
          }
        </style>
      </head>
      <body>
        ${clonedContent.innerHTML}
      </body>
      </html>
    `;

    await printHtml(html, { width: 1200, height: 800 });
  };

  // Generate year options (current year and 5 years back)
  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div>
      <div className="flex flex-wrap gap-4 items-end mb-4">
        <div>
          <Label className="text-sm mb-1 block">{t.selectYear}</Label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border rounded px-3 py-2 text-sm"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <Button onClick={handlePrint} variant="accent">
          <Printer className="h-4 w-4 mr-2" />
          {t.print}
        </Button>
        {onSaveRecords && (
          <Button onClick={handleSave} variant="outline">
            <Save className="h-4 w-4 mr-2" />
            {t.save}
          </Button>
        )}
        {onClose && (
          <Button onClick={onClose} variant="outline">
            {language === 'pt' ? 'Fechar' : 'Close'}
          </Button>
        )}
      </div>

      <div ref={printRef} className="bg-white text-black p-4 text-xs max-h-[60vh] overflow-auto">
        <div className="header">
          <img src={companyLogo} alt="Logo" className="logo" style={{ width: '70px' }} />
          <div className="header-info">
            <div className="company-name">{companyName}</div>
            <div>NIF: {companyNif}</div>
            {branch && (
              <div className="branch-info">
                <strong>{language === 'pt' ? 'Filial' : 'Branch'}:</strong> {branch.name} ({branch.code})<br/>
                {branch.address}<br/>
                {branch.city}, {branch.province}
              </div>
            )}
            <div className="document-title">{t.title}</div>
            <div className="year">{t.year}: {selectedYear}</div>
            <div style={{ fontSize: '8px', color: '#666' }}>{t.generatedOn}: {new Date().toLocaleDateString('pt-AO')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '20px' }}>Nº</th>
              <th style={{ width: '150px' }}>{t.employee}</th>
              <th style={{ width: '100px' }}>{t.department}</th>
              <th style={{ width: '80px' }}>{t.hireDate}</th>
              <th style={{ width: '80px' }}>{t.yearsWorked}</th>
              <th style={{ width: '60px' }} className="days-entitled">{t.daysEntitled}</th>
              <th style={{ width: '60px' }}>{t.daysUsed}</th>
              <th style={{ width: '60px' }} className="days-remaining">{t.daysRemaining}</th>
              <th style={{ width: '160px' }}>{t.holidayPeriod}</th>
            </tr>
          </thead>
          <tbody>
            {holidayData.map((emp, idx) => (
              <tr key={emp.id} className={emp.isFirstYear ? 'first-year' : ''}>
                <td>{idx + 1}</td>
                <td style={{ textAlign: 'left' }}>
                  {emp.firstName} {emp.lastName}
                  {emp.isFirstYear && <span style={{ fontSize: '7px', color: '#f39c12' }}> ({t.firstYear})</span>}
                </td>
                <td style={{ textAlign: 'left' }}>{emp.department}</td>
                <td>{new Date(emp.hireDate).toLocaleDateString('pt-AO')}</td>
                <td>
                  {emp.yearsWorked > 0 
                    ? `${emp.yearsWorked} ${language === 'pt' ? 'anos' : 'yrs'}` 
                    : `${emp.monthsWorked} ${language === 'pt' ? 'meses' : 'mos'}`}
                </td>
                <td className={emp.daysEntitled === 0 ? 'no-entitlement' : 'days-entitled'}>
                  {emp.daysEntitled}
                </td>
                <td>
                  <Input
                    type="number"
                    min="0"
                    max={emp.daysEntitled}
                    value={emp.daysUsed}
                    onChange={(e) => handleDaysUsedChange(emp.id, Number(e.target.value))}
                    className="w-14 h-6 text-xs p-1 text-center print:border-none print:bg-transparent"
                  />
                </td>
                <td className="days-remaining">{emp.daysRemaining}</td>
                <td>
                  <div className="flex gap-1 items-center text-xs">
                    <Input
                      type="date"
                      value={emp.startDate}
                      onChange={(e) => handleDateChange(emp.id, 'startDate', e.target.value)}
                      className="w-24 h-6 text-xs p-1 print:border-none print:bg-transparent"
                    />
                    <span>-</span>
                    <Input
                      type="date"
                      value={emp.endDate}
                      onChange={(e) => handleDateChange(emp.id, 'endDate', e.target.value)}
                      className="w-24 h-6 text-xs p-1 print:border-none print:bg-transparent"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bottom-section">
          <div className="summary-box">
            <h3>{t.summary}</h3>
            <div className="summary-item">
              <span>{language === 'pt' ? 'Total Funcionários' : 'Total Employees'}:</span>
              <strong>{holidayData.length}</strong>
            </div>
            <div className="summary-item">
              <span>{t.totalDaysEntitled}:</span>
              <strong>{totalDaysEntitled}</strong>
            </div>
            <div className="summary-item">
              <span>{t.totalDaysUsed}:</span>
              <strong>{totalDaysUsed}</strong>
            </div>
            <div className="summary-item">
              <span>{t.totalDaysRemaining}:</span>
              <strong style={{ color: '#27ae60' }}>{totalDaysRemaining}</strong>
            </div>
          </div>

          <div className="footer">
            <div className="signature-box">
              <div className="signature-line">{t.preparedBy}</div>
              <div style={{ marginTop: '5px' }}>{t.date}: ___/___/______</div>
            </div>
          </div>
        </div>

        <div className="legal-note">
          {t.legalNote}
        </div>
      </div>
    </div>
  );
}
