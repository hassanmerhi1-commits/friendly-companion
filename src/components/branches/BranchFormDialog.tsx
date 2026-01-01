import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/lib/i18n';
import { useBranchStore } from '@/stores/branch-store';
import { ANGOLA_PROVINCES, ANGOLA_CITIES, type Branch, type BranchFormData } from '@/types/branch';
import { toast } from 'sonner';

interface BranchFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch?: Branch | null;
}

const defaultFormData: BranchFormData = {
  name: '',
  code: '',
  province: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  isHeadquarters: false,
};

export function BranchFormDialog({ open, onOpenChange, branch }: BranchFormDialogProps) {
  const { t } = useLanguage();
  const { addBranch, updateBranch } = useBranchStore();
  const [formData, setFormData] = useState<BranchFormData>(defaultFormData);

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name,
        code: branch.code,
        province: branch.province,
        city: branch.city,
        address: branch.address,
        phone: branch.phone || '',
        email: branch.email || '',
        isHeadquarters: branch.isHeadquarters,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [branch, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (branch) {
      const res = await updateBranch(branch.id, formData);
      if (!res.success) {
        toast.error(res.error || t.common.error);
        return;
      }
    } else {
      const res = await addBranch(formData);
      if (!res.success) {
        toast.error(res.error || t.common.error);
        return;
      }
    }

    toast.success(t.common.save);
    onOpenChange(false);
  };

  const availableCities = formData.province ? (ANGOLA_CITIES[formData.province] || []) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {branch ? t.common.edit : t.branches.addBranch}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t.branches.name}</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Sede Principal - Luanda"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>{t.branches.code}</Label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
              placeholder="LDA-01"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.branches.province}</Label>
              <Select
                value={formData.province}
                onValueChange={(v) => setFormData(prev => ({ ...prev, province: v, city: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.branches.province} />
                </SelectTrigger>
                <SelectContent>
                  {ANGOLA_PROVINCES.map((prov) => (
                    <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.branches.city}</Label>
              <Select
                value={formData.city}
                onValueChange={(v) => setFormData(prev => ({ ...prev, city: v }))}
                disabled={!formData.province}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.branches.city} />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.branches.address}</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.branches.phone}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+244 222 123 456"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.branches.email}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="filial@empresa.co.ao"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.isHeadquarters}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, isHeadquarters: v }))}
            />
            <Label>{t.branches.isHeadquarters}</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit">
              {t.common.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
