import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { useHRStore } from "@/stores/hr-store";
import { formatAOA } from "@/lib/angola-labor-law";
import { PrintableTerminationLetter } from "./PrintableTerminationLetter";
import { useReactToPrint } from "react-to-print";
import { AlertTriangle, Printer, CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Employee } from "@/types/employee";
import type { TerminationReason } from "@/types/hr";

interface TerminationPackage {
  yearsOfService: number;
  monthsWorked: number;
  averageSalary: number;
  severancePay: number;
  proportionalLeave: number;
  proportional13th: number;
  proportionalHolidaySubsidy: number;
  noticePeriodDays: number;
  noticeCompensation: number;
  unusedLeaveCompensation: number;
  totalPackage: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  terminationDate: string;
  terminationReason: TerminationReason;
  unusedLeaveDays: number;
  terminationPackage: TerminationPackage;
  onSuccess: () => void;
}

export function TerminationDialog({
  open,
  onOpenChange,
  employee,
  terminationDate,
  terminationReason,
  unusedLeaveDays,
  terminationPackage,
  onSuccess,
}: Props) {
  const { language } = useLanguage();
  const { currentUser } = useAuthStore();
  const { processTermination } = useHRStore();
  
  const [reasonDetails, setReasonDetails] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  
  const letterRef = useRef<HTMLDivElement>(null);
  
  const handlePrintLetter = useReactToPrint({
    contentRef: letterRef,
  });

  const getReasonLabel = (reason: TerminationReason) => {
    const labels = {
      voluntary: language === 'pt' ? 'Demissão Voluntária' : 'Voluntary Resignation',
      dismissal: language === 'pt' ? 'Despedimento' : 'Dismissal',
      contract_end: language === 'pt' ? 'Fim de Contrato' : 'Contract End',
      retirement: language === 'pt' ? 'Reforma' : 'Retirement',
      mutual_agreement: language === 'pt' ? 'Acordo Mútuo' : 'Mutual Agreement',
    };
    return labels[reason];
  };

  const handleProcessTermination = async () => {
    if (!currentUser) return;
    
    setIsProcessing(true);
    
    try {
      const result = await processTermination(employee, {
        employeeId: employee.id,
        terminationDate,
        reason: terminationReason,
        reasonDetails: reasonDetails || undefined,
        yearsOfService: terminationPackage.yearsOfService,
        finalBaseSalary: employee.baseSalary,
        severancePay: terminationPackage.severancePay,
        proportionalLeave: terminationPackage.proportionalLeave,
        proportional13th: terminationPackage.proportional13th,
        proportionalHolidaySubsidy: terminationPackage.proportionalHolidaySubsidy,
        noticePeriodDays: terminationPackage.noticePeriodDays,
        noticeCompensation: terminationPackage.noticeCompensation,
        unusedLeaveDays,
        unusedLeaveCompensation: terminationPackage.unusedLeaveCompensation,
        totalPackage: terminationPackage.totalPackage,
        processedBy: currentUser.name,
        processedAt: new Date().toISOString(),
        letterGenerated: false,
      });
      
      if (result.success) {
        setIsProcessed(true);
        toast.success(
          language === 'pt' 
            ? 'Rescisão processada com sucesso!' 
            : 'Termination processed successfully!'
        );
        onSuccess();
      } else {
        toast.error(result.error || 'Error processing termination');
      }
    } catch (error) {
      console.error('Error processing termination:', error);
      toast.error(language === 'pt' ? 'Erro ao processar rescisão' : 'Error processing termination');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isProcessed ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            )}
            {language === 'pt' ? 'Processar Rescisão' : 'Process Termination'}
          </DialogTitle>
          <DialogDescription>
            {language === 'pt' 
              ? 'Confirme os detalhes da rescisão e processe o encerramento do contrato.' 
              : 'Confirm termination details and process the contract termination.'}
          </DialogDescription>
        </DialogHeader>

        {/* Employee Info */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">{employee.firstName} {employee.lastName}</h3>
              <p className="text-sm text-muted-foreground">{employee.position}</p>
            </div>
            <Badge variant="secondary">{getReasonLabel(terminationReason)}</Badge>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {language === 'pt' ? 'Data de Rescisão:' : 'Termination Date:'} {new Date(terminationDate).toLocaleDateString()}
          </div>
        </div>

        <Separator />

        {/* Package Summary */}
        <div className="space-y-2">
          <h4 className="font-medium">{language === 'pt' ? 'Resumo do Pacote' : 'Package Summary'}</h4>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>{language === 'pt' ? 'Indemnização' : 'Severance'}</span>
              <span className="font-medium">{formatAOA(terminationPackage.severancePay)}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>{language === 'pt' ? 'Férias Proporcionais' : 'Proportional Leave'}</span>
              <span className="font-medium">{formatAOA(terminationPackage.proportionalLeave)}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>{language === 'pt' ? '13º Proporcional' : 'Proportional 13th'}</span>
              <span className="font-medium">{formatAOA(terminationPackage.proportional13th)}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>{language === 'pt' ? 'Subsídio de Férias' : 'Holiday Subsidy'}</span>
              <span className="font-medium">{formatAOA(terminationPackage.proportionalHolidaySubsidy)}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>{language === 'pt' ? 'Compensação de Aviso' : 'Notice Compensation'}</span>
              <span className="font-medium">{formatAOA(terminationPackage.noticeCompensation)}</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span>{language === 'pt' ? 'Férias Não Gozadas' : 'Unused Leave'}</span>
              <span className="font-medium">{formatAOA(terminationPackage.unusedLeaveCompensation)}</span>
            </div>
          </div>

          <div className="p-4 bg-primary/10 rounded-lg mt-4">
            <div className="flex justify-between items-center">
              <span className="font-medium text-lg">
                {language === 'pt' ? 'TOTAL A PAGAR' : 'TOTAL TO PAY'}
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatAOA(terminationPackage.totalPackage)}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Reason Details */}
        {!isProcessed && (
          <div className="space-y-2">
            <Label>{language === 'pt' ? 'Observações (opcional)' : 'Notes (optional)'}</Label>
            <Textarea
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              placeholder={language === 'pt' ? 'Adicione detalhes sobre a rescisão...' : 'Add termination details...'}
              rows={3}
            />
          </div>
        )}

        {/* Hidden printable letter */}
        <div className="hidden">
          <div ref={letterRef}>
            <PrintableTerminationLetter
              employee={employee}
              terminationDate={terminationDate}
              terminationReason={terminationReason}
              terminationPackage={terminationPackage}
              reasonDetails={reasonDetails}
              processedBy={currentUser?.name || ''}
              language={language}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isProcessed ? (
            <>
              <Button variant="outline" onClick={() => handlePrintLetter()}>
                <Printer className="h-4 w-4 mr-2" />
                {language === 'pt' ? 'Imprimir Carta' : 'Print Letter'}
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                {language === 'pt' ? 'Fechar' : 'Close'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
                {language === 'pt' ? 'Cancelar' : 'Cancel'}
              </Button>
              <Button variant="outline" onClick={() => handlePrintLetter()}>
                <FileText className="h-4 w-4 mr-2" />
                {language === 'pt' ? 'Pré-visualizar Carta' : 'Preview Letter'}
              </Button>
              <Button 
                onClick={handleProcessTermination} 
                disabled={isProcessing}
                variant="destructive"
              >
                {isProcessing ? (
                  language === 'pt' ? 'A processar...' : 'Processing...'
                ) : (
                  language === 'pt' ? 'Confirmar Rescisão' : 'Confirm Termination'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
