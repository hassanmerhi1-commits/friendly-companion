import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { useHRStore } from "@/stores/hr-store";
import { formatAOA } from "@/lib/angola-labor-law";
import { Check, X, Clock, TrendingUp, TrendingDown, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { SalaryAdjustmentDialog } from "./SalaryAdjustmentDialog";
import type { SalaryAdjustment, ApprovalStatus, AdjustmentType } from "@/types/hr";

export function SalaryAdjustmentsList() {
  const { language } = useLanguage();
  const { currentUser } = useAuthStore();
  const { salaryAdjustments, approveSalaryAdjustment, rejectSalaryAdjustment } = useHRStore();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<SalaryAdjustment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const getStatusBadge = (status: ApprovalStatus) => {
    const config: Record<ApprovalStatus, { variant: 'default' | 'secondary' | 'destructive'; label: { pt: string; en: string } }> = {
      pending: { variant: 'secondary', label: { pt: 'Pendente', en: 'Pending' } },
      approved: { variant: 'default', label: { pt: 'Aprovado', en: 'Approved' } },
      rejected: { variant: 'destructive', label: { pt: 'Rejeitado', en: 'Rejected' } },
    };
    const c = config[status];
    return <Badge variant={c.variant}>{language === 'pt' ? c.label.pt : c.label.en}</Badge>;
  };

  const getTypeLabel = (type: AdjustmentType) => {
    const labels: Record<AdjustmentType, { pt: string; en: string }> = {
      raise: { pt: 'Aumento', en: 'Raise' },
      promotion: { pt: 'Promoção', en: 'Promotion' },
      demotion: { pt: 'Redução', en: 'Demotion' },
      correction: { pt: 'Correcção', en: 'Correction' },
      annual_review: { pt: 'Revisão', en: 'Review' },
    };
    return language === 'pt' ? labels[type].pt : labels[type].en;
  };

  const handleApprove = async (adjustment: SalaryAdjustment) => {
    if (!currentUser) return;
    
    setIsProcessing(true);
    try {
      const result = await approveSalaryAdjustment(adjustment.id, currentUser.name);
      if (result.success) {
        toast.success(
          language === 'pt' 
            ? `Ajuste aprovado! Salário de ${adjustment.employeeName} actualizado.` 
            : `Adjustment approved! ${adjustment.employeeName}'s salary updated.`
        );
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(language === 'pt' ? 'Erro ao aprovar' : 'Error approving');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectClick = (adjustment: SalaryAdjustment) => {
    setSelectedAdjustment(adjustment);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedAdjustment || !currentUser) return;
    
    if (!rejectionReason.trim()) {
      toast.error(language === 'pt' ? 'Indique o motivo da rejeição' : 'Provide rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await rejectSalaryAdjustment(selectedAdjustment.id, currentUser.name, rejectionReason);
      if (result.success) {
        toast.success(language === 'pt' ? 'Ajuste rejeitado' : 'Adjustment rejected');
        setShowRejectDialog(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(language === 'pt' ? 'Erro ao rejeitar' : 'Error rejecting');
    } finally {
      setIsProcessing(false);
    }
  };

  // Sort: pending first, then by date
  const sortedAdjustments = [...salaryAdjustments].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const pendingCount = salaryAdjustments.filter(a => a.status === 'pending').length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {language === 'pt' ? 'Ajustes Salariais' : 'Salary Adjustments'}
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCount} {language === 'pt' ? 'pendentes' : 'pending'}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {language === 'pt' 
                ? 'Histórico de alterações salariais e promoções' 
                : 'History of salary changes and promotions'}
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {language === 'pt' ? 'Novo Ajuste' : 'New Adjustment'}
          </Button>
        </CardHeader>
        <CardContent>
          {sortedAdjustments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{language === 'pt' ? 'Nenhum ajuste registado' : 'No adjustments recorded'}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'pt' ? 'Colaborador' : 'Employee'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Tipo' : 'Type'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Anterior' : 'Previous'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Novo' : 'New'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Variação' : 'Change'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Data' : 'Date'}</TableHead>
                  <TableHead>{language === 'pt' ? 'Estado' : 'Status'}</TableHead>
                  {isAdmin && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAdjustments.map(adj => (
                  <TableRow key={adj.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{adj.employeeName}</p>
                        {adj.newPosition && (
                          <p className="text-xs text-muted-foreground">
                            → {adj.newPosition}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(adj.type)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatAOA(adj.previousSalary)}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">
                      {formatAOA(adj.newSalary)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {adj.changeAmount > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : adj.changeAmount < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={`text-sm ${
                          adj.changeAmount > 0 ? 'text-green-600' : 
                          adj.changeAmount < 0 ? 'text-red-600' : ''
                        }`}>
                          {adj.changeAmount >= 0 ? '+' : ''}{adj.changePercent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(adj.effectiveDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(adj.status)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {adj.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleApprove(adj)}
                              disabled={isProcessing}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRejectClick(adj)}
                              disabled={isProcessing}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {adj.status === 'approved' && adj.approvedBy && (
                          <span className="text-xs text-muted-foreground">
                            {language === 'pt' ? 'Por' : 'By'} {adj.approvedBy}
                          </span>
                        )}
                        {adj.status === 'rejected' && adj.rejectionReason && (
                          <span className="text-xs text-muted-foreground" title={adj.rejectionReason}>
                            {adj.rejectionReason.slice(0, 30)}...
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <SalaryAdjustmentDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog}
      />

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {language === 'pt' ? 'Rejeitar Ajuste' : 'Reject Adjustment'}
            </DialogTitle>
            <DialogDescription>
              {language === 'pt' 
                ? 'Indique o motivo da rejeição deste pedido de ajuste salarial.' 
                : 'Provide the reason for rejecting this salary adjustment request.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAdjustment && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>{selectedAdjustment.employeeName}</strong></p>
              <p>{formatAOA(selectedAdjustment.previousSalary)} → {formatAOA(selectedAdjustment.newSalary)}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label>{language === 'pt' ? 'Motivo da Rejeição' : 'Rejection Reason'} *</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={language === 'pt' ? 'Explique porque o pedido foi rejeitado...' : 'Explain why the request was rejected...'}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isProcessing}>
              {language === 'pt' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={isProcessing}>
              {isProcessing 
                ? (language === 'pt' ? 'A rejeitar...' : 'Rejecting...') 
                : (language === 'pt' ? 'Confirmar Rejeição' : 'Confirm Rejection')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
