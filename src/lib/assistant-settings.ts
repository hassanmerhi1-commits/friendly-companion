/** Local-only assistant settings (API keys stay on this PC — not synced to DB). */

export type AssistantProvider = 'builtin' | 'offline' | 'gemini' | 'openai' | 'groq';

export interface AssistantSettings {
  provider: AssistantProvider;
  geminiApiKey: string;
  openaiApiKey: string;
  groqApiKey: string;
  onlineEnabled: boolean;
}

const STORAGE_KEY = 'payrollao-assistant-settings-v1';

const defaults: AssistantSettings = {
  provider: 'builtin',
  geminiApiKey: '',
  openaiApiKey: '',
  groqApiKey: '',
  onlineEnabled: true,
};

export function loadAssistantSettings(): AssistantSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<AssistantSettings>;
    const merged = { ...defaults, ...parsed };
    // Migrate: old offline-only installs -> built-in free AI
    const hasPersonalKey = Boolean(
      (merged.geminiApiKey || "").trim() ||
        (merged.openaiApiKey || "").trim() ||
        (merged.groqApiKey || "").trim()
    );
    if (merged.provider === "offline" && !hasPersonalKey) {
      merged.provider = "builtin";
      merged.onlineEnabled = true;
    }
    return merged;
  } catch {
    return { ...defaults };
  }
}

export function saveAssistantSettings(patch: Partial<AssistantSettings>): AssistantSettings {
  const next = { ...loadAssistantSettings(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function hasOnlineKey(settings: AssistantSettings = loadAssistantSettings()): boolean {
  if (!settings.onlineEnabled) return false;
  if (settings.provider === 'offline') return false;
  if (settings.provider === 'builtin') return true; // company built-in key (Electron)
  if (settings.provider === 'gemini') return Boolean(settings.geminiApiKey.trim());
  if (settings.provider === 'openai') return Boolean(settings.openaiApiKey.trim());
  if (settings.provider === 'groq') return Boolean(settings.groqApiKey.trim());
  return false;
}
