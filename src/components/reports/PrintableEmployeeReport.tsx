import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { formatAOA } from '@/lib/angola-labor-law';
import type { Employee } from '@/types/employee';
import type { Branch } from '@/types/branch';
import companyLogo from '@/assets/distri-good-logo.jpeg';

interface PrintableEmployeeReportProps {
  employees: Employee[];
  branches: Branch[];
  branch?: Branch;
  companyName?: string;
  companyNif?: string;
  onClose?: () => void;
}

export function PrintableEmployeeReport({
  employees,
  branches,
  branch,
  companyName = 'DISTRI-GOOD, LDA',
  companyNif = '5402155682',
  onClose,
}: PrintableEmployeeReportProps) {
  const { language } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
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
    title: language === 'pt' ? 'RELATÓRIO DE FUNCIONÁRIOS' : 'EMPLOYEE REPORT',
    employee: language === 'pt' ? 'Funcionário' : 'Employee',
    empNumber: language === 'pt' ? 'Nº Func.' : 'Emp. No.',
    department: language === 'pt' ? 'Departamento' : 'Department',
    position: language === 'pt' ? 'Cargo' : 'Position',
    branch: language === 'pt' ? 'Filial' : 'Branch',
    baseSalary: language === 'pt' ? 'Salário Base' : 'Base Salary',
    hireDate: language === 'pt' ? 'Data Admissão' : 'Hire Date',
    status: language === 'pt' ? 'Estado' : 'Status',
    totals: language === 'pt' ? 'TOTAIS' : 'TOTALS',
    print: language === 'pt' ? 'Imprimir Relatório' : 'Print Report',
    preparedBy: language === 'pt' ? 'Elaborado por' : 'Prepared by',
    date: language === 'pt' ? 'Data' : 'Date',
    active: language === 'pt' ? 'Activo' : 'Active',
    inactive: language === 'pt' ? 'Inactivo' : 'Inactive',
    summary: language === 'pt' ? 'RESUMO' : 'SUMMARY',
    totalEmployees: language === 'pt' ? 'Total Funcionários' : 'Total Employees',
    activeEmployees: language === 'pt' ? 'Funcionários Activos' : 'Active Employees',
    totalSalaries: language === 'pt' ? 'Total Salários Base' : 'Total Base Salaries',
    generatedOn: language === 'pt' ? 'Gerado em' : 'Generated on',
  };

  const getBranchName = (branchId?: string) => {
    if (!branchId) return '-';
    const branch = branches.find(b => b.id === branchId);
    return branch ? branch.name : '-';
  };

  const activeCount = employees.filter(e => e.status === 'active').length;
  const totalSalaries = employees.filter(e => e.status === 'active').reduce((sum, e) => sum + e.baseSalary, 0);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    const clonedContent = content.cloneNode(true) as HTMLElement;
    const logoImg = clonedContent.querySelector('img.logo') as HTMLImageElement;
    if (logoImg && logoBase64) logoImg.src = logoBase64;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 10px; padding: 20px; }
          .header { display: flex; align-items: center; margin-bottom: 25px; gap: 20px; }
          .logo { width: 80px; height: auto; }
          .header-info { flex: 1; text-align: center; }
          .company-name { font-size: 18px; font-weight: bold; }
          .document-title { font-size: 16px; font-weight: bold; margin: 15px 0; text-transform: uppercase; color: #2c3e50; }
          .generated { font-size: 10px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #333; padding: 6px 4px; text-align: left; }
          th { background: #3498db; color: white; font-weight: bold; text-align: center; }
          td:nth-child(6) { text-align: right; }
          .totals-row { background: #ecf0f1; font-weight: bold; }
          .status-active { color: #27ae60; font-weight: bold; }
          .status-inactive { color: #e74c3c; }
          .summary-box { background: #f8f9fa; border: 2px solid #3498db; padding: 15px; margin-top: 20px; width: 300px; }
          .summary-box h3 { color: #3498db; margin-bottom: 10px; }
          .summary-item { display: flex; justify-content: space-between; margin: 5px 0; }
          .footer { margin-top: 40px; }
          .signature-box { width: 200px; text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
          @media print {
            @page { size: landscape; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        ${clonedContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for content to render before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
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
            {branch && (
              <>
                <div style={{ marginTop: '5px' }}>
                  <strong>{language === 'pt' ? 'Filial' : 'Branch'}:</strong> {branch.name} ({branch.code})
                </div>
                <div>{branch.address}</div>
                <div>{branch.city}, {branch.province}</div>
              </>
            )}
            <div className="document-title">{t.title}</div>
            <div className="generated">{t.generatedOn}: {new Date().toLocaleDateString('pt-AO')}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '20px' }}>Nº</th>
              <th>{t.empNumber}</th>
              <th>{t.employee}</th>
              <th>{t.department}</th>
              <th>{t.position}</th>
              <th>{t.baseSalary}</th>
              <th>{t.branch}</th>
              <th>{t.hireDate}</th>
              <th>{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => (
              <tr key={emp.id}>
                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                <td>{emp.employeeNumber}</td>
                <td>{emp.firstName} {emp.lastName}</td>
                <td>{emp.department}</td>
                <td>{emp.position}</td>
                <td style={{ textAlign: 'right' }}>{formatAOA(emp.baseSalary)}</td>
                <td>{getBranchName(emp.branchId)}</td>
                <td>{new Date(emp.hireDate).toLocaleDateString('pt-AO')}</td>
                <td className={emp.status === 'active' ? 'status-active' : 'status-inactive'}>
                  {emp.status === 'active' ? t.active : t.inactive}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="summary-box">
          <h3>{t.summary}</h3>
          <div className="summary-item">
            <span>{t.totalEmployees}:</span>
            <strong>{employees.length}</strong>
          </div>
          <div className="summary-item">
            <span>{t.activeEmployees}:</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="summary-item">
            <span>{t.totalSalaries}:</span>
            <strong>{formatAOA(totalSalaries)}</strong>
          </div>
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
