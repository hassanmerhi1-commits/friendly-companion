import {
  buildSystemPrompt,
  bestOfflineAnswer,
  overviewAnswer,
} from '@/lib/assistant-knowledge';
import {
  hasOnlineKey,
  loadAssistantSettings,
  type AssistantSettings,
} from '@/lib/assistant-settings';

export type AssistantReplySource = 'offline' | 'builtin' | 'gemini' | 'openai' | 'groq' | 'fallback';

export interface AssistantReply {
  text: string;
  source: AssistantReplySource;
  route?: string;
  offlineOnly?: boolean;
  remaining?: number;
}

type OnlineProvider = 'builtin' | 'gemini' | 'openai' | 'groq';

function getElectronAssistant():
  | {
      chat: (payload: Record<string, string>) => Promise<{
        success: boolean;
        text?: string;
        error?: string;
        provider?: string;
        remaining?: number;
        quota?: { remaining?: number };
        limitReached?: boolean;
      }>;
      chatBuiltin?: (payload: Record<string, string>) => Promise<any>;
      builtinStatus?: () => Promise<any>;
    }
  | null {
  if (typeof window === 'undefined') return null;
  const api = (window as any).electronAPI;
  if (api?.isElectron && api?.assistant?.chat) return api.assistant;
  return null;
}

export async function getBuiltinStatus(): Promise<{
  configured: boolean;
  remaining: number;
  dailyLimit: number;
  provider?: string;
}> {
  const assistant = getElectronAssistant();
  if (!assistant?.builtinStatus) {
    return { configured: false, remaining: 0, dailyLimit: 20 };
  }
  try {
    const s = await assistant.builtinStatus();
    return {
      configured: Boolean(s?.configured),
      remaining: Number(s?.remaining || 0),
      dailyLimit: Number(s?.dailyLimit || 20),
      provider: s?.provider,
    };
  } catch {
    return { configured: false, remaining: 0, dailyLimit: 20 };
  }
}

function getApiKey(settings: AssistantSettings, provider: OnlineProvider): string {
  if (provider === 'builtin') return '';
  if (provider === 'gemini') return settings.geminiApiKey.trim();
  if (provider === 'openai') return settings.openaiApiKey.trim();
  return settings.groqApiKey.trim();
}

async function callOnlineViaElectron(
  provider: OnlineProvider,
  apiKey: string,
  system: string,
  question: string
): Promise<{ text: string; remaining?: number }> {
  const assistant = getElectronAssistant();
  if (!assistant) throw new Error('Electron assistant bridge missing');

  if (provider === 'builtin') {
    const result = assistant.chatBuiltin
      ? await assistant.chatBuiltin({ system, question })
      : await assistant.chat({ provider: 'builtin', apiKey: '', system, question });
    if (!result?.success || !result.text) {
      const err = new Error(result?.error || 'Builtin AI failed') as Error & {
        limitReached?: boolean;
        remaining?: number;
      };
      err.limitReached = Boolean(result?.limitReached);
      err.remaining = result?.quota?.remaining;
      throw err;
    }
    return { text: result.text.trim(), remaining: result?.quota?.remaining };
  }

  const result = await assistant.chat({ provider, apiKey, system, question });
  if (!result?.success || !result.text) {
    throw new Error(result?.error || 'Online AI failed');
  }
  return { text: result.text.trim() };
}

async function callGeminiBrowser(apiKey: string, system: string, question: string): Promise<string> {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
    encodeURIComponent(apiKey);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: system + '\n\nPergunta do utilizador:\n' + question }],
        },
      ],
      generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
    }),
  });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error('Gemini: ' + res.status + ' ' + raw.slice(0, 120));
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || '';
  if (!text.trim()) throw new Error('Gemini: empty response');
  return text.trim();
}

async function callOpenAICompatibleBrowser(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  question: string
): Promise<string> {
  const res = await fetch(baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 900,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question },
      ],
    }),
  });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error('AI: ' + res.status + ' ' + raw.slice(0, 120));
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text.trim()) throw new Error('AI: empty response');
  return text.trim();
}

async function callOnline(
  provider: OnlineProvider,
  apiKey: string,
  system: string,
  question: string
): Promise<{ text: string; remaining?: number }> {
  if (getElectronAssistant()) {
    return callOnlineViaElectron(provider, apiKey, system, question);
  }
  if (provider === 'builtin') {
    throw new Error('Builtin AI needs the PayrollAO desktop app (Electron)');
  }
  if (provider === 'gemini') {
    return { text: await callGeminiBrowser(apiKey, system, question) };
  }
  if (provider === 'openai') {
    return {
      text: await callOpenAICompatibleBrowser(
        'https://api.openai.com/v1',
        apiKey,
        'gpt-4o-mini',
        system,
        question
      ),
    };
  }
  return {
    text: await callOpenAICompatibleBrowser(
      'https://api.groq.com/openai/v1',
      apiKey,
      'llama-3.3-70b-versatile',
      system,
      question
    ),
  };
}

function matchGreeting(question: string, language: 'pt' | 'en'): AssistantReply | null {
  const q = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[!?.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const greetings = [
    'bom dia', 'boa tarde', 'boa noite', 'ola', 'oi', 'hello', 'hi', 'hey',
    'tudo bem', 'obrigado', 'obrigada', 'thanks', 'thank you', 'bomdia',
  ];
  const hit = greetings.some((g) => q === g || q.startsWith(g + ' '));
  if (!hit) return null;
  return {
    text:
      language === 'pt'
        ? 'Bom dia! Pronto para ajudar com o PayrollAO. Pergunte sobre folha, funcionarios, deducoes, presencas, relatorios, RH, ferias ou definicoes. Eu so explico - nao altero dados.'
        : 'Hello! Ready to help with PayrollAO. Ask about payroll, employees, deductions, attendance, reports, HR, holidays or settings. I only explain - I never change data.',
    source: 'offline',
  };
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function resolveOnlineProvider(settings: AssistantSettings): OnlineProvider | null {
  if (!settings.onlineEnabled) return null;
  if (settings.provider === 'offline') return null;
  if (!hasOnlineKey(settings)) return null;
  return settings.provider as OnlineProvider;
}

export async function askAssistant(
  question: string,
  language: 'pt' | 'en',
  settings: AssistantSettings = loadAssistantSettings()
): Promise<AssistantReply> {
  const q = question.trim();
  if (!q) {
    return {
      text: language === 'pt' ? 'Escreva uma pergunta.' : 'Type a question.',
      source: 'fallback',
    };
  }

  const greeted = matchGreeting(q, language);
  if (greeted) return greeted;

  const offline = bestOfflineAnswer(q, language);
  let provider = resolveOnlineProvider(settings);
  let canOnline = Boolean(provider) && isOnline();

  // Builtin needs a real company key; otherwise stay on local help (no scary API errors)
  if (canOnline && provider === 'builtin') {
    const st = await getBuiltinStatus();
    if (!st.configured) {
      canOnline = false;
      provider = null;
    }
  }

  if (canOnline && provider) {
    const system = buildSystemPrompt(language);
    const apiKey = getApiKey(settings, provider);
    try {
      const result = await callOnline(provider, apiKey, system, q);
      return {
        text: result.text,
        source: provider === 'builtin' ? 'builtin' : provider,
        route: offline?.route,
        remaining: result.remaining,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const limitReached = Boolean((err as any)?.limitReached);
      if (limitReached) {
        const base = offline?.text || overviewAnswer(language).text;
        return {
          text:
            (language === 'pt'
              ? 'Limite diario da IA gratuita esgotado. Resposta local:\n\n'
              : 'Daily free AI limit reached. Local answer:\n\n') + base,
          source: 'offline',
          route: offline?.route || overviewAnswer(language).route,
          remaining: 0,
        };
      }
      if (offline) {
        return {
          text:
            (language === 'pt'
              ? 'A IA online falhou (' + msg + '). Resposta local do PayrollAO:\n\n'
              : 'Online AI failed (' + msg + '). Local PayrollAO answer:\n\n') + offline.text,
          source: 'offline',
          route: offline.route,
        };
      }
      return {
        text:
          language === 'pt'
            ? 'Nao consegui contactar a IA (' + msg + '). Uso a ajuda local do PayrollAO por agora.'
            : 'Could not reach AI (' + msg + '). Using local PayrollAO help for now.',
        source: 'fallback',
        offlineOnly: true,
      };
    }
  }

  if (offline) {
    return {
      text: offline.text,
      source: 'offline',
      route: offline.route,
    };
  }

  const overview = overviewAnswer(language);
  return {
    text: overview.text,
    source: 'offline',
    route: overview.route,
  };
}
