import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useBranchStore } from '@/stores/branch-store';
import { ANGOLA_PROVINCES, ANGOLA_CITIES, type BranchFormData } from '@/types/branch';
import { useLanguage } from '@/lib/i18n';
import { Building2, MapPin, Phone, Mail, Plus, Edit, Trash2, Crown } from 'lucide-react';
import { toast } from 'sonner';

export default function Branches() {
  const { t, language } = useLanguage();
  const { branches, addBranch, updateBranch, deleteBranch, getActiveBranches } = useBranchStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [formData, setFormData] = useState<Partial<BranchFormData>>({
    name: '',
    code: '',
    province: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    isHeadquarters: false,
  });

  const activeBranches = getActiveBranches();
  const cities = selectedProvince ? ANGOLA_CITIES[selectedProvince] || [] : [];

  const handleProvinceChange = (province: string) => {
    setSelectedProvince(province);
    setFormData({ ...formData, province, city: '' });
  };

  const handleAddBranch = () => {
    if (!formData.name || !formData.province || !formData.city) {
      toast.error(language === 'pt' ? 'Preencha os campos obrigatórios' : 'Fill in required fields');
      return;
    }
    addBranch(formData as BranchFormData);
    setIsAddDialogOpen(false);
    setFormData({
      name: '',
      code: '',
      province: '',
      city: '',
      address: '',
      phone: '',
      email: '',
      isHeadquarters: false,
    });
    setSelectedProvince('');
    toast.success(language === 'pt' ? 'Filial adicionada com sucesso!' : 'Branch added successfully!');
  };

  const handleDelete = (id: string) => {
    deleteBranch(id);
    toast.success(language === 'pt' ? 'Filial desactivada' : 'Branch deactivated');
  };

  // Group branches by province
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
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageSubtitle}</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {addBranchLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{addBranchLabel}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>{language === 'pt' ? 'Nome da Filial *' : 'Branch Name *'}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={language === 'pt' ? 'Ex: Filial Viana' : 'Ex: Viana Branch'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'pt' ? 'Província *' : 'Province *'}</Label>
                    <Select value={selectedProvince} onValueChange={handleProvinceChange}>
                      <SelectTrigger><SelectValue placeholder={language === 'pt' ? 'Seleccione' : 'Select'} /></SelectTrigger>
                      <SelectContent>
                        {ANGOLA_PROVINCES.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'pt' ? 'Cidade *' : 'City *'}</Label>
                    <Select 
                      value={formData.city} 
                      onValueChange={(v) => setFormData({ ...formData, city: v })}
                      disabled={!selectedProvince}
                    >
                      <SelectTrigger><SelectValue placeholder={language === 'pt' ? 'Seleccione' : 'Select'} /></SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{language === 'pt' ? 'Endereço' : 'Address'}</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'pt' ? 'Telefone' : 'Phone'}</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+244 XXX XXX XXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label>{headquartersLabel}</Label>
                    <p className="text-sm text-muted-foreground">
                      {language === 'pt' ? 'Marcar como sede principal' : 'Mark as main headquarters'}
                    </p>
                  </div>
                  <Switch
                    checked={formData.isHeadquarters}
                    onCheckedChange={(v) => setFormData({ ...formData, isHeadquarters: v })}
                  />
                </div>
                <Button onClick={handleAddBranch} className="w-full">
                  {addBranchLabel}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                      <Button variant="ghost" size="sm">
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
      </div>
    </MainLayout>
  );
}
