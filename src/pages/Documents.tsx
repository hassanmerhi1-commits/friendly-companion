import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, FileText, Calendar, UserX, Printer, Download, Plus } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useEmployeeStore } from "@/stores/employee-store";
import { useBranchStore } from "@/stores/branch-store";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "sonner";
import { printHtml } from "@/lib/print";
import companyLogo from '@/assets/distri-good-logo.jpeg';

type DocumentType = 'advertencia' | 'ferias' | 'disciplinar' | 'suspensao' | 'contrato';

interface DocumentData {
  employeeId: string;
  date: string;
  reason: string;
  details: string;
  duration?: string;
  startDate?: string;
  endDate?: string;
  returnDate?: string;
  witnessName?: string;
  infraction?: string;
}

interface ContractData {
  workerName: string;
  workerNationality: string;
  workerIdNumber: string;
  workerIdExpiry: string;
  workerIdIssuer: string;
  workerAddress: string;
  workerMunicipality: string;
  workerProvince: string;
  position: string;
  department: string;
  workLocation: string;
  contractStartDate: string;
  contractEndDate: string;
  baseSalary: string;
  foodAllowance: string;
  transportAllowance: string;
  workHoursStart: string;
  workHoursEnd: string;
  workDays: string;
}

const Documents = () => {
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { branches } = useBranchStore();
  const { settings } = useSettingsStore();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [selectedType, setSelectedType] = useState<DocumentType>('advertencia');
  const [documentData, setDocumentData] = useState<DocumentData>({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    details: '',
  });
  const [contractData, setContractData] = useState<ContractData>({
    workerName: '',
    workerNationality: 'Angolana',
    workerIdNumber: '',
    workerIdExpiry: '',
    workerIdIssuer: '',
    workerAddress: '',
    workerMunicipality: '',
    workerProvince: 'Luanda',
    position: '',
    department: '',
    workLocation: '',
    contractStartDate: new Date().toISOString().split('T')[0],
    contractEndDate: '',
    baseSalary: '',
    foodAllowance: '',
    transportAllowance: '',
    workHoursStart: '08:00',
    workHoursEnd: '17:00',
    workDays: 'Segunda a Sexta-feira',
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const contractPrintRef = useRef<HTMLDivElement>(null);
  const [logoBase64, setLogoBase64] = useState<string>('');

  // Convert logo to base64 for print window
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
    title: language === 'pt' ? 'Documentos Disciplinares' : 'Disciplinary Documents',
    subtitle: language === 'pt' ? 'Gerar documentos oficiais para gestão de recursos humanos' : 'Generate official HR management documents',
    selectEmployee: language === 'pt' ? 'Selecionar Funcionário' : 'Select Employee',
    date: language === 'pt' ? 'Data' : 'Date',
    reason: language === 'pt' ? 'Motivo' : 'Reason',
    details: language === 'pt' ? 'Detalhes' : 'Details',
    generate: language === 'pt' ? 'Gerar Documento' : 'Generate Document',
    preview: language === 'pt' ? 'Pré-visualizar' : 'Preview',
    print: language === 'pt' ? 'Imprimir' : 'Print',
    download: language === 'pt' ? 'Descarregar' : 'Download',
    noEmployees: language === 'pt' ? 'Adicione funcionários primeiro' : 'Add employees first',
    
    // Document types
    advertencia: language === 'pt' ? 'Advertência' : 'Warning',
    advertenciaDesc: language === 'pt' ? 'Notificação formal de comportamento inadequado' : 'Formal notification of inappropriate behavior',
    ferias: language === 'pt' ? 'Guia de Férias' : 'Vacation Guide',
    feriasDesc: language === 'pt' ? 'Aprovação e programação de férias do funcionário' : 'Employee vacation approval and scheduling',
    disciplinar: language === 'pt' ? 'Processo Disciplinar' : 'Disciplinary Process',
    disciplinarDesc: language === 'pt' ? 'Procedimento formal para infrações graves' : 'Formal procedure for serious infractions',
    suspensao: language === 'pt' ? 'Carta de Suspensão' : 'Suspension Letter',
    suspensaoDesc: language === 'pt' ? 'Suspensão temporária do contrato de trabalho' : 'Temporary suspension of employment contract',
    
    // Form fields
    startDate: language === 'pt' ? 'Data de Início' : 'Start Date',
    endDate: language === 'pt' ? 'Data de Fim' : 'End Date',
    returnDate: language === 'pt' ? 'Data de Retorno' : 'Return Date',
    duration: language === 'pt' ? 'Duração (dias)' : 'Duration (days)',
    witness: language === 'pt' ? 'Testemunha' : 'Witness',
    infraction: language === 'pt' ? 'Infração' : 'Infraction',
    
    // Contract fields
    contrato: language === 'pt' ? 'Contrato de Trabalho' : 'Work Contract',
    contratoDesc: language === 'pt' ? 'Contrato formal de trabalho a termo certo' : 'Formal fixed-term employment contract',
    workerName: language === 'pt' ? 'Nome do Trabalhador' : 'Worker Name',
    nationality: language === 'pt' ? 'Nacionalidade' : 'Nationality',
    idNumber: language === 'pt' ? 'Nº do BI' : 'ID Number',
    idExpiry: language === 'pt' ? 'Validade do BI' : 'ID Expiry',
    idIssuer: language === 'pt' ? 'Emitido por' : 'Issued by',
    address: language === 'pt' ? 'Endereço' : 'Address',
    municipality: language === 'pt' ? 'Município' : 'Municipality',
    province: language === 'pt' ? 'Província' : 'Province',
    position: language === 'pt' ? 'Cargo/Função' : 'Position',
    department: language === 'pt' ? 'Departamento' : 'Department',
    workLocation: language === 'pt' ? 'Local de Trabalho' : 'Work Location',
    contractStart: language === 'pt' ? 'Início do Contrato' : 'Contract Start',
    contractEnd: language === 'pt' ? 'Fim do Contrato' : 'Contract End',
    baseSalary: language === 'pt' ? 'Salário Base (AOA)' : 'Base Salary (AOA)',
    foodAllowance: language === 'pt' ? 'Subsídio de Alimentação (AOA)' : 'Food Allowance (AOA)',
    transportAllowance: language === 'pt' ? 'Subsídio de Transporte (AOA)' : 'Transport Allowance (AOA)',
    workHoursStart: language === 'pt' ? 'Hora de Entrada' : 'Start Time',
    workHoursEnd: language === 'pt' ? 'Hora de Saída' : 'End Time',
    workDays: language === 'pt' ? 'Dias de Trabalho' : 'Work Days',
    
    // Document content
    companyName: 'DISTRI-GOOI, LDA',
    companyNif: 'NIF: 5417201524',
    legalBasis: language === 'pt' ? 'Base Legal' : 'Legal Basis',
  };

  const documentTypes: { type: DocumentType; icon: React.ReactNode; label: string; desc: string }[] = [
    { type: 'contrato', icon: <FileText className="h-5 w-5" />, label: t.contrato, desc: t.contratoDesc },
    { type: 'advertencia', icon: <AlertTriangle className="h-5 w-5" />, label: t.advertencia, desc: t.advertenciaDesc },
    { type: 'ferias', icon: <Calendar className="h-5 w-5" />, label: t.ferias, desc: t.feriasDesc },
    { type: 'disciplinar', icon: <FileText className="h-5 w-5" />, label: t.disciplinar, desc: t.disciplinarDesc },
    { type: 'suspensao', icon: <UserX className="h-5 w-5" />, label: t.suspensao, desc: t.suspensaoDesc },
  ];

  const selectedEmployee = employees.find(e => e.id === documentData.employeeId);

  const headquartersBranch = branches.find(b => b.isHeadquarters) || branches[0];
  const employeeBranch = selectedEmployee?.branchId ? branches.find(b => b.id === selectedEmployee.branchId) : undefined;
  const documentBranch = employeeBranch || headquartersBranch;

  // Branch address shown on documents (defaults to HQ/settings)
  const documentAddress = documentBranch
    ? `${documentBranch.address}, ${documentBranch.city}, ${documentBranch.province}`
    : `${settings.address}, ${settings.municipality}, ${settings.city}, ${settings.province}`;

  const documentLocation = documentBranch?.city || settings.city || settings.province || 'Luanda';

  const handlePrint = async () => {
    const content = printRef.current;
    if (!content) return;

    if (!logoBase64) {
      toast.error(language === 'pt' ? 'A carregar o logotipo, tente novamente...' : 'Logo is loading, try again...');
      return;
    }

    // Clone and replace logo with base64 (ensures it appears in print)
    const clonedContent = content.cloneNode(true) as HTMLElement;
    const logoImg = clonedContent.querySelector('img.logo') as HTMLImageElement | null;
    if (logoImg) logoImg.src = logoBase64;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${t[selectedType]}</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
          .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
          .logo { width: 80px; height: auto; }
          .header-info { flex: 1; text-align: center; }
          .company-name { font-size: 18px; font-weight: bold; }
          .document-title { font-size: 20px; font-weight: bold; margin: 30px 0; text-transform: uppercase; text-align: center; }
          .content { text-align: justify; }
          .section { margin: 20px 0; }
          .field { margin: 10px 0; }
          .signature-section { margin-top: 60px; display: flex; justify-content: space-between; }
          .signature-box { width: 200px; text-align: center; border-top: 1px solid #000; padding-top: 5px; }
          .legal-note { margin-top: 40px; font-size: 12px; font-style: italic; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>${clonedContent.innerHTML}</body>
      </html>
    `;

    await printHtml(html, { delayMs: 700 });
  };

  const handlePrintContract = async () => {
    const content = contractPrintRef.current;
    if (!content) return;

    if (!logoBase64) {
      toast.error(language === 'pt' ? 'A carregar o logotipo, tente novamente...' : 'Logo is loading, try again...');
      return;
    }

    // Clone and replace logo with base64
    const clonedContent = content.cloneNode(true) as HTMLElement;
    const logoImg = clonedContent.querySelector('img.logo') as HTMLImageElement | null;
    if (logoImg) logoImg.src = logoBase64;

    // Print two copies - one for company, one for worker
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Contrato de Trabalho</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 30px; line-height: 1.5; font-size: 11px; }
          .contract-copy { page-break-after: always; }
          .contract-copy:last-child { page-break-after: avoid; }
          .header { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
          .logo { width: 70px; height: auto; }
          .header-info { flex: 1; text-align: center; }
          .company-name { font-size: 16px; font-weight: bold; }
          .document-title { font-size: 14px; font-weight: bold; margin: 20px 0; text-transform: uppercase; text-align: center; }
          .clause { margin: 15px 0; }
          .clause-title { font-weight: bold; }
          .signature-section { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature-box { width: 200px; text-align: center; border-top: 1px solid #000; padding-top: 5px; }
          .copy-label { text-align: right; font-size: 10px; font-style: italic; margin-bottom: 10px; }
          @media print { body { margin: 15px; } .contract-copy { page-break-after: always; } }
        </style>
      </head>
      <body>
        <div class="contract-copy">
          <div class="copy-label">1ª Via - Empregador</div>
          ${clonedContent.innerHTML}
        </div>
        <div class="contract-copy">
          <div class="copy-label">2ª Via - Trabalhador</div>
          ${clonedContent.innerHTML}
        </div>
      </body>
      </html>
    `;

    await printHtml(html, { delayMs: 900 });
  };

  const renderContractContent = () => {
    const startDate = contractData.contractStartDate ? new Date(contractData.contractStartDate).toLocaleDateString('pt-AO') : '___/___/______';
    const endDate = contractData.contractEndDate ? new Date(contractData.contractEndDate).toLocaleDateString('pt-AO') : '___/___/______';
    const totalSalary = (parseFloat(contractData.baseSalary || '0') + parseFloat(contractData.foodAllowance || '0') + parseFloat(contractData.transportAllowance || '0')).toLocaleString('pt-AO');
    
    return (
      <div ref={contractPrintRef} style={{ fontSize: '12px', lineHeight: '1.5' }}>
        <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
          <img src={companyLogo} alt="Logo" className="logo" style={{ width: '70px', height: 'auto' }} />
          <div className="header-info" style={{ flex: 1, textAlign: 'center' }}>
            <div className="company-name">{settings.companyName}</div>
            <div>NIF: {settings.nif}</div>
            <div>{documentAddress}</div>
          </div>
        </div>
        
        <div className="document-title">CONTRATO DE TRABALHO A TERMO CERTO</div>
        
        <div className="content">
          <div className="clause">
            <p><span className="clause-title">CLÁUSULA 1ª - DAS PARTES CONTRATANTES:</span></p>
            <p><strong>PRIMEIRA CONTRATANTE (EMPREGADORA):</strong> {settings.companyName}, sociedade comercial por quotas de direito angolano, com sede em {documentAddress}, contribuinte fiscal nº {settings.nif}.</p>
            <p><strong>SEGUNDA CONTRATANTE (TRABALHADOR/A):</strong> {contractData.workerName || '______________________________'}, de nacionalidade {contractData.workerNationality}, portador(a) do Bilhete de Identidade nº {contractData.workerIdNumber || '_______________'}, válido até {contractData.workerIdExpiry ? new Date(contractData.workerIdExpiry).toLocaleDateString('pt-AO') : '___/___/______'}, passado pelo {contractData.workerIdIssuer || '_______________'}, residente em {contractData.workerAddress || '______________________________'}, Município de {contractData.workerMunicipality || '_______________'}, Província de {contractData.workerProvince}.</p>
          </div>

          <div className="clause">
            <p><span className="clause-title">CLÁUSULA 2ª - DO OBJECTO:</span></p>
            <p>A PRIMEIRA CONTRATANTE admite ao seu serviço a SEGUNDA CONTRATANTE para exercer as funções de <strong>{contractData.position || '_______________'}</strong>, no departamento de <strong>{contractData.department || '_______________'}</strong>.</p>
          </div>

          <div className="clause">
            <p><span className="clause-title">CLÁUSULA 3ª - DO LOCAL DE TRABALHO:</span></p>
            <p>O local de trabalho será em {contractData.workLocation || documentBranch?.address || documentAddress}.</p>
          </div>

          <div className="clause">
            <p><span className="clause-title">CLÁUSULA 4ª - DA DURAÇÃO:</span></p>
            <p>O presente contrato é celebrado a termo certo, com início em {startDate} e termo em {endDate}, podendo ser renovado nos termos da Lei Geral do Trabalho (Lei nº 12/23).</p>
          </div>

          <div className="clause">
            <p><span className="clause-title">CLÁUSULA 5ª - DA RETRIBUIÇÃO:</span></p>
            <p>A SEGUNDA CONTRATANTE terá direito a uma remuneração mensal composta por:</p>
            <p>- Salário Base: {parseFloat(contractData.baseSalary || '0').toLocaleString('pt-AO')} AOA</p>
            <p>- Subsídio de Alimentação: {parseFloat(contractData.foodAllowance || '0').toLocaleString('pt-AO')} AOA</p>
            <p>- Subsídio de Transporte: {parseFloat(contractData.transportAllowance || '0').toLocaleString('pt-AO')} AOA</p>
            <p><strong>Total: {totalSalary} AOA</strong></p>
          </div>

          <div className="clause">
            <p><span className="clause-title">CLÁUSULA 6ª - DO HORÁRIO DE TRABALHO:</span></p>
            <p>O horário de trabalho será de {contractData.workDays}, das {contractData.workHoursStart} às {contractData.workHoursEnd}, com intervalo para almoço, perfazendo 44 horas semanais, nos termos do Art. 95 da LGT.</p>
          </div>

          <div className="clause">
            <p><span className="clause-title">CLÁUSULA 7ª - DOS DEVERES:</span></p>
            <p>A SEGUNDA CONTRATANTE obriga-se a cumprir com zelo, diligência e assiduidade as funções que lhe forem confiadas, bem como a observar as normas internas da empresa e a legislação laboral em vigor.</p>
          </div>

          <div className="clause">
            <p><span className="clause-title">CLÁUSULA 8ª - DO PERÍODO EXPERIMENTAL:</span></p>
            <p>Nos primeiros 60 (sessenta) dias, qualquer das partes pode rescindir o contrato sem aviso prévio nem direito a indemnização.</p>
          </div>

          <div className="clause">
            <p><span className="clause-title">CLÁUSULA 9ª - DAS DISPOSIÇÕES FINAIS:</span></p>
            <p>Aos casos omissos aplica-se o disposto na Lei Geral do Trabalho (Lei nº 12/23) e demais legislação complementar.</p>
          </div>

          <div className="clause">
            <p><span className="clause-title">CLÁUSULA 10ª - DAS VIAS:</span></p>
            <p>O presente contrato é feito em duplicado, ficando uma via em poder de cada uma das partes. DUAS VIAS DO PRESENTE CONTRATO DEVERÃO SER REMETIDAS AO CENTRO DE EMPREGO COMPETENTE.</p>
          </div>

          <div className="clause" style={{ marginTop: '20px' }}>
            <p><span className="clause-title">OBSERVAÇÕES:</span></p>
            <p style={{ borderBottom: '1px solid #000', height: '20px', marginBottom: '8px' }}>&nbsp;</p>
            <p style={{ borderBottom: '1px solid #000', height: '20px', marginBottom: '8px' }}>&nbsp;</p>
            <p style={{ borderBottom: '1px solid #000', height: '20px', marginBottom: '8px' }}>&nbsp;</p>
            <p style={{ borderBottom: '1px solid #000', height: '20px', marginBottom: '8px' }}>&nbsp;</p>
          </div>

          <div style={{ marginTop: '20px', textAlign: 'center' }}>
            <p>{documentLocation}, aos {new Date().toLocaleDateString('pt-AO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="signature-section">
            <div className="signature-box">
              <p style={{ marginTop: '40px' }}>_________________________</p>
              <p>A PRIMEIRA CONTRATANTE</p>
              <p>(Empregador)</p>
            </div>
            <div className="signature-box">
              <p style={{ marginTop: '40px' }}>_________________________</p>
              <p>A SEGUNDA CONTRATANTE</p>
              <p>(Trabalhador/a)</p>
            </div>
          </div>

          <div className="legal-note" style={{ marginTop: '30px', fontSize: '10px' }}>
            <strong>Base Legal:</strong> Lei Geral do Trabalho (Lei nº 12/23), Artigos 14-23 (Contrato de Trabalho a Termo)
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentContent = () => {
    const today = new Date(documentData.date).toLocaleDateString('pt-AO', { 
      day: 'numeric', month: 'long', year: 'numeric' 
    });
    
    if (!selectedEmployee) return null;

    switch (selectedType) {
      case 'advertencia':
        return (
          <div ref={printRef}>
            <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
              <img src={companyLogo} alt="Logo" className="logo" style={{ width: '80px', height: 'auto' }} />
              <div className="header-info" style={{ flex: 1, textAlign: 'center' }}>
                <div className="company-name">{settings.companyName}</div>
                <div>NIF: {settings.nif}</div>
                <div>{documentAddress}</div>
                <div style={{ marginTop: '4px', fontSize: '12px' }}>
                  <strong>{language === 'pt' ? 'Filial:' : 'Branch:'}</strong> {documentBranch?.name || '-'}
                </div>
              </div>
            </div>
            <div className="document-title">ADVERTÊNCIA DISCIPLINAR</div>
            <div className="content">
               <div className="section">
                 <p>{documentLocation}, {today}</p>
               </div>
              <div className="section">
                <p><strong>A:</strong> {selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                <p><strong>Função:</strong> {selectedEmployee.position}</p>
                <p><strong>Departamento:</strong> {selectedEmployee.department}</p>
              </div>
              <div className="section">
                <p><strong>ASSUNTO:</strong> Advertência Disciplinar</p>
              </div>
              <div className="section">
                <p>Pela presente, fica V. Exa. formalmente advertido(a) pelo seguinte motivo:</p>
                <p><strong>{documentData.reason}</strong></p>
                <p>{documentData.details}</p>
              </div>
              <div className="section">
                <p>Esta advertência fica registada no seu processo individual. A reincidência poderá resultar em medidas disciplinares mais severas, nos termos da Lei Geral do Trabalho (Lei n.º 12/23), Artigo 44.</p>
              </div>
              <div className="signature-section">
                <div className="signature-box">O Empregador</div>
                <div className="signature-box">O Trabalhador</div>
              </div>
              <div className="legal-note">
                <strong>{t.legalBasis}:</strong> Lei Geral do Trabalho (Lei n.º 12/23), Artigos 43-46
              </div>
            </div>
          </div>
        );

      case 'ferias':
        return (
          <div ref={printRef}>
            <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
              <img src={companyLogo} alt="Logo" className="logo" style={{ width: '80px', height: 'auto' }} />
              <div className="header-info" style={{ flex: 1, textAlign: 'center' }}>
                <div className="company-name">{settings.companyName}</div>
                <div>NIF: {settings.nif}</div>
                 <div>{documentAddress}</div>
                 <div style={{ marginTop: '4px', fontSize: '12px' }}>
                   <strong>{language === 'pt' ? 'Filial:' : 'Branch:'}</strong> {documentBranch?.name || '-'}
                 </div>
              </div>
            </div>
            <div className="document-title">GUIA DE FÉRIAS</div>
            <div className="content">
               <div className="section">
                 <p>{documentLocation}, {today}</p>
               </div>
              <div className="section">
                <p><strong>Funcionário:</strong> {selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                <p><strong>Função:</strong> {selectedEmployee.position}</p>
                <p><strong>Departamento:</strong> {selectedEmployee.department}</p>
                <p><strong>Data de Admissão:</strong> {new Date(selectedEmployee.hireDate).toLocaleDateString('pt-AO')}</p>
              </div>
              <div className="section">
                <p><strong>PERÍODO DE FÉRIAS</strong></p>
                <p><strong>Início:</strong> {documentData.startDate ? new Date(documentData.startDate).toLocaleDateString('pt-AO') : '___/___/______'}</p>
                <p><strong>Fim:</strong> {documentData.endDate ? new Date(documentData.endDate).toLocaleDateString('pt-AO') : '___/___/______'}</p>
                <p><strong>Duração:</strong> {documentData.duration || '___'} dias úteis</p>
                <p><strong>Data de Retorno:</strong> {documentData.returnDate ? new Date(documentData.returnDate).toLocaleDateString('pt-AO') : '___/___/______'}</p>
              </div>
              <div className="section">
                <p><strong>Observações:</strong></p>
                <p>{documentData.details || 'Sem observações.'}</p>
              </div>
              <div className="section">
                <p>O subsídio de férias será pago conforme Art. 117 da Lei Geral do Trabalho.</p>
              </div>
              <div className="signature-section">
                <div className="signature-box">Recursos Humanos</div>
                <div className="signature-box">O Trabalhador</div>
              </div>
              <div className="legal-note">
                <strong>{t.legalBasis}:</strong> Lei Geral do Trabalho (Lei n.º 12/23), Artigos 115-119
              </div>
            </div>
          </div>
        );

      case 'disciplinar':
        return (
          <div ref={printRef}>
            <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
              <img src={companyLogo} alt="Logo" className="logo" style={{ width: '80px', height: 'auto' }} />
              <div className="header-info" style={{ flex: 1, textAlign: 'center' }}>
                <div className="company-name">{settings.companyName}</div>
                <div>NIF: {settings.nif}</div>
                 <div>{documentAddress}</div>
                 <div style={{ marginTop: '4px', fontSize: '12px' }}>
                   <strong>{language === 'pt' ? 'Filial:' : 'Branch:'}</strong> {documentBranch?.name || '-'}
                 </div>
              </div>
            </div>
            <div className="document-title">PROCESSO DISCIPLINAR</div>
            <div className="content">
              <div className="section">
                <p><strong>PROCESSO N.º:</strong> PD-{new Date().getFullYear()}/{String(Date.now()).slice(-4)}</p>
                <p><strong>Data de Instauração:</strong> {today}</p>
              </div>
              <div className="section">
                <p><strong>ARGUIDO:</strong></p>
                <p>Nome: {selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                <p>Função: {selectedEmployee.position}</p>
                <p>Departamento: {selectedEmployee.department}</p>
              </div>
              <div className="section">
                <p><strong>FACTOS / INFRACÇÃO IMPUTADA:</strong></p>
                <p>{documentData.infraction || documentData.reason}</p>
              </div>
              <div className="section">
                <p><strong>DESCRIÇÃO DETALHADA:</strong></p>
                <p>{documentData.details}</p>
              </div>
              <div className="section">
                <p><strong>NOTIFICAÇÃO:</strong></p>
                <p>Nos termos do Artigo 45 da Lei Geral do Trabalho (Lei n.º 12/23), fica V. Exa. notificado(a) para, no prazo de 5 (cinco) dias úteis, apresentar a sua defesa por escrito relativamente aos factos acima descritos.</p>
              </div>
              <div className="section">
                <p><strong>TESTEMUNHAS (se aplicável):</strong></p>
                <p>{documentData.witnessName || '1. _________________________________'}</p>
              </div>
              <div className="signature-section">
                <div className="signature-box">Instrutor do Processo</div>
                <div className="signature-box">Tomei Conhecimento (Arguido)</div>
              </div>
              <div className="legal-note">
                <strong>{t.legalBasis}:</strong> Lei Geral do Trabalho (Lei n.º 12/23), Artigos 43-46, 204
              </div>
            </div>
          </div>
        );

      case 'suspensao':
        return (
          <div ref={printRef}>
            <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
              <img src={companyLogo} alt="Logo" className="logo" style={{ width: '80px', height: 'auto' }} />
              <div className="header-info" style={{ flex: 1, textAlign: 'center' }}>
                <div className="company-name">{settings.companyName}</div>
                <div>NIF: {settings.nif}</div>
                 <div>{documentAddress}</div>
                 <div style={{ marginTop: '4px', fontSize: '12px' }}>
                   <strong>{language === 'pt' ? 'Filial:' : 'Branch:'}</strong> {documentBranch?.name || '-'}
                 </div>
              </div>
            </div>
            <div className="document-title">CARTA DE SUSPENSÃO</div>
            <div className="content">
               <div className="section">
                 <p>{documentLocation}, {today}</p>
               </div>
              <div className="section">
                <p><strong>A:</strong> {selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                <p><strong>Função:</strong> {selectedEmployee.position}</p>
                <p><strong>Departamento:</strong> {selectedEmployee.department}</p>
              </div>
              <div className="section">
                <p><strong>ASSUNTO:</strong> Suspensão Disciplinar</p>
              </div>
              <div className="section">
                <p>Pela presente, comunicamos a V. Exa. que, na sequência do processo disciplinar instaurado, foi decidido aplicar a sanção de <strong>SUSPENSÃO</strong> do contrato de trabalho, pelo período de <strong>{documentData.duration || '___'} dias</strong>, com perda de retribuição.</p>
              </div>
              <div className="section">
                <p><strong>Motivo da Suspensão:</strong></p>
                <p>{documentData.reason}</p>
                <p>{documentData.details}</p>
              </div>
              <div className="section">
                <p><strong>Período de Suspensão:</strong></p>
                <p>De {documentData.startDate ? new Date(documentData.startDate).toLocaleDateString('pt-AO') : '___/___/______'} a {documentData.endDate ? new Date(documentData.endDate).toLocaleDateString('pt-AO') : '___/___/______'}</p>
                <p>Data de Retorno ao Trabalho: {documentData.returnDate ? new Date(documentData.returnDate).toLocaleDateString('pt-AO') : '___/___/______'}</p>
              </div>
              <div className="section">
                <p>Esta sanção é aplicada nos termos do Artigo 44, alínea c) da Lei Geral do Trabalho, que prevê a suspensão do trabalho com perda de retribuição até 20 dias.</p>
              </div>
              <div className="signature-section">
                <div className="signature-box">A Direcção</div>
                <div className="signature-box">Recebi e Tomei Conhecimento</div>
              </div>
              <div className="legal-note">
                <strong>{t.legalBasis}:</strong> Lei Geral do Trabalho (Lei n.º 12/23), Artigo 44, alínea c)
              </div>
            </div>
          </div>
        );
    }
  };

  const isFormValid = selectedType === 'contrato' 
    ? (contractData.workerName && contractData.position && contractData.baseSalary)
    : (documentData.employeeId && documentData.date && documentData.reason);

  const isContractFormValid = contractData.workerName && contractData.position && contractData.baseSalary;

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.title}</h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
      </div>

      {/* Document Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {documentTypes.map(({ type, icon, label, desc }) => (
          <Card 
            key={type}
            className={`cursor-pointer transition-all hover:shadow-md ${selectedType === type ? 'ring-2 ring-primary border-primary' : ''}`}
            onClick={() => setSelectedType(type)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {icon}
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t[selectedType]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Contract Form */}
          {selectedType === 'contrato' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t.workerName} *</Label>
                  <Input 
                    value={contractData.workerName}
                    onChange={(e) => setContractData(prev => ({ ...prev, workerName: e.target.value }))}
                    placeholder={language === 'pt' ? 'Nome completo do trabalhador' : 'Full worker name'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.nationality}</Label>
                  <Input 
                    value={contractData.workerNationality}
                    onChange={(e) => setContractData(prev => ({ ...prev, workerNationality: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.province}</Label>
                  <Input 
                    value={contractData.workerProvince}
                    onChange={(e) => setContractData(prev => ({ ...prev, workerProvince: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{t.idNumber}</Label>
                  <Input 
                    value={contractData.workerIdNumber}
                    onChange={(e) => setContractData(prev => ({ ...prev, workerIdNumber: e.target.value }))}
                    placeholder="000000000LA000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.idExpiry}</Label>
                  <Input 
                    type="date"
                    value={contractData.workerIdExpiry}
                    onChange={(e) => setContractData(prev => ({ ...prev, workerIdExpiry: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.idIssuer}</Label>
                  <Input 
                    value={contractData.workerIdIssuer}
                    onChange={(e) => setContractData(prev => ({ ...prev, workerIdIssuer: e.target.value }))}
                    placeholder={language === 'pt' ? 'Ex: Arquivo de Identificação Civil' : 'e.g.: Civil ID Archive'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.municipality}</Label>
                  <Input 
                    value={contractData.workerMunicipality}
                    onChange={(e) => setContractData(prev => ({ ...prev, workerMunicipality: e.target.value }))}
                    placeholder={language === 'pt' ? 'Ex: Talatona' : 'e.g.: Talatona'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.address}</Label>
                  <Input 
                    value={contractData.workerAddress}
                    onChange={(e) => setContractData(prev => ({ ...prev, workerAddress: e.target.value }))}
                    placeholder={language === 'pt' ? 'Endereço completo' : 'Full address'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.workLocation}</Label>
                  <Select 
                    value={contractData.workLocation}
                    onValueChange={(value) => setContractData(prev => ({ ...prev, workLocation: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'pt' ? 'Selecionar filial' : 'Select branch'} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={`${branch.name}, ${branch.address}, ${branch.city}`}>
                          {branch.name} - {branch.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>{t.position} *</Label>
                  <Input 
                    value={contractData.position}
                    onChange={(e) => setContractData(prev => ({ ...prev, position: e.target.value }))}
                    placeholder={language === 'pt' ? 'Ex: Assistente Administrativo' : 'e.g.: Administrative Assistant'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.department}</Label>
                  <Input 
                    value={contractData.department}
                    onChange={(e) => setContractData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder={language === 'pt' ? 'Ex: Recursos Humanos' : 'e.g.: Human Resources'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.contractStart}</Label>
                  <Input 
                    type="date"
                    value={contractData.contractStartDate}
                    onChange={(e) => setContractData(prev => ({ ...prev, contractStartDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.contractEnd}</Label>
                  <Input 
                    type="date"
                    value={contractData.contractEndDate}
                    onChange={(e) => setContractData(prev => ({ ...prev, contractEndDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t.baseSalary} *</Label>
                  <Input 
                    type="number"
                    value={contractData.baseSalary}
                    onChange={(e) => setContractData(prev => ({ ...prev, baseSalary: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.foodAllowance}</Label>
                  <Input 
                    type="number"
                    value={contractData.foodAllowance}
                    onChange={(e) => setContractData(prev => ({ ...prev, foodAllowance: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.transportAllowance}</Label>
                  <Input 
                    type="number"
                    value={contractData.transportAllowance}
                    onChange={(e) => setContractData(prev => ({ ...prev, transportAllowance: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t.workHoursStart}</Label>
                  <Input 
                    type="time"
                    value={contractData.workHoursStart}
                    onChange={(e) => setContractData(prev => ({ ...prev, workHoursStart: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.workHoursEnd}</Label>
                  <Input 
                    type="time"
                    value={contractData.workHoursEnd}
                    onChange={(e) => setContractData(prev => ({ ...prev, workHoursEnd: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.workDays}</Label>
                  <Input 
                    value={contractData.workDays}
                    onChange={(e) => setContractData(prev => ({ ...prev, workDays: e.target.value }))}
                    placeholder="Segunda a Sexta-feira"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={!isContractFormValid}>
                      {t.preview}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center justify-between">
                        {t.contrato}
                        <Button onClick={handlePrintContract} variant="accent" size="sm">
                          <Printer className="h-4 w-4 mr-2" />
                          {language === 'pt' ? 'Imprimir (2 vias)' : 'Print (2 copies)'}
                        </Button>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="prose prose-sm max-w-none p-4 bg-white text-black rounded-lg border">
                      {renderContractContent()}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="accent" 
                  disabled={!isContractFormValid}
                  onClick={() => {
                    setPreviewOpen(true);
                    toast.success(language === 'pt' ? 'Contrato gerado!' : 'Contract generated!');
                  }}
                >
                  {t.generate}
                </Button>
              </div>
            </>
          ) : (
            /* Other document types form */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t.selectEmployee}</Label>
                  <Select 
                    value={documentData.employeeId} 
                    onValueChange={(v) => setDocumentData(prev => ({ ...prev, employeeId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectEmployee} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.length === 0 ? (
                        <SelectItem value="none" disabled>{t.noEmployees}</SelectItem>
                      ) : (
                        employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName} - {emp.position}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t.date}</Label>
                  <Input 
                    type="date" 
                    value={documentData.date}
                    onChange={(e) => setDocumentData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              {(selectedType === 'ferias' || selectedType === 'suspensao') && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>{t.startDate}</Label>
                    <Input 
                      type="date"
                      value={documentData.startDate || ''}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.endDate}</Label>
                    <Input 
                      type="date"
                      value={documentData.endDate || ''}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.duration}</Label>
                    <Input 
                      type="number"
                      value={documentData.duration || ''}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, duration: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.returnDate}</Label>
                    <Input 
                      type="date"
                      value={documentData.returnDate || ''}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, returnDate: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {selectedType === 'disciplinar' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.infraction}</Label>
                    <Input 
                      value={documentData.infraction || ''}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, infraction: e.target.value }))}
                      placeholder={language === 'pt' ? 'Ex: Abandono de posto, Insubordinação...' : 'e.g.: Job abandonment, Insubordination...'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.witness}</Label>
                    <Input 
                      value={documentData.witnessName || ''}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, witnessName: e.target.value }))}
                      placeholder={language === 'pt' ? 'Nome da testemunha' : 'Witness name'}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>{t.reason}</Label>
                <Input 
                  value={documentData.reason}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder={language === 'pt' ? 'Motivo principal' : 'Main reason'}
                />
              </div>

              <div className="space-y-2">
                <Label>{t.details}</Label>
                <Textarea 
                  value={documentData.details}
                  onChange={(e) => setDocumentData(prev => ({ ...prev, details: e.target.value }))}
                  placeholder={language === 'pt' ? 'Descrição detalhada dos factos...' : 'Detailed description of facts...'}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={!isFormValid}>
                      {t.preview}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center justify-between">
                        {t[selectedType]}
                        <Button onClick={handlePrint} variant="accent" size="sm">
                          <Printer className="h-4 w-4 mr-2" />
                          {t.print}
                        </Button>
                      </DialogTitle>
                    </DialogHeader>
                    <div className="prose prose-sm max-w-none p-4 bg-white text-black rounded-lg border">
                      {renderDocumentContent()}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  variant="accent" 
                  disabled={!isFormValid}
                  onClick={() => {
                    setPreviewOpen(true);
                    toast.success(language === 'pt' ? 'Documento gerado!' : 'Document generated!');
                  }}
                >
                  {t.generate}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default Documents;
