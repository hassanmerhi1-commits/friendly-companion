import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, Bell, Shield, CreditCard } from "lucide-react";

const Settings = () => {
  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-display font-bold text-foreground">
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerir as configurações do sistema de folha salarial
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Info */}
          <div className="stat-card animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">Informações da Empresa</h2>
                <p className="text-sm text-muted-foreground">Dados básicos da organização</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Nome da Empresa</Label>
                <Input id="company" defaultValue="Empresa Exemplo, Lda" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nif">NIF</Label>
                <Input id="nif" defaultValue="5000123456" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Morada</Label>
                <Input id="address" defaultValue="Rua dos Coqueiros, 123" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" defaultValue="Luanda" />
              </div>
            </div>
          </div>

          {/* Payment Settings */}
          <div className="stat-card animate-slide-up" style={{ animationDelay: "50ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">Configurações de Pagamento</h2>
                <p className="text-sm text-muted-foreground">Dados bancários e pagamentos</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank">Banco</Label>
                <Input id="bank" defaultValue="Banco Angolano de Investimentos" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input id="iban" defaultValue="AO06 0000 0000 0000 0000 0000 0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payday">Dia de Pagamento</Label>
                <Input id="payday" type="number" defaultValue="27" min="1" max="31" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Moeda</Label>
                <Input id="currency" defaultValue="AOA (Kwanza)" disabled />
              </div>
            </div>
          </div>

          {/* Tax Settings */}
          <div className="stat-card animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-foreground">Impostos e Contribuições</h2>
                <p className="text-sm text-muted-foreground">Taxas de IRT e Segurança Social</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: "Taxa de IRT (Imposto sobre Rendimento)", value: "Conforme tabela progressiva", enabled: true },
                { label: "Contribuição INSS (Trabalhador)", value: "3%", enabled: true },
                { label: "Contribuição INSS (Entidade)", value: "8%", enabled: true },
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

        {/* Sidebar Settings */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="stat-card animate-slide-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Bell className="h-5 w-5" />
              </div>
              <h2 className="font-display font-semibold text-foreground">Notificações</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: "Email de pagamento processado", enabled: true },
                { label: "Lembrete de fim de mês", enabled: true },
                { label: "Alertas de férias", enabled: false },
                { label: "Novos funcionários", enabled: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{item.label}</span>
                  <Switch checked={item.enabled} />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <Button variant="accent" size="lg" className="w-full">
            Guardar Alterações
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
