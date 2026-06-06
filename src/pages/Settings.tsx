import { useState, useRef, useEffect, useCallback } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Building2, Bell, Shield, CreditCard, Download, Upload, Database, MapPin, Calculator, Loader2, RefreshCw, ImagePlus, Trash2, Settings as SettingsIcon, Network, HardDrive, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ATTENDANCE_PAGE } from "@/lib/page-layout";
import { useLanguage } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settings-store";
import { usePayrollStore } from "@/stores/payroll-store";
import { toast } from "sonner";
import { 
  exportDataToFile, 
  readFileAsJson, 
  validateBackupData, 
  importDataFromBackup,
  getBackupStats,
  type AppBackupData 
} from "@/lib/data-backup";
import { SQLiteBackupSettings } from "@/components/settings/SQLiteBackupSettings";
import { DataResetSettings } from "@/components/settings/DataResetSettings";
import { NetworkSettings } from "@/components/settings/NetworkSettings";
import { DatabaseSettings } from "@/components/settings/DatabaseSettings";
import { getSelectedProvince, clearProvinceSelection } from "@/lib/province-storage";
import { CheckForUpdatesButton } from "@/components/UpdateNotification";

const fieldLabel = "text-xs text-muted-foreground";
const fieldInput = "h-8 text-xs";

type SettingsTab =
  | "empresa"
  | "pagamentos"
  | "fiscal"
  | "irt"
  | "notificacoes"
  | "actualizacoes"
  | "provincia"
  | "rede"
  | "basedados"
  | "backup-json"
  | "backup-sqlite"
  | "reset";

function SettingsSection({
  title,
  description,
  icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border/50 bg-card p-3 space-y-3 shadow-sm", className)}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{title}</h3>
          {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

const Settings = () => {
  const { t, language } = useLanguage();
  const pt = language === "pt";
  const { settings, updateSettings } = useSettingsStore();
  const { recalculateAllEntries, loadPayroll, isLoaded } = usePayrollStore();
  const [formData, setFormData] = useState(settings);
  const [stats, setStats] = useState(getBackupStats());
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("empresa");
  const currentProvince = getSelectedProvince();

  const settingsTabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "empresa", label: pt ? "Empresa" : "Company", icon: <Building2 className="h-3.5 w-3.5" /> },
    { id: "pagamentos", label: pt ? "Pagamentos" : "Payments", icon: <CreditCard className="h-3.5 w-3.5" /> },
    { id: "fiscal", label: pt ? "Impostos" : "Tax rates", icon: <Shield className="h-3.5 w-3.5" /> },
    { id: "irt", label: "IRT 2026", icon: <Calculator className="h-3.5 w-3.5" /> },
    { id: "notificacoes", label: pt ? "Notificações" : "Notifications", icon: <Bell className="h-3.5 w-3.5" /> },
    { id: "actualizacoes", label: pt ? "Actualizações" : "Updates", icon: <RefreshCw className="h-3.5 w-3.5" /> },
    { id: "provincia", label: pt ? "Província" : "Province", icon: <MapPin className="h-3.5 w-3.5" /> },
    { id: "rede", label: pt ? "Rede LAN" : "LAN", icon: <Network className="h-3.5 w-3.5" /> },
    { id: "basedados", label: pt ? "Base dados" : "Database", icon: <Database className="h-3.5 w-3.5" /> },
    { id: "backup-json", label: pt ? "Backup JSON" : "JSON backup", icon: <Download className="h-3.5 w-3.5" /> },
    { id: "backup-sqlite", label: "SQLite", icon: <HardDrive className="h-3.5 w-3.5" /> },
    { id: "reset", label: pt ? "Repor dados" : "Reset", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  ];

  const embeddedPanelClass =
    "[&_.stat-card]:rounded-lg [&_.stat-card]:border [&_.stat-card]:border-border/50 [&_.stat-card]:p-3 [&_.stat-card]:shadow-sm [&_.stat-card]:mb-0 [&_h2]:text-sm [&_h2]:font-semibold [&_[class*='CardHeader']]:py-2 [&_[class*='CardHeader']]:px-3 [&_[class*='CardContent']]:px-3 [&_[class*='CardContent']]:pb-3 [&_.text-2xl]:text-base";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoaded) {
      loadPayroll();
    }
  }, [isLoaded, loadPayroll]);

  useEffect(() => {
    setFormData(settings);
    setIsDirty(false);
  }, [settings]);

  useEffect(() => {
    setStats(getBackupStats());
  }, []);

  const handleRecalculatePayroll = async () => {
    setIsRecalculating(true);
    try {
      const count = await recalculateAllEntries();
      toast.success(`${count} registos de folha de pagamento recalculados com as novas taxas IRT 2026!`);
    } catch (error) {
      toast.error("Erro ao recalcular folha de pagamento");
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      setIsDirty(false);
      toast.success(t.settings.changesSaved || "Alterações guardadas com sucesso!");
    } catch {
      toast.error("Erro ao guardar alterações.");
    } finally {
      setIsSaving(false);
    }
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

  const compressImage = useCallback((file: File, maxSize = 200 * 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          // Max dimensions 400x400 for logo
          const maxDim = 400;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = (height / width) * maxDim;
              width = maxDim;
            } else {
              width = (width / height) * maxDim;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          let quality = 0.8;
          let result = canvas.toDataURL('image/jpeg', quality);
          // Reduce quality until under maxSize
          while (result.length > maxSize && quality > 0.1) {
            quality -= 0.1;
            result = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(result);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um ficheiro de imagem (JPG, PNG, etc.)');
      return;
    }
    try {
      const base64 = await compressImage(file);
      setFormData(prev => ({ ...prev, companyLogo: base64 }));
      setIsDirty(true);
      toast.success('Logotipo carregado! Clique em "Guardar" para aplicar.');
    } catch {
      toast.error('Erro ao processar a imagem.');
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, companyLogo: '' }));
    setIsDirty(true);
    toast.info('Logotipo removido. Clique em "Guardar" para aplicar.');
  };

  const companyForm = (
    <div className="grid grid-cols-1 xl:grid-cols-[200px_1fr] gap-4 items-start">
      <div className="flex flex-col items-center gap-2 p-3 bg-muted/40 rounded-lg border border-dashed border-border/60 xl:sticky xl:top-0">
        {formData.companyLogo ? (
          <img src={formData.companyLogo} alt="Logotipo" className="h-20 max-w-[180px] object-contain rounded" />
        ) : (
          <div className="h-20 w-20 flex items-center justify-center bg-muted rounded-lg">
            <Building2 className="h-9 w-9 text-muted-foreground" />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => logoInputRef.current?.click()}>
            <ImagePlus className="h-3.5 w-3.5 mr-1" />
            {formData.companyLogo ? (pt ? "Alterar" : "Change") : (pt ? "Carregar" : "Upload")}
          </Button>
          {formData.companyLogo && (
            <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={handleRemoveLogo}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        <p className="text-[10px] text-muted-foreground text-center">JPG, PNG — max 400×400</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className={fieldLabel}>{t.settings.companyName}</Label>
          <Input className={fieldInput} value={formData.companyName} onChange={(e) => handleChange("companyName", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className={fieldLabel}>{t.settings.nif}</Label>
          <Input className={fieldInput} value={formData.nif} onChange={(e) => handleChange("nif", e.target.value)} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label className={fieldLabel}>{t.settings.address}</Label>
          <Input className={fieldInput} value={formData.address} onChange={(e) => handleChange("address", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className={fieldLabel}>{t.settings.municipality}</Label>
          <Input className={fieldInput} value={formData.municipality || ""} onChange={(e) => handleChange("municipality", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className={fieldLabel}>{t.settings.city}</Label>
          <Input className={fieldInput} value={formData.city} onChange={(e) => handleChange("city", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className={fieldLabel}>{t.settings.province}</Label>
          <Input className={fieldInput} value={formData.province || ""} onChange={(e) => handleChange("province", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className={fieldLabel}>{pt ? "Telefone" : "Phone"}</Label>
          <Input className={fieldInput} value={formData.phone || ""} onChange={(e) => handleChange("phone", e.target.value)} placeholder="924 121 312" />
        </div>
        <div className="space-y-1">
          <Label className={fieldLabel}>{pt ? "Telefone 2" : "Phone 2"}</Label>
          <Input className={fieldInput} value={formData.phone2 || ""} onChange={(e) => handleChange("phone2", e.target.value)} placeholder={pt ? "Opcional" : "Optional"} />
        </div>
        <div className="space-y-1">
          <Label className={fieldLabel}>E-mail</Label>
          <Input className={fieldInput} type="email" value={formData.email || ""} onChange={(e) => handleChange("email", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className={fieldLabel}>Website</Label>
          <Input className={fieldInput} value={formData.website || ""} onChange={(e) => handleChange("website", e.target.value)} />
        </div>
      </div>
    </div>
  );

  const paymentForm = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
      <div className="space-y-1">
        <Label className={fieldLabel}>{t.settings.bank}</Label>
        <Input className={fieldInput} value={formData.bank} onChange={(e) => handleChange("bank", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className={fieldLabel}>{t.settings.iban}</Label>
        <Input className={fieldInput} value={formData.iban} onChange={(e) => handleChange("iban", e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className={fieldLabel}>{t.settings.payday}</Label>
        <Input className={fieldInput} type="number" value={formData.payday} onChange={(e) => handleChange("payday", parseInt(e.target.value) || 1)} min="1" max="31" />
      </div>
      <div className="space-y-1">
        <Label className={fieldLabel}>{t.settings.currency}</Label>
        <Input className={fieldInput} value={formData.currency} disabled />
      </div>
    </div>
  );

  return (
    <TopNavLayout scrollable={false}>
      <div className={`${ATTENDANCE_PAGE} gap-2`}>
        {/* Toolbar */}
        <div className="shrink-0 rounded-xl border border-border/50 bg-card shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
            <SettingsIcon className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold shrink-0">{t.settings.title}</span>
            <span className="text-[10px] text-muted-foreground hidden lg:inline truncate">{t.settings.subtitle}</span>
            {isDirty && (
              <Badge variant="secondary" className="text-[10px] h-5 shrink-0 ml-auto">
                {pt ? "Por guardar" : "Unsaved"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto">
            {settingsTabs.map((tab) => (
              <Button
                key={tab.id}
                variant={settingsTab === tab.id ? "default" : "outline"}
                size="sm"
                className="h-7 text-[11px] gap-1 shrink-0 px-2.5"
                onClick={() => setSettingsTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: pt ? "Província BD" : "DB province", value: currentProvince || (pt ? "—" : "—"), tone: "text-primary" },
            { label: pt ? "Funcionários" : "Employees", value: String(stats.employees), tone: "text-foreground" },
            { label: pt ? "Períodos folha" : "Payroll periods", value: String(stats.payrollPeriods), tone: "text-foreground" },
            { label: pt ? "Empresa" : "Company", value: formData.companyName || "—", tone: "text-muted-foreground" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-sm min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">{kpi.label}</p>
              <p className={cn("text-sm font-semibold truncate", kpi.tone)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tab panel — one group per tab, minimal scroll */}
        <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm flex flex-col">
          <div className={cn("flex-1 min-h-0 overflow-y-auto p-3", embeddedPanelClass)}>

            {settingsTab === "empresa" && (
              <SettingsSection title={t.settings.companyInfo} description={t.settings.basicData} icon={<Building2 className="h-4 w-4" />}>
                {companyForm}
              </SettingsSection>
            )}

            {settingsTab === "pagamentos" && (
              <SettingsSection title={t.settings.paymentSettings} description={t.settings.bankingData} icon={<CreditCard className="h-4 w-4" />}>
                {paymentForm}
              </SettingsSection>
            )}

            {settingsTab === "fiscal" && (
              <SettingsSection title={t.settings.taxSettings} description={t.settings.taxRates} icon={<Shield className="h-4 w-4" />} className="max-w-2xl">
                <div className="grid sm:grid-cols-3 gap-2">
                  {[
                    { label: t.settings.irtRate, value: t.settings.progressiveTable, enabled: true },
                    { label: t.settings.inssWorker, value: "3%", enabled: true },
                    { label: t.settings.inssEmployer, value: "8%", enabled: true },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col gap-2 p-2.5 bg-muted/40 rounded-lg">
                      <div>
                        <p className="text-xs font-medium">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.value}</p>
                      </div>
                      <Switch checked={item.enabled} className="mt-auto" />
                    </div>
                  ))}
                </div>
              </SettingsSection>
            )}

            {settingsTab === "irt" && (
              <SettingsSection title="IRT 2026" description="Lei n.º 14/25 — OGE" icon={<Calculator className="h-4 w-4" />} className="max-w-xl border-emerald-500/30">
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside mb-3">
                  <li>{pt ? "Isento até" : "Exempt up to"} <strong>150.000 Kz</strong></li>
                  <li>{pt ? "Escalão 13% eliminado (100k–150k)" : "13% bracket removed"}</li>
                  <li>{pt ? "Parcelas fixas actualizadas" : "Updated fixed amounts"}</li>
                </ul>
                <Button
                  size="sm"
                  className="h-8 text-xs w-full max-w-sm bg-emerald-600 hover:bg-emerald-600/90"
                  onClick={handleRecalculatePayroll}
                  disabled={isRecalculating}
                >
                  {isRecalculating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                      {pt ? "A recalcular..." : "Recalculating..."}
                    </>
                  ) : (
                    <>
                      <Calculator className="h-3.5 w-3.5 mr-1" />
                      {pt ? "Recalcular folhas (rascunho)" : "Recalc payroll (draft)"}
                    </>
                  )}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {pt ? "Apenas períodos em rascunho" : "Draft periods only"}
                </p>
              </SettingsSection>
            )}

            {settingsTab === "notificacoes" && (
              <SettingsSection title={t.settings.notifications} icon={<Bell className="h-4 w-4" />} className="max-w-2xl">
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                  {[
                    { key: "emailPaymentProcessed", label: t.settings.emailPaymentProcessed },
                    { key: "monthEndReminder", label: t.settings.monthEndReminder },
                    { key: "holidayAlerts", label: t.settings.holidayAlerts },
                    { key: "newEmployees", label: t.settings.newEmployees },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/30 last:border-0">
                      <span className="text-xs">{item.label}</span>
                      <Switch
                        checked={formData[item.key as keyof typeof formData] as boolean}
                        onCheckedChange={(checked) => handleChange(item.key, checked)}
                      />
                    </div>
                  ))}
                </div>
              </SettingsSection>
            )}

            {settingsTab === "actualizacoes" && (
              <SettingsSection title={pt ? "Actualizações da aplicação" : "App updates"} description={pt ? "Verificar novas versões do PayrollAO" : "Check for PayrollAO updates"} icon={<RefreshCw className="h-4 w-4" />} className="max-w-md">
                <CheckForUpdatesButton />
              </SettingsSection>
            )}

            {settingsTab === "provincia" && (
              <SettingsSection title={pt ? "Província actual" : "Current province"} description={pt ? "Base de dados isolada por província" : "Isolated database per province"} icon={<MapPin className="h-4 w-4" />} className="max-w-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg">
                  <div>
                    <p className="text-lg font-bold text-primary">{currentProvince || (pt ? "Não seleccionada" : "Not selected")}</p>
                    <p className="text-[10px] text-muted-foreground">{pt ? "Cada província tem BD independente" : "Each province has its own DB"}</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={handleChangeProvince}>
                    {pt ? "Mudar província" : "Change province"}
                  </Button>
                </div>
              </SettingsSection>
            )}

            {settingsTab === "rede" && <NetworkSettings />}

            {settingsTab === "basedados" && <DatabaseSettings />}

            {settingsTab === "backup-json" && (
              <SettingsSection title={t.settings.dataBackup || "Cópia de Segurança JSON"} description={t.settings.dataBackupDesc || "Exportar e importar dados"} icon={<Database className="h-4 w-4" />} className="max-w-3xl">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                  {[
                    { n: stats.employees, l: t.settings.employees || "Func." },
                    { n: stats.branches, l: t.settings.branches || "Filiais" },
                    { n: stats.payrollPeriods, l: t.settings.payrollPeriods || "Períodos" },
                    { n: stats.payrollEntries, l: t.settings.payrollEntries || "Registos" },
                    { n: stats.deductions, l: t.settings.deductionsCount || "Descontos" },
                  ].map((item) => (
                    <div key={item.l} className="text-center p-2 bg-muted/40 rounded-lg">
                      <p className="text-sm font-bold text-primary tabular-nums">{item.n}</p>
                      <p className="text-[10px] text-muted-foreground">{item.l}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 max-w-md">
                  <Button variant="accent" size="sm" className="h-8 text-xs flex-1 min-w-[130px]" onClick={handleExport}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    {t.settings.exportData || "Exportar"}
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs flex-1 min-w-[130px]" onClick={handleImportClick}>
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {t.settings.importData || "Importar"}
                  </Button>
                  <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
                </div>
              </SettingsSection>
            )}

            {settingsTab === "backup-sqlite" && <SQLiteBackupSettings />}

            {settingsTab === "reset" && <DataResetSettings />}
          </div>

          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-t border-border/40 bg-muted/20">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {isDirty ? (pt ? "Tem alterações não guardadas" : "You have unsaved changes") : (pt ? "Tudo guardado" : "All saved")}
            </span>
            <Button variant="accent" size="sm" className="h-8 text-xs ml-auto" onClick={handleSave} disabled={!isDirty || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  {pt ? "A guardar..." : "Saving..."}
                </>
              ) : (
                t.settings.saveChanges || "Guardar alterações"
              )}
            </Button>
          </div>
        </div>
      </div>
    </TopNavLayout>
  );
};

export default Settings;
