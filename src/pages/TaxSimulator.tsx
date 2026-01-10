import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Calculator, RefreshCw } from "lucide-react";
import { calculateIRT, calculateINSS, formatAOA, IRT_BRACKETS, IRT_ALLOWANCE_EXEMPTION, getIRTTaxableAllowance } from "@/lib/angola-labor-law";
import { useLanguage } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subsidy {
  id: string;
  type: string;
  label: string;
  value: number;
}

const SUBSIDY_TYPES = [
  { value: "natal", label: "Subsídio de Natal" },
  { value: "ferias", label: "Subsídio de Férias" },
  { value: "alimentacao", label: "Subsídio de Alimentação" },
  { value: "transporte", label: "Subsídio de Transporte" },
  { value: "abono_familia", label: "Subsídio Abono de Família" },
  { value: "outro", label: "Outro Subsídio" },
];

const TaxSimulator = () => {
  const { t } = useLanguage();
  const [taxGroup, setTaxGroup] = useState<"A" | "B" | "C">("A");
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [newSubsidyType, setNewSubsidyType] = useState<string>("");

  // Calculate totals based on subsidies
  const getSubsidyTotal = (type: string): number => {
    return subsidies
      .filter(s => s.type === type)
      .reduce((sum, s) => sum + s.value, 0);
  };

  const subsidioNatal = getSubsidyTotal("natal");
  const subsidioFerias = getSubsidyTotal("ferias");
  const subsidioAlimentacao = getSubsidyTotal("alimentacao");
  const subsidioTransporte = getSubsidyTotal("transporte");
  const abonoFamilia = getSubsidyTotal("abono_familia");
  const outrosSubsidios = getSubsidyTotal("outro");

  // INSS Base: Base + Natal + Alimentação + Transporte + Abono + Outros (NOT Férias)
  const inssBase = baseSalary + subsidioNatal + subsidioAlimentacao + subsidioTransporte + abonoFamilia + outrosSubsidios;
  const { employeeContribution: inssEmployee } = calculateINSS(inssBase, false);

  // IRT Taxable: 
  // - Base salary: fully taxable
  // - Alimentação: only EXCESS above 30,000 Kz
  // - Transporte: only EXCESS above 30,000 Kz
  // - Natal: fully taxable
  // - Férias: fully taxable
  // - Outros: fully taxable
  // NOT included: Abono de Família
  const taxableAlimentacao = getIRTTaxableAllowance(subsidioAlimentacao);
  const taxableTransporte = getIRTTaxableAllowance(subsidioTransporte);
  
  const irtTaxableGross = baseSalary + taxableAlimentacao + taxableTransporte + 
                          subsidioNatal + subsidioFerias + outrosSubsidios;
  
  // Rendimento Coletável = IRT Taxable - INSS
  const rendimentoColetavel = irtTaxableGross - inssEmployee;
  
  // Calculate IRT
  const irt = calculateIRT(rendimentoColetavel);

  // Total gross salary (for display - includes everything)
  const grossSalary = baseSalary + subsidioNatal + subsidioFerias + subsidioAlimentacao + 
                      subsidioTransporte + abonoFamilia + outrosSubsidios;

  // Net salary
  const netSalary = grossSalary - inssEmployee - irt;

  // Find current IRT bracket (current table - exempt up to 100,000)
  const currentBracket = IRT_BRACKETS.find(
    b => rendimentoColetavel >= b.min && rendimentoColetavel <= b.max
  );
  const escalaoIndex = currentBracket ? IRT_BRACKETS.indexOf(currentBracket) + 1 : 1;

  const addSubsidy = () => {
    if (!newSubsidyType) return;
    
    const subsidyDef = SUBSIDY_TYPES.find(s => s.value === newSubsidyType);
    if (!subsidyDef) return;

    setSubsidies([
      ...subsidies,
      {
        id: crypto.randomUUID(),
        type: newSubsidyType,
        label: subsidyDef.label,
        value: 0,
      },
    ]);
    setNewSubsidyType("");
  };

  const updateSubsidyValue = (id: string, value: number) => {
    setSubsidies(subsidies.map(s => 
      s.id === id ? { ...s, value: Math.max(0, value) } : s
    ));
  };

  const removeSubsidy = (id: string) => {
    setSubsidies(subsidies.filter(s => s.id !== id));
  };

  const clearAll = () => {
    setBaseSalary(0);
    setSubsidies([]);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Simulador Tributário IRT
          </h1>
          <p className="text-muted-foreground mt-1">
            Calcule o IRT e INSS conforme legislação angolana vigente
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Tax Group Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Seleccione o seu Grupo de Tributação*</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {(["A", "B", "C"] as const).map((group) => (
                    <Button
                      key={group}
                      variant={taxGroup === group ? "default" : "outline"}
                      onClick={() => setTaxGroup(group)}
                      className="flex-1"
                    >
                      Grupo {group}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {taxGroup === "A" && "Trabalhadores por conta de outrem (empregados)"}
                  {taxGroup === "B" && "Trabalhadores por conta própria (profissionais liberais)"}
                  {taxGroup === "C" && "Trabalhadores por conta de outrem - sector público"}
                </p>
              </CardContent>
            </Card>

            {/* Base Salary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Sector e Salário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Sector*</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm">
                    Empresarial Público e Privado
                  </div>
                </div>
                <div>
                  <Label htmlFor="baseSalary">Salário Base*</Label>
                  <div className="relative mt-1">
                    <Input
                      id="baseSalary"
                      type="number"
                      min={0}
                      value={baseSalary || ""}
                      onChange={(e) => setBaseSalary(Number(e.target.value) || 0)}
                      placeholder="0,00"
                      className="pr-12 text-right"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      KZ
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subsidies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Subsídios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subsidies.map((subsidy) => (
                  <div key={subsidy.id} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm text-primary truncate block">
                        {subsidy.label}
                      </Label>
                    </div>
                    <div className="relative w-40">
                      <Input
                        type="number"
                        min={0}
                        value={subsidy.value || ""}
                        onChange={(e) => updateSubsidyValue(subsidy.id, Number(e.target.value) || 0)}
                        placeholder="0,00"
                        className="pr-12 text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        KZ
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeSubsidy(subsidy.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {/* Add Subsidy */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Select value={newSubsidyType} onValueChange={setNewSubsidyType}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar subsídio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSIDY_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="default"
                    onClick={addSubsidy}
                    disabled={!newSubsidyType}
                    className="bg-primary"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
              <CardContent className="pt-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Calculator className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-muted-foreground">Imposto a Pagar</h2>
                  <p className="text-4xl font-bold text-primary mt-2">
                    {formatNumber(irt)} Kz
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-muted-foreground">Segurança Social (3%)</span>
                    <span className="font-semibold">{formatNumber(inssEmployee)} Kz</span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b">
                    <span className="text-muted-foreground">Valor Líquido Previsto</span>
                    <span className="font-semibold text-success">{formatNumber(netSalary)} Kz</span>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <span className="text-muted-foreground">Grupo de Tributação</span>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {taxGroup}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="default"
                  className="w-full mt-6 bg-primary hover:bg-primary/90"
                  onClick={clearAll}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </CardContent>
            </Card>

            {/* Calculation Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Detalhes do Cálculo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium text-foreground">Base INSS (3%)</h4>
                  <p className="text-xs text-muted-foreground mb-2">Não inclui: Subsídio de Férias</p>
                  <div className="text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Salário Base</span>
                      <span>{formatNumber(baseSalary)}</span>
                    </div>
                    {subsidioNatal > 0 && (
                      <div className="flex justify-between">
                        <span>+ Subsídio de Natal</span>
                        <span>{formatNumber(subsidioNatal)}</span>
                      </div>
                    )}
                    {subsidioAlimentacao > 0 && (
                      <div className="flex justify-between">
                        <span>+ Alimentação</span>
                        <span>{formatNumber(subsidioAlimentacao)}</span>
                      </div>
                    )}
                    {subsidioTransporte > 0 && (
                      <div className="flex justify-between">
                        <span>+ Transporte</span>
                        <span>{formatNumber(subsidioTransporte)}</span>
                      </div>
                    )}
                    {abonoFamilia > 0 && (
                      <div className="flex justify-between">
                        <span>+ Abono de Família</span>
                        <span>{formatNumber(abonoFamilia)}</span>
                      </div>
                    )}
                    {outrosSubsidios > 0 && (
                      <div className="flex justify-between">
                        <span>+ Outros Subsídios</span>
                        <span>{formatNumber(outrosSubsidios)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>= Base INSS</span>
                      <span>{formatNumber(inssBase)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-destructive">
                      <span>INSS (3%)</span>
                      <span>-{formatNumber(inssEmployee)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="font-medium text-foreground">Base IRT (Rendimento Coletável)</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Alimentação/Transporte: isento até 30.000 Kz • Não inclui: Abono de Família
                  </p>
                  <div className="text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Salário Base</span>
                      <span>{formatNumber(baseSalary)}</span>
                    </div>
                    {subsidioAlimentacao > 0 && (
                      <div className="flex justify-between">
                        <span>+ Alimentação (excesso de 30.000)</span>
                        <span>{formatNumber(taxableAlimentacao)}</span>
                      </div>
                    )}
                    {subsidioTransporte > 0 && (
                      <div className="flex justify-between">
                        <span>+ Transporte (excesso de 30.000)</span>
                        <span>{formatNumber(taxableTransporte)}</span>
                      </div>
                    )}
                    {subsidioNatal > 0 && (
                      <div className="flex justify-between">
                        <span>+ Subsídio de Natal</span>
                        <span>{formatNumber(subsidioNatal)}</span>
                      </div>
                    )}
                    {subsidioFerias > 0 && (
                      <div className="flex justify-between">
                        <span>+ Subsídio de Férias</span>
                        <span>{formatNumber(subsidioFerias)}</span>
                      </div>
                    )}
                    {outrosSubsidios > 0 && (
                      <div className="flex justify-between">
                        <span>+ Outros Subsídios</span>
                        <span>{formatNumber(outrosSubsidios)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>= Total Tributável Bruto</span>
                      <span>{formatNumber(irtTaxableGross)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>- INSS</span>
                      <span>-{formatNumber(inssEmployee)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>= Rendimento Coletável</span>
                      <span>{formatNumber(rendimentoColetavel)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-primary/5 rounded-lg space-y-2 border border-primary/20">
                  <h4 className="font-medium text-foreground">Cálculo IRT - {escalaoIndex}º Escalão</h4>
                  {currentBracket && rendimentoColetavel > 100_000 ? (
                    <div className="text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Parcela Fixa</span>
                        <span>{formatNumber(currentBracket.fixedAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Excesso de {formatNumber(currentBracket.excessOver)}</span>
                        <span>{formatNumber(rendimentoColetavel - currentBracket.excessOver)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa</span>
                        <span>{(currentBracket.rate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between font-medium text-primary border-t pt-1">
                        <span>IRT a Pagar</span>
                        <span>{formatNumber(irt)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-success font-medium">
                      Isento de IRT (até 100.000 Kz)
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* IRT Table Reference */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Tabela IRT (Vigente)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Escalão</th>
                        <th className="text-right py-2">Até (Kz)</th>
                        <th className="text-right py-2">P. Fixa</th>
                        <th className="text-right py-2">Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {IRT_BRACKETS.map((bracket, idx) => (
                        <tr 
                          key={idx} 
                          className={`border-b ${idx + 1 === escalaoIndex ? 'bg-primary/10 font-medium' : ''}`}
                        >
                          <td className="py-1.5">{idx + 1}º</td>
                          <td className="text-right py-1.5">
                            {bracket.max === Infinity ? '∞' : formatNumber(bracket.max)}
                          </td>
                          <td className="text-right py-1.5">{formatNumber(bracket.fixedAmount)}</td>
                          <td className="text-right py-1.5">
                            {bracket.rate === 0 ? 'Isento' : `${(bracket.rate * 100).toFixed(1)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TaxSimulator;
