import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, Bell, Shield, CreditCard, Download, Upload, Database, MapPin } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "sonner";
import { 
  exportDataToFile, 
  readFileAsJson, 
  validateBackupData, 
  importDataFromBackup,
  getBackupStats,
  type AppBackupData 
} from "@/lib/data-backup";
import { NetworkSettings } from "@/components/settings/NetworkSettings";
import { SQLiteBackupSettings } from "@/components/settings/SQLiteBackupSettings";
import { getSelectedProvince, clearProvinceSelection, ANGOLA_PROVINCES } from "@/lib/province-storage";

const Settings = () => {
  const { t } = useLanguage();
  const { settings, updateSettings } = useSettingsStore();
  const [formData, setFormData] = useState(settings);
  const [stats, setStats] = useState(getBackupStats());
  const currentProvince = getSelectedProvince();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStats(getBackupStats());
  }, []);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateSettings(formData);
    toast.success(t.settings.changesSaved || "Alterações guardadas com sucesso!");
  };

  const handleExport = () => {
    exportDataToFile();
    toast.success(t.settings.exportSuccess || "Dados exportados com sucesso!");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error(t.settings.invalidFile || "Ficheiro inválido. Selecione um ficheiro .json de backup.");
      return;
    }

    try {
      const data = await readFileAsJson(file);
      
      if (!validateBackupData(data)) {
        toast.error(t.settings.importError || "Erro ao importar ficheiro. Verifique se é um backup válido.");
        return;
      }

      importDataFromBackup(data as AppBackupData);
      toast.success(t.settings.importSuccess || "Dados importados com sucesso! A página será recarregada.");
      
      // Reload page to refresh all stores
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch {
      toast.error(t.settings.importError || "Erro ao importar ficheiro.");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChangeProvince = () => {
    if (confirm("Tem certeza que deseja mudar de província? Você será redirecionado para selecionar uma nova província.")) {
      clearProvinceSelection();
      window.location.reload();
    }
  };

  return (
    <MainLayout>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground">{t.settings.title}</h1>
        <p className="text-muted-foreground mt-1">{t.settings.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Current Province Section */}
          <div className="stat-card animate-slide-up border-2 border-primary/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">Província Actual</h2>
                <p className="text-sm text-muted-foreground">Base de dados isolada por província</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-2xl font-bold text-primary">{currentProvince || "Não selecionada"}</p>
                <p className="text-sm text-muted-foreground">
                  Cada província tem a sua própria base de dados independente
                </p>
              </div>
              <Button variant="outline" onClick={handleChangeProvince}>
                Mudar Província
              </Button>
            </div>
          </div>

          {/* Network Settings Section */}
          <NetworkSettings />

          {/* SQLite Database Backup (Electron only) */}
          <SQLiteBackupSettings />

          {/* Data Backup Section (JSON/localStorage fallback) */}
          <div className="stat-card animate-slide-up border-2 border-accent/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">{t.settings.dataBackup || "Cópia de Segurança"}</h2>
                <p className="text-sm text-muted-foreground">{t.settings.dataBackupDesc || "Exportar e importar todos os dados"}</p>
              </div>
            </div>
            
            {/* Current Data Stats */}
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <h3 className="text-sm font-medium text-foreground mb-3">{t.settings.currentData || "Dados Actuais"}</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-accent">{stats.employees}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.employees || "Funcionários"}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">{stats.branches}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.branches || "Filiais"}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">{stats.payrollPeriods}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.payrollPeriods || "Períodos"}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">{stats.payrollEntries}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.payrollEntries || "Registos"}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">{stats.deductions}</p>
                  <p className="text-xs text-muted-foreground">{t.settings.deductionsCount || "Descontos"}</p>
                </div>
              </div>
            </div>

            {/* Export/Import Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="accent" 
                className="flex-1"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                {t.settings.exportData || "Exportar Dados"}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleImportClick}
              >
                <Upload className="h-4 w-4 mr-2" />
                {t.settings.importData || "Importar Dados"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="stat-card animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">{t.settings.companyInfo}</h2>
                <p className="text-sm text-muted-foreground">{t.settings.basicData}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.settings.companyName}</Label>
                <Input 
                  value={formData.companyName} 
                  onChange={(e) => handleChange("companyName", e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.nif}</Label>
                <Input 
                  value={formData.nif} 
                  onChange={(e) => handleChange("nif", e.target.value)} 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>{t.settings.address}</Label>
                <Input 
                  value={formData.address} 
                  onChange={(e) => handleChange("address", e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.municipality}</Label>
                <Input 
                  value={formData.municipality || ''} 
                  onChange={(e) => handleChange("municipality", e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.city}</Label>
                <Input 
                  value={formData.city} 
                  onChange={(e) => handleChange("city", e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.province}</Label>
                <Input 
                  value={formData.province || ''} 
                  onChange={(e) => handleChange("province", e.target.value)} 
                />
              </div>
            </div>
          </div>

          <div className="stat-card animate-slide-up" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">{t.settings.paymentSettings}</h2>
                <p className="text-sm text-muted-foreground">{t.settings.bankingData}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.settings.bank}</Label>
                <Input 
                  value={formData.bank} 
                  onChange={(e) => handleChange("bank", e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.iban}</Label>
                <Input 
                  value={formData.iban} 
                  onChange={(e) => handleChange("iban", e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.payday}</Label>
                <Input 
                  type="number" 
                  value={formData.payday} 
                  onChange={(e) => handleChange("payday", parseInt(e.target.value) || 1)} 
                  min="1" 
                  max="31" 
                />
              </div>
              <div className="space-y-2">
                <Label>{t.settings.currency}</Label>
                <Input value={formData.currency} disabled />
              </div>
            </div>
          </div>

          <div className="stat-card animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">{t.settings.taxSettings}</h2>
                <p className="text-sm text-muted-foreground">{t.settings.taxRates}</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: t.settings.irtRate, value: t.settings.progressiveTable, enabled: true },
                { label: t.settings.inssWorker, value: "3%", enabled: true },
                { label: t.settings.inssEmployer, value: "8%", enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.value}</p>
                  </div>
                  <Switch checked={item.enabled} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="stat-card animate-slide-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="font-display font-semibold text-foreground">{t.settings.notifications}</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">{t.settings.emailPaymentProcessed}</span>
                <Switch 
                  checked={formData.emailPaymentProcessed} 
                  onCheckedChange={(checked) => handleChange("emailPaymentProcessed", checked)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">{t.settings.monthEndReminder}</span>
                <Switch 
                  checked={formData.monthEndReminder} 
                  onCheckedChange={(checked) => handleChange("monthEndReminder", checked)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">{t.settings.holidayAlerts}</span>
                <Switch 
                  checked={formData.holidayAlerts} 
                  onCheckedChange={(checked) => handleChange("holidayAlerts", checked)} 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">{t.settings.newEmployees}</span>
                <Switch 
                  checked={formData.newEmployees} 
                  onCheckedChange={(checked) => handleChange("newEmployees", checked)} 
                />
              </div>
            </div>
          </div>
          <Button variant="accent" size="lg" className="w-full" onClick={handleSave}>
            {t.settings.saveChanges}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
