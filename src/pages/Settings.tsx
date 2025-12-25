import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, Bell, Shield, CreditCard } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

const Settings = () => {
  const { t } = useLanguage();

  return (
    <MainLayout>
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground">{t.settings.title}</h1>
        <p className="text-muted-foreground mt-1">{t.settings.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
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
              <div className="space-y-2"><Label>{t.settings.companyName}</Label><Input defaultValue="Empresa Exemplo, Lda" /></div>
              <div className="space-y-2"><Label>{t.settings.nif}</Label><Input defaultValue="5000123456" /></div>
              <div className="space-y-2"><Label>{t.settings.address}</Label><Input defaultValue="Rua dos Coqueiros, 123" /></div>
              <div className="space-y-2"><Label>{t.settings.city}</Label><Input defaultValue="Luanda" /></div>
            </div>
          </div>

          <div className="stat-card animate-slide-up" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><CreditCard className="h-5 w-5" /></div>
              <div><h2 className="font-display font-semibold text-foreground">{t.settings.paymentSettings}</h2><p className="text-sm text-muted-foreground">{t.settings.bankingData}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t.settings.bank}</Label><Input defaultValue="Banco Angolano de Investimentos" /></div>
              <div className="space-y-2"><Label>{t.settings.iban}</Label><Input defaultValue="AO06 0000 0000 0000 0000 0000 0" /></div>
              <div className="space-y-2"><Label>{t.settings.payday}</Label><Input type="number" defaultValue="27" min="1" max="31" /></div>
              <div className="space-y-2"><Label>{t.settings.currency}</Label><Input defaultValue="AOA (Kwanza)" disabled /></div>
            </div>
          </div>

          <div className="stat-card animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><Shield className="h-5 w-5" /></div>
              <div><h2 className="font-display font-semibold text-foreground">{t.settings.taxSettings}</h2><p className="text-sm text-muted-foreground">{t.settings.taxRates}</p></div>
            </div>
            <div className="space-y-4">
              {[
                { label: t.settings.irtRate, value: t.settings.progressiveTable, enabled: true },
                { label: t.settings.inssWorker, value: "3%", enabled: true },
                { label: t.settings.inssEmployer, value: "15%", enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div><p className="font-medium text-foreground">{item.label}</p><p className="text-sm text-muted-foreground">{item.value}</p></div>
                  <Switch checked={item.enabled} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="stat-card animate-slide-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><Bell className="h-5 w-5" /></div>
              <h2 className="font-display font-semibold text-foreground">{t.settings.notifications}</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: t.settings.emailPaymentProcessed, enabled: true },
                { label: t.settings.monthEndReminder, enabled: true },
                { label: t.settings.holidayAlerts, enabled: false },
                { label: t.settings.newEmployees, enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <Switch checked={item.enabled} />
                </div>
              ))}
            </div>
          </div>
          <Button variant="accent" size="lg" className="w-full">{t.settings.saveChanges}</Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
