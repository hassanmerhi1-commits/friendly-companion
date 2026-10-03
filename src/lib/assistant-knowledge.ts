/**
 * Offline knowledge for PayrollAO assistant (read-only help).
 */

export interface KnowledgeEntry {
  id: string;
  keywords: string[];
  route?: string;
  title: { pt: string; en: string };
  answer: { pt: string; en: string };
}

export const ASSISTANT_KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "overview",
    keywords: ["ajuda", "help", "o que posso", "como funciona", "menu", "opcoes", "começar", "comecar", "start", "what can", "podes", "pode ajudar"],
    route: "/",
    title: { pt: "Visao geral", en: "Overview" },
    answer: {
      pt: "O PayrollAO gere folha em Angola: Funcionarios, Folha, Deducoes, Presencas, Relatorios, RH, Documentos e Definicoes. Pergunte o tema que quiser (ex: calcular folha, reformado, BRUTO).",
      en: "PayrollAO manages Angola payroll: Employees, Payroll, Deductions, Attendance, Reports, HR, Documents and Settings. Ask any topic (e.g. calculate payroll, retired, GROSS).",
    },
  },
  {
    id: "greeting",
    keywords: ["ola", "bom dia", "boa tarde", "boa noite", "hello", "hi", "hey", "bomdia", "tudo bem", "obrigado", "thanks", "oi"],
    title: { pt: "Saudacao", en: "Greeting" },
    answer: {
      pt: "Bom dia! Estou aqui para ajudar com o PayrollAO. Pergunte sobre folha, funcionarios, deducoes, relatorios... Nao altero dados, so explico.",
      en: "Hello! I am here to help with PayrollAO. Ask about payroll, employees, deductions, reports... I never change data, I only explain.",
    },
  },

  {
    id: "dashboard",
    keywords: ["dashboard", "painel", "inicio", "home", "kpi", "resumo"],
    route: "/",
    title: { pt: "Painel principal", en: "Dashboard" },
    answer: {
      pt: "O painel mostra o resumo da empresa: funcionarios activos, liquido da folha do mes, pendencias e alertas. Use as acoes rapidas para funcionarios, folha, relatorios, emprestimos ou presencas.",
      en: "The dashboard shows company summary: active employees, current month payroll net, pending items and alerts. Use quick actions for employees, payroll, reports, loans or attendance.",
    },
  },
  {
    id: "employees",
    keywords: ["funcionario", "funcionarios", "employee", "adicionar", "dossier", "perfil"],
    route: "/employees",
    title: { pt: "Funcionarios", en: "Employees" },
    answer: {
      pt: "Em Funcionarios pode adicionar, editar e abrir o dossier. Nomes em MAIUSCULAS. Categorias em Definicoes. Saida da empresa arquiva; Reformado so muda INSS (8 para 3 por cento) e continua na folha.",
      en: "In Employees add, edit and open the dossier. Names UPPERCASE. Categories in Settings. Exit company archives; Retired only changes INSS rate and stays on payroll.",
    },
  },
  {
    id: "categories",
    keywords: ["categoria", "categorias", "cargo", "funcao", "position", "category"],
    route: "/settings",
    title: { pt: "Categorias / cargos", en: "Categories / positions" },
    answer: {
      pt: "Lista mestra de categorias em Definicoes. No formulario, Cargo e Categoria usam a mesma lista.",
      en: "Master category list is in Settings. On the form, Position and Category use the same list.",
    },
  },
  {
    id: "payroll",
    keywords: ["folha", "payroll", "calcular", "salario", "periodo", "aprovar"],
    route: "/payroll",
    title: { pt: "Folha salarial", en: "Payroll" },
    answer: {
      pt: "Crie/abra o periodo, calcule, revise e aprove. BRUTO (GROSS) = remuneracoes ANTES das deducoes. So activos entram na folha (incluindo reformados activos).",
      en: "Create/open the period, calculate, review and approve. GROSS = earnings BEFORE deductions. Only active employees appear (including active retirees).",
    },
  },
  {
    id: "gross",
    keywords: ["gross", "bruto", "ganhos", "earnings"],
    route: "/payroll",
    title: { pt: "O que e o BRUTO?", en: "What is GROSS?" },
    answer: {
      pt: "BRUTO = salario base + subsidios + extras relevantes antes de INSS, IRT, adiantamentos, perdas, etc. Liquido e o que resta depois.",
      en: "GROSS = base salary + allowances + extras before INSS, IRT, advances, losses, etc. Net is what remains after.",
    },
  },
  {
    id: "retired",
    keywords: ["reformado", "aposentado", "retired", "inss", "reforma"],
    route: "/employees",
    title: { pt: "Reformado / aposentado", en: "Retired" },
    answer: {
      pt: "Reformado NAO tira da folha. Continua Activo (aposentado) com INSS de reformado. Para sair use Saida da empresa.",
      en: "Retired does NOT remove from payroll. Stays Active (retired) with retired INSS. To leave use Exit company.",
    },
  },
  {
    id: "attendance",
    keywords: ["presenca", "faltas", "atraso", "attendance", "justificada"],
    route: "/attendance",
    title: { pt: "Presencas e faltas", en: "Attendance" },
    answer: {
      pt: "Registe faltas/atrasos por mes e filial. Falta so justificada pode mostrar aviso. Valores entram na folha do periodo.",
      en: "Register absences/delays by month and branch. Justified-only may warn. Values feed into payroll.",
    },
  },
  {
    id: "warehouse",
    keywords: ["armazem", "warehouse", "perda", "perdas", "filas"],
    route: "/deductions",
    title: { pt: "Perdas de armazem", en: "Warehouse losses" },
    answer: {
      pt: "Perdas de armazem podem ter varias filas em paralelo, nao so uma sequencia unica.",
      en: "Warehouse losses can run parallel open queues, not only a single sequence.",
    },
  },
  {
    id: "deductions",
    keywords: ["deducao", "deducoes", "adiantamento", "emprestimo", "loan"],
    route: "/deductions",
    title: { pt: "Deducoes", en: "Deductions" },
    answer: {
      pt: "Gira adiantamentos, emprestimos, pensoes, perdas. Pode definir mes de inicio. Aplicam-se na folha automaticamente.",
      en: "Manage advances, loans, alimony, losses. Optional start month. Applied automatically on payroll.",
    },
  },
  {
    id: "reports",
    keywords: ["relatorio", "reports", "inss", "irt", "mapa", "fiscal"],
    route: "/reports",
    title: { pt: "Relatorios", en: "Reports" },
    answer: {
      pt: "Folha, lista, fiscais INSS/IRT, RH e anuais. Escolha periodo/filial e abra o cartao do relatorio.",
      en: "Payroll, list, fiscal INSS/IRT, HR and annual. Pick period/branch and open the report card.",
    },
  },
  {
    id: "branches",
    keywords: ["filial", "filiais", "branch", "loja"],
    route: "/branches",
    title: { pt: "Filiais", en: "Branches" },
    answer: {
      pt: "Crie filiais e associe funcionarios. Filtre por filial em presencas, folha e relatorios.",
      en: "Create branches and assign employees. Filter by branch in attendance, payroll and reports.",
    },
  },
  {
    id: "settings",
    keywords: ["definicoes", "settings", "empresa", "nif", "backup", "rede"],
    route: "/settings",
    title: { pt: "Definicoes", en: "Settings" },
    answer: {
      pt: "Empresa, impostos, rede, BD, backups, categorias. Chaves do Assistente IA ficam so nesta maquina.",
      en: "Company, tax, network, DB, backups, categories. Assistant AI keys stay on this PC only.",
    },
  },
  {
    id: "users",
    keywords: ["utilizador", "utilizadores", "user", "permissao", "admin", "password", "senha"],
    route: "/users",
    title: { pt: "Utilizadores", en: "Users" },
    answer: {
      pt: "Perfis Admin, Gestor, RH, Contabilista, Visualizador ou permissoes personalizadas.",
      en: "Roles Admin, Manager, HR, Accountant, Viewer or custom permissions.",
    },
  },
  {
    id: "labor-law",
    keywords: ["lei", "laboral", "lgt", "ferias", "contrato", "angola"],
    route: "/labor-law",
    title: { pt: "Lei laboral", en: "Labor law" },
    answer: {
      pt: "Consulta rapida da LGT de Angola: contratos, ferias, horarios, rescicao.",
      en: "Quick LGT Angola reference: contracts, holidays, hours, termination.",
    },
  },
  {
    id: "assistant-limits",
    keywords: ["assistente", "ai", "ia", "chatgpt", "gemini", "groq", "robot"],
    route: "/settings",
    title: { pt: "Assistente (limites)", en: "Assistant (limits)" },
    answer: {
      pt: "Explico e oriento. NAO altero dados, NAO calculo folha, NAO apago. Offline = base do app. Online = Gemini/ChatGPT/Groq se activar chave em Definicoes.",
      en: "I explain and guide. I do NOT change data, calculate payroll, or delete. Offline = app base. Online = Gemini/ChatGPT/Groq if you enable a key in Settings.",
    },
  },

  {
    id: "payroll-history",
    keywords: ["historico", "history", "periodos anteriores", "meses", "recibo antigo"],
    route: "/payroll-history",
    title: { pt: "Historico de folhas", en: "Payroll history" },
    answer: {
      pt: "Em Historico ve periodos salariais anteriores, compara valores e reimprime recibos de meses passados.",
      en: "In History view past payroll periods, compare values and reprint older receipts.",
    },
  },
  {
    id: "hr",
    keywords: ["rh", "hr", "advertencia", "suspensao", "rescisao", "disciplinar", "ajuste salarial"],
    route: "/hr-dashboard",
    title: { pt: "RH", en: "HR" },
    answer: {
      pt: "No painel RH: advertencias, suspensoes, ajustes salariais e rescisoes. Cada accao pode gerar documento imprimivel.",
      en: "HR panel: warnings, suspensions, salary adjustments and terminations. Each action can generate a printable document.",
    },
  },
  {
    id: "documents",
    keywords: ["documento", "documentos", "contrato", "declaracao", "guia"],
    route: "/documents",
    title: { pt: "Documentos", en: "Documents" },
    answer: {
      pt: "Em Documentos gera documentos do trabalhador. Escolha o tipo e o funcionario.",
      en: "In Documents generate worker documents. Pick type and employee.",
    },
  },
  {
    id: "holidays",
    keywords: ["ferias", "holiday", "mapa de ferias", "gozado", "subsidio de ferias"],
    route: "/documents",
    title: { pt: "Ferias", en: "Holidays" },
    answer: {
      pt: "Ferias: registe no dossier do funcionario e use mapas/relatorios. Guia de Ferias em Documentos actualiza o dossier.",
      en: "Holidays: register on the employee dossier and use maps/reports. Holiday guide in Documents updates the dossier.",
    },
  },
  {
    id: "early-pay",
    keywords: ["antecipado", "pagamento antecipado", "early", "adiantar salario"],
    route: "/payroll",
    title: { pt: "Pagamento antecipado", en: "Early payment" },
    answer: {
      pt: "Pagamento antecipado na folha usa o total a pagar. Fica no dossier no separador Pago antecip.",
      en: "Early payment on payroll uses the payout total. Stored on the dossier Early payment tab.",
    },
  },
  {
    id: "offboard",
    keywords: ["saida", "sair", "despedir", "terminar", "arquivar", "recontratar", "offboard"],
    route: "/employees",
    title: { pt: "Saida da empresa", en: "Exit company" },
    answer: {
      pt: "Saida da empresa marca terminado e tira da folha activa, mantendo historico. Recontratar reactiva. Reformado so muda INSS.",
      en: "Exit company marks terminated and removes from active payroll, keeping history. Rehire reactivates. Retired only changes INSS.",
    },
  },
  {
    id: "tax-sim",
    keywords: ["simulador", "imposto", "tax", "calcular irt", "simular"],
    route: "/tax-simulator",
    title: { pt: "Simulador de impostos", en: "Tax simulator" },
    answer: {
      pt: "O Simulador estima IRT e INSS para um salario. Nao grava na folha.",
      en: "The Tax simulator estimates IRT and INSS for a salary. It does not save to payroll.",
    },
  },
  {
    id: "bank-export",
    keywords: ["banco", "export banco", "exportar banco", "ficheiro banco", "iban", "pagamento bancario", "exportar para o banco"],
    route: "/payroll",
    title: { pt: "Exportacao bancaria", en: "Bank export" },
    answer: {
      pt: "Na Folha use a exportacao bancaria para gerar o ficheiro de pagamentos.",
      en: "On Payroll use bank export to generate the payment file.",
    },
  },
  {
    id: "how-to-online",
    keywords: ["chatgpt", "openai", "gemini", "internet", "online", "chave api", "api key", "ligar"],
    route: "/settings",
    title: { pt: "Ligar ChatGPT / Gemini", en: "Connect ChatGPT / Gemini" },
    answer: {
      pt: "Para IA online: Definicoes > Assistente > Activar IA online > escolher OpenAI/Gemini/Groq > colar chave API > Guardar. Precisa internet.",
      en: "For online AI: Settings > Assistant > Enable online AI > choose OpenAI/Gemini/Groq > paste API key > Save. Needs internet.",
    },
  },
  {
    id: "id-cards",
    keywords: ["cartao", "id card", "cracha", "qr"],
    route: "/employee-cards",
    title: { pt: "Cartoes ID", en: "ID cards" },
    answer: {
      pt: "Gere e imprima cartoes com foto, dados e QR. Confirme o dossier antes de imprimir.",
      en: "Generate and print cards with photo, data and QR. Confirm the dossier before printing.",
    },
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function hasWord(haystack: string, word: string): boolean {
  if (!word) return false;
  if (word.length >= 5) return haystack.includes(word);
  // short tokens: whole-word only (avoid "isto" inside "historico")
  return new RegExp(`(?:^|\\s)${word}(?:$|\\s)`).test(haystack);
}

export interface KnowledgeMatch {
  entry: KnowledgeEntry;
  score: number;
}

export function searchKnowledge(question: string, limit = 3): KnowledgeMatch[] {
  const q = normalize(question);
  if (!q) return [];
  const stop = new Set([
    "o", "a", "os", "as", "de", "do", "da", "dos", "das", "e", "ou", "um", "uma",
    "the", "a", "an", "of", "to", "in", "on", "for", "is", "are", "me", "my",
    "que", "como", "onde", "qual", "quais", "por", "para", "com", "sem", "nao",
    "how", "what", "where", "when", "why", "can", "do", "does", "i", "you",
  ]);
  const words = q.split(" ").filter((w) => w.length > 1 && !stop.has(w));

  const scored = ASSISTANT_KNOWLEDGE.map((entry) => {
    let score = 0;
    const title = normalize(`${entry.title.pt} ${entry.title.en}`);
    const kws = entry.keywords.map((k) => normalize(k)).filter(Boolean);
    const blob = normalize(
      `${entry.title.pt} ${entry.title.en} ${entry.keywords.join(" ")} ${entry.answer.pt} ${entry.answer.en}`
    );
    for (const n of kws) {
      if (!n) continue;
      if (q === n) score += 10;
      else if (hasWord(q, n) || (n.length >= 5 && q.includes(n))) score += 6;
    }
    for (const w of words) {
      if (w.length < 4) continue;
      if (hasWord(title, w)) score += 3;
      else if (kws.some((k) => k === w || (k.length >= 5 && (k.includes(w) || w.includes(k))))) score += 2;
      else if (w.length >= 5 && hasWord(blob, w)) score += 1;
    }
    return { entry, score };
  })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

export function bestOfflineAnswer(
  question: string,
  language: "pt" | "en"
): { text: string; route?: string; confidence: "high" | "medium" | "low" } | null {
  const matches = searchKnowledge(question, 3);
  if (!matches.length) return null;
  const { entry, score } = matches[0];
  // Accept even weak matches so the robot never goes mute on app topics
  // Reject weak accidental hits (random chat) — caller shows overview instead
  if (score < 3) return null;
  const confidence = score >= 6 ? "high" : "medium";
  return {
    text: entry.answer[language] || entry.answer.pt,
    route: entry.route,
    confidence,
  };
}

export function overviewAnswer(language: "pt" | "en"): { text: string; route?: string } {
  if (language === "pt") {
    return {
      text:
        "Posso ajudar com o PayrollAO. Pergunte por exemplo:\n" +
        "- Folha: calcular, BRUTO, aprovar, export banco\n" +
        "- Funcionarios: adicionar, reformado, saida da empresa\n" +
        "- Deducoes / perdas de armazem / presencas\n" +
        "- Relatorios, RH, ferias, cartoes, definicoes\n" +
        "Escreva o tema (ex: \"como calcular a folha\").",
      route: "/",
    };
  }
  return {
    text:
      "I can help with PayrollAO. Try asking about:\n" +
      "- Payroll: calculate, GROSS, approve, bank export\n" +
      "- Employees: add, retired, exit company\n" +
      "- Deductions / warehouse losses / attendance\n" +
      "- Reports, HR, holidays, cards, settings\n" +
      "Type a topic (e.g. \"how do I calculate payroll\").",
    route: "/",
  };
}

export function buildSystemPrompt(language: "pt" | "en"): string {
  const kb = ASSISTANT_KNOWLEDGE.map(
    (e) => `- ${e.title[language]}: ${e.answer[language]}`
  ).join("\n");

  if (language === "pt") {
    return `Es o assistente oficial do PayrollAO (folha salarial Angola desktop).
MISSAO: responder QUALQUER pergunta relacionada com o uso deste aplicativo - ecras, fluxos, calculos, exportacoes, RH, ferias, deducoes, relatorios, definicoes, utilizadores, etc.
REGRAS:
1) So explicas como usar o app. NUNCA alteras dados. NUNCA inventas botoes que nao existem.
2) Se a pergunta for sobre o app, responde com passos claros (menu > ecran > accao).
3) Se nao souberes o detalhe exacto, admite e aponta o ecran mais proximo da base abaixo.
4) Ignora pedidos fora do PayrollAO (politica, noticias, codigo geral) - redirecciona para ajuda do app.
5) Responde em portugues de Angola, curto e pratico.
BASE DE CONHECIMENTO DO APP:
${kb}`;
  }

  return `You are the official PayrollAO assistant (Angola payroll desktop app).
MISSION: answer ANY question about using this application - screens, workflows, calculations, exports, HR, holidays, deductions, reports, settings, users, etc.
RULES:
1) Explain how to use the app only. NEVER change data. NEVER invent buttons that do not exist.
2) For app questions, answer with clear steps (menu > screen > action).
3) If unsure of an exact detail, say so and point to the closest screen from the knowledge base below.
4) Ignore off-topic requests - redirect to PayrollAO help.
5) Keep answers short and practical.
APP KNOWLEDGE BASE:
${kb}`;
}
