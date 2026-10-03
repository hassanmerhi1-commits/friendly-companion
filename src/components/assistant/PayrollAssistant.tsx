import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Loader2, Send, Settings2, X, ExternalLink, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { askAssistant, getBuiltinStatus, type AssistantReplySource } from "@/lib/assistant-ai";
import { hasOnlineKey, loadAssistantSettings } from "@/lib/assistant-settings";
import { AssistantRobotMascot } from "@/components/assistant/AssistantRobotMascot";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: AssistantReplySource;
  route?: string;
}

const SUGGESTIONS_PT = [
  "O que e o BRUTO na folha?",
  "Como marcar reformado?",
  "Onde adiciono categorias?",
  "Como calcular a folha?",
];

const SUGGESTIONS_EN = [
  "What is GROSS on payroll?",
  "How do I mark retired?",
  "Where do I add categories?",
  "How do I calculate payroll?",
];

function sourceLabel(source: AssistantReplySource | undefined, pt: boolean): string {
  switch (source) {
    case "offline":
      return pt ? "Ajuda local" : "Local help";
    case "builtin":
      return pt ? "IA gratuita" : "Free AI";
    case "gemini":
      return "Gemini";
    case "openai":
      return "ChatGPT";
    case "groq":
      return "Groq";
    default:
      return pt ? "Assistente" : "Assistant";
  }
}

export function PayrollAssistant() {
  const { language } = useLanguage();
  const pt = language === "pt";
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      text: pt
        ? "Ola! Sou o assistente do PayrollAO. Posso explicar ecrans e processos. Nao altero dados. Pergunte o que quiser."
        : "Hi! I am the PayrollAO assistant. I explain screens and processes. I never change data. Ask anything.",
      source: "offline",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const settings = loadAssistantSettings();
  const [builtinReady, setBuiltinReady] = useState(false);
  useEffect(() => {
    if (settings.provider !== "builtin") {
      setBuiltinReady(false);
      return;
    }
    getBuiltinStatus()
      .then((s) => setBuiltinReady(Boolean(s.configured)))
      .catch(() => setBuiltinReady(false));
  }, [settings.provider, open]);
  const onlineReady =
    online &&
    (settings.provider === "builtin" ? builtinReady : hasOnlineKey(settings));

  const ROBOT_W = 96;
  const ROBOT_H = 130;
  const POS_KEY = "payrollao-assistant-pos-v1";

  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origLeft: number;
    origTop: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const clampPos = (left: number, top: number) => {
    const maxL = Math.max(8, window.innerWidth - ROBOT_W - 8);
    const maxT = Math.max(8, window.innerHeight - ROBOT_H - 8);
    return {
      left: Math.min(maxL, Math.max(8, left)),
      top: Math.min(maxT, Math.max(8, top)),
    };
  };

  const defaultPos = () => {
    const gap = 12;
    return clampPos(window.innerWidth - ROBOT_W - gap, window.innerHeight - ROBOT_H - gap);
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { left: number; top: number };
        if (typeof parsed.left === "number" && typeof parsed.top === "number") {
          const maxL = Math.max(8, window.innerWidth - ROBOT_W - 8);
          const maxT = Math.max(8, window.innerHeight - ROBOT_H - 8);
          if (parsed.left > maxL + 20 || parsed.top > maxT + 20 || parsed.left < -20 || parsed.top < -20) {
            setPos(defaultPos());
          } else {
            setPos(clampPos(parsed.left, parsed.top));
          }
        } else {
          setPos(defaultPos());
        }
      } else {
        setPos(defaultPos());
      }
    } catch {
      setPos(defaultPos());
    }
    const onResize = () => {
      setPos((prev) => (prev ? clampPos(prev.left, prev.top) : defaultPos()));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!pos) return;
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(pos));
    } catch {}
  }, [pos]);

  const robotStyle: CSSProperties = {
    position: "fixed",
    zIndex: 80,
    left: pos?.left ?? 12,
    top: pos?.top ?? 12,
    transition: "none",
    cursor: dragging ? "grabbing" : "grab",
    touchAction: "none",
    userSelect: "none",
  };

  const onRobotPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: pos.left,
      origTop: pos.top,
      moved: false,
    };
    setDragging(true);
  };

  const onRobotPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || !dragging) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    setPos(clampPos(d.origLeft + dx, d.origTop + dy));
  };

  const onRobotPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    if (d?.moved) {
      suppressClickRef.current = true;
    }
  };

  const onRobotClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, busy]);

  if (!isAuthenticated || !pos) return null;

  const suggestions = pt ? SUGGESTIONS_PT : SUGGESTIONS_EN;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: q };
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    try {
      const reply = await askAssistant(q, pt ? "pt" : "en");
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: reply.text,
          source: reply.source,
          route: reply.route,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: pt
            ? `Erro: ${err instanceof Error ? err.message : String(err)}`
            : `Error: ${err instanceof Error ? err.message : String(err)}`,
          source: "fallback",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onRobotClick}
        onPointerDown={onRobotPointerDown}
        onPointerMove={onRobotPointerMove}
        onPointerUp={onRobotPointerUp}
        onPointerCancel={onRobotPointerUp}
        style={robotStyle}
        className={cn(
          "group flex flex-col items-center justify-end border-0 bg-transparent p-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
        )}
        title={pt ? "Arraste para reposicionar · clique para falar" : "Drag to reposition · click to chat"}
        aria-label={pt ? "Assistente PayrollAO" : "PayrollAO Assistant"}
      >
        <span className="mb-1 flex items-center gap-1">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm",
              "bg-primary text-primary-foreground"
            )}
          >
            {open ? (pt ? "Fechar" : "Close") : pt ? "Ajuda" : "Help"}
          </span>
        </span>
        <span className="relative">
          <AssistantRobotMascot open={open} busy={busy} />
          {open && (
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md ring-2 ring-background">
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </span>
      </button>

      {open && (
        <div
          className="fixed z-[80] flex w-[min(100vw-1.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          style={{
            maxHeight: "min(62vh, 520px)",
            left: Math.min(
              Math.max(8, (pos?.left ?? 12) - 280),
              Math.max(8, window.innerWidth - 392)
            ),
            top: Math.min(
              Math.max(8, (pos?.top ?? 12) - 360),
              Math.max(8, window.innerHeight - 420)
            ),
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-primary px-3 py-2.5 text-primary-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/15">
                <Bot className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {pt ? "Assistente PayrollAO" : "PayrollAO Assistant"}
                </p>
                <p className="text-[10px] opacity-90 flex items-center gap-1">
                  {onlineReady ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {onlineReady
                    ? pt
                      ? "IA online (gratuita/limitada ou chave)"
                      : "Online AI (free/limited or your key)"
                    : pt
                      ? "Offline / ajuda local - so leitura"
                      : "Offline / local help - read-only"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15"
              onClick={() => {
                setOpen(false);
                navigate("/settings");
              }}
              title={pt ? "Definicoes do assistente" : "Assistant settings"}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 bg-muted/20" style={{ minHeight: 220 }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-background border border-border rounded-bl-md shadow-sm"
                  )}
                >
                  {msg.text}
                  {msg.role === "assistant" && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {sourceLabel(msg.source, pt)}
                      </span>
                      {msg.route && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                          onClick={() => {
                            navigate(msg.route!);
                            setOpen(false);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {pt ? "Abrir ecran" : "Open screen"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {pt ? "A pensar..." : "Thinking..."}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {messages.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-3 py-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-border p-2.5 flex gap-2 items-end bg-card">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={pt ? "Pergunte sobre a folha, funcionarios..." : "Ask about payroll, employees..."}
              className="min-h-[44px] max-h-28 resize-none text-sm"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={busy || !input.trim()}
              onClick={() => send(input)}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
