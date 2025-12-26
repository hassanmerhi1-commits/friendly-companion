import { useState, useRef } from "react";
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
import { toast } from "sonner";

type DocumentType = 'advertencia' | 'ferias' | 'disciplinar' | 'suspensao';

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

const Documents = () => {
  const { language } = useLanguage();
  const { employees } = useEmployeeStore();
  const { branches } = useBranchStore();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [selectedType, setSelectedType] = useState<DocumentType>('advertencia');
  const [documentData, setDocumentData] = useState<DocumentData>({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    details: '',
  });
  const [previewOpen, setPreviewOpen] = useState(false);

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
    
    // Document content
    companyName: 'DISTRI-GOOI, LDA',
    companyNif: 'NIF: 5417201524',
    legalBasis: language === 'pt' ? 'Base Legal' : 'Legal Basis',
  };

  const documentTypes: { type: DocumentType; icon: React.ReactNode; label: string; desc: string }[] = [
    { type: 'advertencia', icon: <AlertTriangle className="h-5 w-5" />, label: t.advertencia, desc: t.advertenciaDesc },
    { type: 'ferias', icon: <Calendar className="h-5 w-5" />, label: t.ferias, desc: t.feriasDesc },
    { type: 'disciplinar', icon: <FileText className="h-5 w-5" />, label: t.disciplinar, desc: t.disciplinarDesc },
    { type: 'suspensao', icon: <UserX className="h-5 w-5" />, label: t.suspensao, desc: t.suspensaoDesc },
  ];

  const selectedEmployee = employees.find(e => e.id === documentData.employeeId);
  const companyBranch = branches.find(b => b.isHeadquarters) || branches[0];

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t[selectedType]}</title>
        <style>
          body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 40px; }
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
      <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
            <div className="header">
              <div className="company-name">{t.companyName}</div>
              <div>{t.companyNif}</div>
              {companyBranch && <div>{companyBranch.address}, {companyBranch.city}</div>}
            </div>
            <div className="document-title">ADVERTÊNCIA DISCIPLINAR</div>
            <div className="content">
              <div className="section">
                <p>Luanda, {today}</p>
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
            <div className="header">
              <div className="company-name">{t.companyName}</div>
              <div>{t.companyNif}</div>
            </div>
            <div className="document-title">GUIA DE FÉRIAS</div>
            <div className="content">
              <div className="section">
                <p>Luanda, {today}</p>
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
            <div className="header">
              <div className="company-name">{t.companyName}</div>
              <div>{t.companyNif}</div>
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
            <div className="header">
              <div className="company-name">{t.companyName}</div>
              <div>{t.companyNif}</div>
            </div>
            <div className="document-title">CARTA DE SUSPENSÃO</div>
            <div className="content">
              <div className="section">
                <p>Luanda, {today}</p>
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

  const isFormValid = documentData.employeeId && documentData.date && documentData.reason;

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t.title}</h1>
          <p className="text-muted-foreground mt-1">{t.subtitle}</p>
        </div>
      </div>

      {/* Document Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default Documents;
