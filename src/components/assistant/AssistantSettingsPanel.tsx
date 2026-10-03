import { useEffect, useState } from "react";
import { Bot, ExternalLink, Save, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/i18n";
import {
  loadAssistantSettings,
  saveAssistantSettings,
  type AssistantProvider,
  type AssistantSettings,
} from "@/lib/assistant-settings";
import { getBuiltinStatus } from "@/lib/assistant-ai";
import { toast } from "sonner";

export function AssistantSettingsPanel() {
  const { language } = useLanguage();
  const pt = language === "pt";
  const [form, setForm] = useState<AssistantSettings>(() => loadAssistantSettings());
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [freeKey, setFreeKey] = useState("");
  const [freeBackend, setFreeBackend] = useState<"groq" | "gemini">("groq");
  const [builtin, setBuiltin] = useState<{
    configured: boolean;
    remaining: number;
    dailyLimit: number;
    provider?: string;
  }>({ configured: false, remaining: 0, dailyLimit: 20 });

  const refreshBuiltin = async () => {
    try {
      setBuiltin(await getBuiltinStatus());
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    refreshBuiltin();
  }, []);

  const save = () => {
    saveAssistantSettings(form);
    toast.success(pt ? "Assistente guardado neste PC" : "Assistant saved on this PC");
  };

  const connectFreeAi = async () => {
    const key = freeKey.trim();
    if (!key) {
      toast.error(
        pt
          ? "Cole a chave gratuita Groq (gsk_...) ou Gemini"
          : "Paste the free Groq (gsk_...) or Gemini key"
      );
      return;
    }
    const api = (window as any).electronAPI;
    if (!api?.assistant?.saveBuiltinConfig) {
      toast.error(pt ? "Reinicie a app Electron e tente outra vez" : "Restart the Electron app and try again");
      return;
    }
    setConnecting(true);
    try {
      const saved = await api.assistant.saveBuiltinConfig({
        provider: freeBackend,
        apiKey: key,
        dailyLimit: 20,
      });
      if (!saved?.success) {
        toast.error(saved?.error || (pt ? "Chave invalida" : "Invalid key"));
        return;
      }
      saveAssistantSettings({
        ...form,
        provider: "builtin",
        onlineEnabled: true,
      });
      setForm((f) => ({ ...f, provider: "builtin", onlineEnabled: true }));
      await refreshBuiltin();

      // live test
      const system = pt
        ? "Es o assistente PayrollAO. Responde so: OK ligado."
        : "You are PayrollAO assistant. Reply only: OK connected.";
      const test = api.assistant.chatBuiltin
        ? await api.assistant.chatBuiltin({ system, question: "ping" })
        : await api.assistant.chat({ provider: "builtin", apiKey: "", system, question: "ping" });
      if (test?.success) {
        toast.success(pt ? "IA gratuita ligada com sucesso" : "Free AI connected successfully");
        setFreeKey("");
        await refreshBuiltin();
      } else {
        toast.error(test?.error || (pt ? "Chave guardada mas o teste falhou" : "Key saved but test failed"));
      }
    } catch (e: any) {
      toast.error(e?.message || String(e));
    } finally {
      setConnecting(false);
    }
  };

  const testConnection = async () => {
    if (form.provider === "offline") {
      toast.message(pt ? "Escolha um fornecedor online" : "Pick an online provider");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error(pt ? "Sem internet neste PC" : "No internet on this PC");
      return;
    }
    const api = (window as any).electronAPI;
    if (!api?.assistant?.chat) {
      toast.error(pt ? "Reinicie a app Electron para activar a ligacao IA" : "Restart Electron app to enable AI link");
      return;
    }

    const key =
      form.provider === "openai"
        ? form.openaiApiKey.trim()
        : form.provider === "gemini"
          ? form.geminiApiKey.trim()
          : form.provider === "groq"
            ? form.groqApiKey.trim()
            : "";

    if (form.provider === "builtin" && !builtin.configured) {
      toast.error(
        pt
          ? "Primeiro ligue a IA gratuita (cole a chave Groq acima)"
          : "Connect free AI first (paste Groq key above)"
      );
      return;
    }
    if (form.provider !== "builtin" && !key) {
      toast.error(pt ? "Cole a chave API primeiro" : "Paste the API key first");
      return;
    }

    setTesting(true);
    try {
      saveAssistantSettings({ ...form, onlineEnabled: true });
      const system = pt
        ? "Es o assistente PayrollAO. Responde so: OK ligado."
        : "You are PayrollAO assistant. Reply only: OK connected.";
      const question = pt ? "Teste de ligacao a internet." : "Internet connection test.";
      const result =
        form.provider === "builtin" && api.assistant.chatBuiltin
          ? await api.assistant.chatBuiltin({ system, question })
          : await api.assistant.chat({
              provider: form.provider,
              apiKey: key,
              system,
              question,
            });
      if (result?.success && result.text) {
        toast.success(pt ? "Internet + IA OK" : "Internet + AI OK");
        await refreshBuiltin();
      } else {
        toast.error(result?.error || (pt ? "Falha no teste" : "Test failed"));
      }
    } catch (e: any) {
      toast.error(e?.message || String(e));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="stat-card max-w-2xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">
            {pt ? "Assistente IA (so leitura)" : "AI Assistant (read-only)"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {pt
              ? "OpenAI ChatGPT nao e gratis. Para IA gratuita use Groq (ou Gemini) uma vez abaixo. Depois o robot responde online com limite diario."
              : "OpenAI ChatGPT is not free. For free AI connect Groq (or Gemini) once below. Then the robot answers online with a daily limit."}
          </p>
        </div>
      </div>

      <div
        className={
          builtin.configured
            ? "rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px]"
            : "rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px]"
        }
      >
        {builtin.configured
          ? pt
            ? `Ligado: IA gratuita activa (${builtin.remaining}/${builtin.dailyLimit} hoje, ${builtin.provider}).`
            : `Connected: free AI active (${builtin.remaining}/${builtin.dailyLimit} today, ${builtin.provider}).`
          : pt
            ? "Ainda NAO ligado. Precisa de uma chave gratuita Groq (1 minuto)."
            : "NOT connected yet. Needs one free Groq key (1 minute)."}
      </div>

      {!builtin.configured && (
        <div className="space-y-3 rounded-md border border-border/60 p-3">
          <p className="text-xs font-medium">
            {pt ? "Ligar IA gratuita (recomendado)" : "Connect free AI (recommended)"}
          </p>
          <ol className="list-decimal pl-4 text-[11px] text-muted-foreground space-y-1">
            <li>
              {pt ? "Abra " : "Open "}
              <a
                className="text-primary underline inline-flex items-center gap-0.5"
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
              >
                console.groq.com/keys <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>{pt ? "Crie conta gratis e copie a chave gsk_..." : "Create free account and copy gsk_... key"}</li>
            <li>{pt ? "Cole aqui e clique Ligar" : "Paste here and click Connect"}</li>
          </ol>
          <div className="space-y-1.5">
            <Label className="text-xs">{pt ? "Backend gratis" : "Free backend"}</Label>
            <Select value={freeBackend} onValueChange={(v) => setFreeBackend(v as "groq" | "gemini")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="groq">Groq (gratis) — recomendado</SelectItem>
                <SelectItem value="gemini">Google Gemini (gratis)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              {freeBackend === "groq" ? "Groq API key" : "Gemini API key"}
            </Label>
            <Input
              className="h-8 text-xs"
              type="password"
              value={freeKey}
              onChange={(e) => setFreeKey(e.target.value)}
              placeholder={freeBackend === "groq" ? "gsk_..." : "AIza..."}
            />
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={connectFreeAi} disabled={connecting}>
            <Wifi className="h-3.5 w-3.5" />
            {connecting
              ? pt
                ? "A ligar..."
                : "Connecting..."
              : pt
                ? "Ligar IA gratuita"
                : "Connect free AI"}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 py-2 border-b border-border/40">
        <div>
          <p className="text-xs font-medium">{pt ? "Activar IA online" : "Enable online AI"}</p>
          <p className="text-[10px] text-muted-foreground">
            {pt ? "Se desligado, usa so a ajuda local" : "If off, uses local help only"}
          </p>
        </div>
        <Switch
          checked={form.onlineEnabled}
          onCheckedChange={(checked) => setForm((f) => ({ ...f, onlineEnabled: checked }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{pt ? "Fornecedor" : "Provider"}</Label>
        <Select
          value={form.provider}
          onValueChange={(v) => {
            const provider = v as AssistantProvider;
            setForm((f) => ({
              ...f,
              provider,
              onlineEnabled: provider === "offline" ? false : true,
            }));
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="builtin">
              {pt ? "IA gratuita integrada (Groq/Gemini)" : "Built-in free AI (Groq/Gemini)"}
            </SelectItem>
            <SelectItem value="offline">{pt ? "So offline" : "Offline only"}</SelectItem>
            <SelectItem value="gemini">Google Gemini (chave propria)</SelectItem>
            <SelectItem value="openai">OpenAI ChatGPT (pago / chave propria)</SelectItem>
            <SelectItem value="groq">Groq (chave propria)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.provider === "gemini" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Gemini API key</Label>
          <Input
            className="h-8 text-xs"
            type="password"
            value={form.geminiApiKey}
            onChange={(e) => setForm((f) => ({ ...f, geminiApiKey: e.target.value }))}
            placeholder="AIza..."
          />
        </div>
      )}

      {form.provider === "openai" && (
        <div className="space-y-1.5">
          <Label className="text-xs">OpenAI API key (nao e gratis)</Label>
          <Input
            className="h-8 text-xs"
            type="password"
            value={form.openaiApiKey}
            onChange={(e) => setForm((f) => ({ ...f, openaiApiKey: e.target.value, onlineEnabled: true }))}
            placeholder="sk-..."
          />
          <p className="text-[10px] text-muted-foreground">
            {pt
              ? "OpenAI exige conta com billing. Para gratis use a seccao Ligar IA gratuita (Groq)."
              : "OpenAI needs billing. For free use Connect free AI (Groq) above."}
          </p>
        </div>
      )}

      {form.provider === "groq" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Groq API key</Label>
          <Input
            className="h-8 text-xs"
            type="password"
            value={form.groqApiKey}
            onChange={(e) => setForm((f) => ({ ...f, groqApiKey: e.target.value }))}
            placeholder="gsk_..."
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={save}>
          <Save className="h-3.5 w-3.5" />
          {pt ? "Guardar" : "Save"}
        </Button>
        {form.provider !== "offline" && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={testConnection}
            disabled={testing}
          >
            <Wifi className="h-3.5 w-3.5" />
            {testing ? (pt ? "A testar..." : "Testing...") : pt ? "Testar ligacao" : "Test connection"}
          </Button>
        )}
      </div>
    </div>
  );
}
