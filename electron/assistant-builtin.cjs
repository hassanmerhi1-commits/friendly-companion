const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_DAILY_LIMIT = 20;

function isValidApiKey(apiKey, provider) {
  const k = String(apiKey || "").trim();
  if (!k) return false;
  const lower = k.toLowerCase();
  if (lower.includes("paste") || lower.includes("your_") || lower.includes("your-") || lower.includes("here")) return false;
  if (lower.includes("xxxx") || lower.includes("changeme") || lower.includes("example")) return false;
  if (provider === "groq" && !k.startsWith("gsk_")) return false;
  if (provider === "openai" && !k.startsWith("sk-")) return false;
  if (provider === "gemini" && k.length < 20) return false;
  return k.length >= 20;
}

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function readJsonSafe(file) {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonSafe(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('[AssistantBuiltin] write failed', e);
    return false;
  }
}

function candidateConfigPaths(userDataPath) {
  const list = [];
  // Company install folder (PayrollAO convention)
  list.push('C:\\\\PayrollAO\\\\assistant-ai.json');
  if (process.env.PAYROLLAO_DIR) {
    list.push(path.join(process.env.PAYROLLAO_DIR, 'assistant-ai.json'));
  }
  if (userDataPath) {
    list.push(path.join(userDataPath, 'assistant-ai.json'));
  }
  // Next to Electron main (packaged / dev)
  list.push(path.join(__dirname, 'assistant-builtin.json'));
  return list;
}

function loadBuiltinConfig(userDataPath) {
  const envKey = (process.env.PAYROLLAO_BUILTIN_AI_KEY || '').trim();
  const envProvider = (process.env.PAYROLLAO_BUILTIN_AI_PROVIDER || 'groq').trim().toLowerCase();
  const envLimit = Number(process.env.PAYROLLAO_BUILTIN_AI_DAILY_LIMIT || DEFAULT_DAILY_LIMIT);

  if (envKey) {
    const provider = ['groq', 'gemini', 'openai'].includes(envProvider) ? envProvider : 'groq';
    if (!isValidApiKey(envKey, provider)) return null;
    return {
      provider,
      apiKey: envKey,
      dailyLimit: Number.isFinite(envLimit) && envLimit > 0 ? envLimit : DEFAULT_DAILY_LIMIT,
      source: 'env',
    };
  }

  for (const file of candidateConfigPaths(userDataPath)) {
    const data = readJsonSafe(file);
    if (!data) continue;
    const apiKey = String(data.apiKey || data.key || '').trim();
    const providerRaw = String(data.provider || 'groq').trim().toLowerCase();
    const provider = ['groq', 'gemini', 'openai'].includes(providerRaw) ? providerRaw : 'groq';
    if (!isValidApiKey(apiKey, provider)) continue;
    const dailyLimit = Number(data.dailyLimit || DEFAULT_DAILY_LIMIT);
    return {
      provider,
      apiKey,
      dailyLimit: Number.isFinite(dailyLimit) && dailyLimit > 0 ? dailyLimit : DEFAULT_DAILY_LIMIT,
      source: file,
    };
  }
  return null;
}

function quotaPath(userDataPath) {
  return path.join(userDataPath || path.join(os.homedir(), '.payrollao'), 'assistant-quota.json');
}

function readQuota(userDataPath, dailyLimit) {
  const file = quotaPath(userDataPath);
  const today = dayKey();
  const raw = readJsonSafe(file) || {};
  const used = raw.date === today ? Number(raw.used || 0) : 0;
  return {
    date: today,
    used: Number.isFinite(used) ? used : 0,
    limit: dailyLimit,
    remaining: Math.max(0, dailyLimit - (Number.isFinite(used) ? used : 0)),
  };
}

function consumeQuota(userDataPath, dailyLimit) {
  const q = readQuota(userDataPath, dailyLimit);
  if (q.remaining <= 0) {
    return { ok: false, quota: q };
  }
  const next = { date: q.date, used: q.used + 1 };
  writeJsonSafe(quotaPath(userDataPath), next);
  const remaining = Math.max(0, dailyLimit - next.used);
  return { ok: true, quota: { ...q, used: next.used, remaining } };
}

async function callProvider(provider, apiKey, system, question) {
  if (provider === 'gemini') {
    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
      encodeURIComponent(apiKey);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${system}\n\nPergunta do utilizador:\n${question}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
      }),
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${raw.slice(0, 180)}`);
    const data = JSON.parse(raw);
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
    if (!text) throw new Error('Gemini empty response');
    return text;
  }

  let baseUrl = '';
  let model = '';
  if (provider === 'openai') {
    baseUrl = 'https://api.openai.com/v1';
    model = 'gpt-4o-mini';
  } else {
    baseUrl = 'https://api.groq.com/openai/v1';
    model = 'llama-3.3-70b-versatile';
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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
  const raw = await res.text();
  if (!res.ok) throw new Error(`${provider} ${res.status}: ${raw.slice(0, 180)}`);
  const data = JSON.parse(raw);
  const text = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error(`${provider} empty response`);
  return text;
}

function getStatus(userDataPath) {
  const cfg = loadBuiltinConfig(userDataPath);
  if (!cfg) {
    return {
      configured: false,
      provider: null,
      dailyLimit: DEFAULT_DAILY_LIMIT,
      remaining: 0,
      used: 0,
    };
  }
  const q = readQuota(userDataPath, cfg.dailyLimit);
  return {
    configured: true,
    provider: cfg.provider,
    dailyLimit: cfg.dailyLimit,
    remaining: q.remaining,
    used: q.used,
    source: cfg.source === 'env' ? 'env' : 'file',
  };
}

async function chatBuiltin(userDataPath, { system, question }) {
  const cfg = loadBuiltinConfig(userDataPath);
  if (!cfg) {
    return {
      success: false,
      error:
        'Builtin AI not configured. Put a free Groq/Gemini key in C:\\\\PayrollAO\\\\assistant-ai.json (see example).',
    };
  }
  const consumed = consumeQuota(userDataPath, cfg.dailyLimit);
  if (!consumed.ok) {
    return {
      success: false,
      error: `Daily free limit reached (${cfg.dailyLimit}/day). Try again tomorrow, or add your own API key in Settings.`,
      quota: consumed.quota,
      limitReached: true,
    };
  }
  try {
    const text = await callProvider(cfg.provider, cfg.apiKey, system, question);
    return {
      success: true,
      text,
      provider: 'builtin',
      backend: cfg.provider,
      quota: consumed.quota,
    };
  } catch (e) {
    // refund one use on hard failure
    const q = readQuota(userDataPath, cfg.dailyLimit);
    writeJsonSafe(quotaPath(userDataPath), { date: q.date, used: Math.max(0, q.used - 1) });
    return { success: false, error: e?.message || String(e), quota: readQuota(userDataPath, cfg.dailyLimit) };
  }
}


function companyConfigPath() {
  if (process.env.PAYROLLAO_DIR) return path.join(process.env.PAYROLLAO_DIR, 'assistant-ai.json');
  return 'C:\\\\PayrollAO\\\\assistant-ai.json';
}

function saveBuiltinConfig({ provider, apiKey, dailyLimit }) {
  const providerRaw = String(provider || 'groq').trim().toLowerCase();
  const prov = ['groq', 'gemini', 'openai'].includes(providerRaw) ? providerRaw : 'groq';
  const key = String(apiKey || '').trim();
  const limit = Number(dailyLimit || DEFAULT_DAILY_LIMIT);
  if (!isValidApiKey(key, prov)) {
    return { success: false, error: 'Invalid API key for ' + prov };
  }
  const file = companyConfigPath();
  const ok = writeJsonSafe(file, {
    provider: prov,
    apiKey: key,
    dailyLimit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_DAILY_LIMIT,
  });
  if (!ok) return { success: false, error: 'Could not write ' + file };
  return { success: true, file, ...getStatus(null) };
}

module.exports = {
  DEFAULT_DAILY_LIMIT,
  getStatus,
  chatBuiltin,
  loadBuiltinConfig,
  saveBuiltinConfig,
  companyConfigPath,
};
