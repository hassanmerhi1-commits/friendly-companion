import { useState } from 'react';
import { TopNavLayout } from '@/components/layout/TopNavLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useBranchStore } from '@/stores/branch-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { BranchFormDialog } from '@/components/branches/BranchFormDialog';
import { useLanguage } from '@/lib/i18n';
import { Building2, MapPin, Phone, Mail, Plus, Edit, Trash2, Crown, Download, QrCode, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthStore } from '@/stores/auth-store';
import type { Branch } from '@/types/branch';

export default function Branches() {
  const { t, language } = useLanguage();
  const { hasPermission } = useAuthStore();
  const { branches, deleteBranch } = useBranchStore();
  const { employees } = useEmployeeStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [qrBranch, setQrBranch] = useState<Branch | null>(null);

  // Build the attendance URL for a branch — encode all data in URL so phone needs no database
  const getAttendanceUrl = (branch: Branch) => {
    const branchEmployees = employees
      .filter(e => e.branchId === branch.id && e.status === 'active')
      .map(e => ({
        i: e.id,
        f: e.firstName,
        l: e.lastName,
        n: e.employeeNumber,
      }));

    const payload = {
      b: {
        i: branch.id,
        n: branch.name,
        c: branch.code,
        p: branch.pin || '',
      },
      e: branchEmployees,
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return `https://bright-spark-gleam.lovable.app/#/branch-attendance?d=${encoded}`;
  };

  // Derive active branches from subscribed state - this ensures re-render on changes
  const activeBranches = branches.filter(b => b.isActive);

  const handleAddNew = () => {
    setEditingBranch(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteBranch(id);
    toast.success(language === 'pt' ? 'Filial desactivada' : 'Branch deactivated');
  };

  const handleExportBranchPackage = (branch: Branch) => {
    const branchEmployees = employees
      .filter(e => e.branchId === branch.id && e.status === 'active')
      .map(e => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        employeeNumber: e.employeeNumber,
        position: e.position,
        department: e.department,
      }));

    const pkg = {
      type: 'branch_package',
      version: 1,
      exportedAt: new Date().toISOString(),
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        province: branch.province,
        city: branch.city,
        pin: branch.pin,
      },
      employees: branchEmployees,
    };

    const json = JSON.stringify(pkg, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filial-${branch.code}-pacote.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(language === 'pt' 
      ? `Pacote exportado: ${branch.name} (${branchEmployees.length} funcionários)` 
      : `Package exported: ${branch.name} (${branchEmployees.length} employees)`);
  };


  const branchesByProvince = activeBranches.reduce((acc, branch) => {
    if (!acc[branch.province]) acc[branch.province] = [];
    acc[branch.province].push(branch);
    return acc;
  }, {} as Record<string, typeof activeBranches>);

  const pageTitle = language === 'pt' ? 'Filiais' : 'Branches';
  const pageSubtitle = language === 'pt' 
    ? 'Gerir filiais da empresa por província e cidade' 
    : 'Manage company branches by province and city';
  const addBranchLabel = language === 'pt' ? 'Nova Filial' : 'New Branch';
  const headquartersLabel = language === 'pt' ? 'Sede' : 'Headquarters';
  const branchLabel = language === 'pt' ? 'Filial' : 'Branch';

  return (
    <TopNavLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageSubtitle}</p>
          </div>
          <Button className="gap-2" onClick={handleAddNew}>
            <Plus className="h-4 w-4" />
            {addBranchLabel}
          </Button>
          
          <BranchFormDialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            branch={editingBranch}
          />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'pt' ? 'Total Filiais' : 'Total Branches'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeBranches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'pt' ? 'Províncias' : 'Provinces'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(branchesByProvince).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {language === 'pt' ? 'Cidades' : 'Cities'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(activeBranches.map(b => b.city)).size}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{headquartersLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeBranches.filter(b => b.isHeadquarters).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Branches by Province */}
        {Object.entries(branchesByProvince).map(([province, provinceBranches]) => (
          <div key={province}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              {province}
              <Badge variant="secondary">{provinceBranches.length}</Badge>
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {provinceBranches.map((branch) => (
                <Card key={branch.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${branch.isHeadquarters ? 'bg-accent text-accent-foreground' : 'bg-muted'}`}>
                          {branch.isHeadquarters ? <Crown className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                        </div>
                        <div>
                          <h3 className="font-semibold">{branch.name}</h3>
                          <p className="text-sm text-muted-foreground">{branch.code}</p>
                        </div>
                      </div>
                      <Badge variant={branch.isHeadquarters ? 'default' : 'outline'}>
                        {branch.isHeadquarters ? headquartersLabel : branchLabel}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {branch.city}, {branch.province}
                      </div>
                      {branch.address && (
                        <p className="text-muted-foreground pl-6">{branch.address}</p>
                      )}
                      {branch.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {branch.phone}
                        </div>
                      )}
                      {branch.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {branch.email}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setQrBranch(branch)}
                        title={language === 'pt' ? 'QR Code para presenças' : 'Attendance QR Code'}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleExportBranchPackage(branch)}
                        title={language === 'pt' ? 'Exportar pacote para filial' : 'Export branch package'}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(branch)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(branch.id)}
                        disabled={branch.isHeadquarters}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* QR Code Dialog */}
        <Dialog open={!!qrBranch} onOpenChange={(open) => !open && setQrBranch(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">
                {qrBranch?.name}
              </DialogTitle>
              <DialogDescription className="text-center">
                {language === 'pt' 
                  ? 'O chefe de filial pode digitalizar este QR code para abrir a página de presenças no telemóvel'
                  : 'Branch chief can scan this QR code to open the attendance page on their phone'}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="bg-white p-4 rounded-xl">
                {qrBranch && <QRCodeSVG value={getAttendanceUrl(qrBranch)} size={220} level="L" />}
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-[280px]">
                {qrBranch?.name} - {employees.filter(e => e.branchId === qrBranch?.id && e.status === 'active').length} {language === 'pt' ? 'funcionários' : 'employees'}
              </p>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                onClick={() => {
                  if (qrBranch) {
                    navigator.clipboard.writeText(getAttendanceUrl(qrBranch));
                    toast.success(language === 'pt' ? 'Link copiado!' : 'Link copied!');
                  }
                }}
              >
                <Copy className="h-4 w-4" />
                {language === 'pt' ? 'Copiar Link' : 'Copy Link'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TopNavLayout>
  );
}
