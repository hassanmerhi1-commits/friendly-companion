import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import type { Employee } from '@/types/employee';
import companyLogo from '@/assets/company-logo.jpg';

interface PrintableHolidayMapProps {
  employees: Employee[];
  companyName?: string;
  companyNif?: string;
  onClose?: () => void;
}

export function PrintableHolidayMap({
  employees,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '5417201524',
  onClose,
}: PrintableHolidayMapProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);

  const t = {
    title: language === 'pt' ? 'MAPA DE FÉRIAS' : 'HOLIDAY MAP',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    department: language === 'pt' ? 'Departamento' : 'Department',
    hireDate: language === 'pt' ? 'Data Admissão' : 'Hire Date',
    yearsWorked: language === 'pt' ? 'Anos Trabalhados' : 'Years Worked',
    daysEntitled: language === 'pt' ? 'Dias de Direito' : 'Days Entitled',
    daysUsed: language === 'pt' ? 'Dias Gozados' : 'Days Used',
    daysRemaining: language === 'pt' ? 'Dias Restantes' : 'Days Remaining',
    print: language === 'pt' ? 'Imprimir Mapa' : 'Print Map',
    preparedBy: language === 'pt' ? 'Elaborado por' : 'Prepared by',
    date: language === 'pt' ? 'Data' : 'Date',
    generatedOn: language === 'pt' ? 'Gerado em' : 'Generated on',
    year: language === 'pt' ? 'Ano' : 'Year',
    legalNote: language === 'pt' 
      ? 'Conforme Lei Geral do Trabalho (Lei n.º 12/23) - 22 dias úteis de férias por ano'
      : 'According to General Labor Law (Law No. 12/23) - 22 working days of vacation per year',
    summary: language === 'pt' ? 'RESUMO' : 'SUMMARY',
    totalDaysEntitled: language === 'pt' ? 'Total Dias de Direito' : 'Total Days Entitled',
    avgYearsService: language === 'pt' ? 'Média Anos de Serviço' : 'Avg Years of Service',
  };

  const currentYear = new Date().getFullYear();
  const activeEmployees = employees.filter(e => e.status === 'active');

  const holidayData = activeEmployees.map(emp => {
    const hireDate = new Date(emp.hireDate);
    const today = new Date();
    const yearsWorked = (today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const daysEntitled = Math.min(Math.floor(yearsWorked) * 22, 22); // 22 days per year, max 22 for current year
    const fullYears = Math.floor(yearsWorked);
    
    return {
      ...emp,
      yearsWorked: fullYears,
      monthsExtra: Math.floor((yearsWorked - fullYears) * 12),
      daysEntitled: yearsWorked >= 1 ? 22 : Math.floor((yearsWorked * 12) * (22 / 12)), // Proportional for first year
      daysUsed: 0, // This would come from a vacation tracking system
      daysRemaining: yearsWorked >= 1 ? 22 : Math.floor((yearsWorked * 12) * (22 / 12)),
    };
  });

  const totalDaysEntitled = holidayData.reduce((sum, e) => sum + e.daysEntitled, 0);
  const avgYears = holidayData.length > 0 
    ? holidayData.reduce((sum, e) => sum + e.yearsWorked, 0) / holidayData.length 
    : 0;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t.title} - ${currentYear}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 10px; padding: 20px; }
          .header { display: flex; align-items: center; margin-bottom: 25px; gap: 20px; }
          .logo { width: 80px; height: auto; }
          .header-info { flex: 1; text-align: center; }
          .company-name { font-size: 18px; font-weight: bold; }
          .document-title { font-size: 16px; font-weight: bold; margin: 15px 0; text-transform: uppercase; color: #27ae60; }
          .year { font-size: 14px; color: #27ae60; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #333; padding: 6px 4px; text-align: center; }
          th { background: #27ae60; color: white; font-weight: bold; }
          td:first-child, td:nth-child(2), td:nth-child(3) { text-align: left; }
          .totals-row { background: #ecf0f1; font-weight: bold; }
          .days-entitled { background: #d5f5e3; font-weight: bold; }
          .days-remaining { background: #abebc6; font-weight: bold; color: #27ae60; }
          .summary-box { background: #eafaf1; border: 2px solid #27ae60; padding: 15px; margin-top: 20px; width: 300px; }
          .summary-box h3 { color: #27ae60; margin-bottom: 10px; }
          .summary-item { display: flex; justify-content: space-between; margin: 5px 0; }
          .footer { margin-top: 40px; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
          .legal-note { font-size: 8px; font-style: italic; margin-top: 20px; text-align: center; color: #666; }
          @media print {
            @page { size: landscape; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <Button onClick={handlePrint} variant="accent">
          <Printer className="h-4 w-4 mr-2" />
          {t.print}
        </Button>
        {onClose && (
          <Button onClick={onClose} variant="outline">
            {language === 'pt' ? 'Fechar' : 'Close'}
          </Button>
        )}
      </div>

      <div ref={printRef} className="bg-white text-black p-4 text-xs max-h-[60vh] overflow-auto">
        <div className="header">
          <img src={companyLogo} alt="Logo" className="logo" style={{ width: '80px' }} />
          <div className="header-info">
            <div className="company-name">{companyName}</div>
            <div>NIF: {companyNif}</div>
            <div className="document-title">{t.title}</div>
            <div className="year">{t.year}: {currentYear}</div>
            <div style={{ fontSize: '9px', color: '#666' }}>{t.generatedOn}: {new Date().toLocaleDateString('pt-AO')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '20px' }}>Nº</th>
              <th>{t.employee}</th>
              <th>{t.department}</th>
              <th>{t.hireDate}</th>
              <th>{t.yearsWorked}</th>
              <th className="days-entitled">{t.daysEntitled}</th>
              <th>{t.daysUsed}</th>
              <th className="days-remaining">{t.daysRemaining}</th>
            </tr>
          </thead>
          <tbody>
            {holidayData.map((emp, idx) => (
              <tr key={emp.id}>
                <td>{idx + 1}</td>
                <td>{emp.firstName} {emp.lastName}</td>
                <td>{emp.department}</td>
                <td>{new Date(emp.hireDate).toLocaleDateString('pt-AO')}</td>
                <td>{emp.yearsWorked} {language === 'pt' ? 'anos' : 'years'} {emp.monthsExtra > 0 ? `${emp.monthsExtra}m` : ''}</td>
                <td className="days-entitled">{emp.daysEntitled}</td>
                <td>{emp.daysUsed}</td>
                <td className="days-remaining">{emp.daysRemaining}</td>
              </tr>
            ))}
          </tbody>
        </table>

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
            <span>{t.avgYearsService}:</span>
            <strong>{avgYears.toFixed(1)}</strong>
          </div>
        </div>

        <div className="legal-note">
          {t.legalNote}
        </div>

        <div className="footer">
          <div className="signature-box">
            <div className="signature-line">{t.preparedBy}</div>
            <div style={{ marginTop: '5px' }}>{t.date}: ___/___/______</div>
          </div>
        </div>
      </div>
    </div>
  );
}
