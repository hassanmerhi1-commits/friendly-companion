/**
 * Lei Geral de Trabalho de Angola (Lei n.º 12/23)
 * Organized by chapters and articles for easy reference
 */

export interface LaborLawArticle {
  number: string;
  title: string;
  content: string;
  keywords: string[];
}

export interface LaborLawChapter {
  id: string;
  number: string;
  title: string;
  titleEn: string;
  articles: LaborLawArticle[];
}

export const laborLawChapters: LaborLawChapter[] = [
  {
    id: 'cap1',
    number: 'I',
    title: 'Disposições Gerais',
    titleEn: 'General Provisions',
    articles: [
      {
        number: '1',
        title: 'Âmbito de Aplicação',
        content: 'A presente Lei aplica-se às relações jurídico-laborais de trabalho subordinado estabelecidas entre trabalhadores e empregadores, nacionais ou estrangeiros.',
        keywords: ['aplicação', 'âmbito', 'trabalhador', 'empregador']
      },
      {
        number: '2',
        title: 'Conceito de Contrato de Trabalho',
        content: 'Contrato de trabalho é aquele pelo qual um trabalhador se obriga, mediante retribuição, a prestar a sua actividade a um empregador, sob a autoridade e direcção deste.',
        keywords: ['contrato', 'trabalho', 'retribuição', 'subordinação']
      },
      {
        number: '3',
        title: 'Princípios Fundamentais',
        content: 'As relações de trabalho regem-se pelos princípios da igualdade, não discriminação, boa-fé, cooperação e respeito mútuo entre as partes.',
        keywords: ['princípios', 'igualdade', 'discriminação', 'boa-fé']
      },
    ]
  },
  {
    id: 'cap2',
    number: 'II',
    title: 'Formação do Contrato de Trabalho',
    titleEn: 'Employment Contract Formation',
    articles: [
      {
        number: '12',
        title: 'Forma do Contrato',
        content: 'O contrato de trabalho não está sujeito a forma especial, salvo disposição legal em contrário. Deve ser celebrado por escrito quando: a) for por tempo determinado; b) for celebrado com trabalhador estrangeiro; c) a lei o exigir.',
        keywords: ['forma', 'escrito', 'contrato', 'estrangeiro']
      },
      {
        number: '13',
        title: 'Período Experimental',
        content: 'O período experimental corresponde aos primeiros dias de execução do contrato: a) 60 dias para trabalhadores em geral; b) 120 dias para cargos de direcção; c) 180 dias para cargos de alta direcção.',
        keywords: ['período', 'experimental', 'probatório', 'dias']
      },
      {
        number: '14',
        title: 'Contrato a Termo Certo',
        content: 'O contrato de trabalho a termo certo pode ser celebrado pelo prazo máximo de 5 anos, incluindo renovações. Após este prazo, converte-se automaticamente em contrato por tempo indeterminado.',
        keywords: ['termo', 'certo', 'determinado', 'prazo', 'renovação']
      },
      {
        number: '15',
        title: 'Contrato a Termo Incerto',
        content: 'Admite-se a celebração de contrato a termo incerto nas situações de substituição temporária de trabalhador ausente ou para execução de obra ou serviço determinado.',
        keywords: ['termo', 'incerto', 'substituição', 'temporário']
      },
    ]
  },
  {
    id: 'cap3',
    number: 'III',
    title: 'Direitos e Deveres das Partes',
    titleEn: 'Rights and Duties of the Parties',
    articles: [
      {
        number: '41',
        title: 'Deveres do Trabalhador',
        content: 'São deveres do trabalhador: a) comparecer ao serviço com assiduidade e pontualidade; b) realizar o trabalho com zelo e diligência; c) cumprir ordens e instruções do empregador; d) guardar lealdade ao empregador; e) velar pela conservação dos bens da empresa.',
        keywords: ['deveres', 'trabalhador', 'assiduidade', 'pontualidade', 'lealdade']
      },
      {
        number: '42',
        title: 'Deveres do Empregador',
        content: 'São deveres do empregador: a) respeitar e tratar com urbanidade o trabalhador; b) pagar pontualmente a retribuição; c) proporcionar boas condições de trabalho; d) contribuir para a segurança social; e) passar certificado de trabalho.',
        keywords: ['deveres', 'empregador', 'pagamento', 'condições', 'respeito']
      },
      {
        number: '43',
        title: 'Poder Disciplinar',
        content: 'O empregador tem poder disciplinar sobre o trabalhador ao seu serviço, podendo aplicar sanções disciplinares em caso de infracção disciplinar, dentro dos limites estabelecidos na lei.',
        keywords: ['disciplinar', 'poder', 'sanção', 'infracção']
      },
    ]
  },
  {
    id: 'cap4',
    number: 'IV',
    title: 'Duração e Organização do Tempo de Trabalho',
    titleEn: 'Working Hours and Organization',
    articles: [
      {
        number: '95',
        title: 'Período Normal de Trabalho',
        content: 'O período normal de trabalho não pode exceder 8 horas diárias e 44 horas semanais. Pode ser reduzido por instrumento de regulamentação colectiva de trabalho.',
        keywords: ['horário', 'horas', 'diário', 'semanal', 'normal']
      },
      {
        number: '96',
        title: 'Trabalho Extraordinário',
        content: 'Considera-se trabalho extraordinário o prestado fora do período normal de trabalho. Não pode exceder 2 horas diárias, 40 horas mensais e 200 horas anuais.',
        keywords: ['extraordinário', 'horas', 'extra', 'limite']
      },
      {
        number: '97',
        title: 'Remuneração do Trabalho Extraordinário',
        content: 'O trabalho extraordinário é remunerado com acréscimo de: a) 50% nas duas primeiras horas; b) 75% nas horas seguintes; c) 100% em dias de descanso ou feriados.',
        keywords: ['remuneração', 'extra', 'acréscimo', 'percentagem']
      },
      {
        number: '98',
        title: 'Trabalho Nocturno',
        content: 'Considera-se trabalho nocturno o prestado entre as 20 horas de um dia e as 6 horas do dia seguinte. A remuneração tem acréscimo mínimo de 25%.',
        keywords: ['nocturno', 'noite', 'acréscimo', 'remuneração']
      },
    ]
  },
  {
    id: 'cap5',
    number: 'V',
    title: 'Férias, Faltas e Licenças',
    titleEn: 'Holidays, Absences and Leaves',
    articles: [
      {
        number: '115',
        title: 'Direito a Férias',
        content: 'O trabalhador tem direito a um período de férias remuneradas em cada ano civil, que vence no dia 1 de Janeiro. O período mínimo é de 22 dias úteis.',
        keywords: ['férias', 'direito', 'dias', 'remuneradas']
      },
      {
        number: '116',
        title: 'Duração das Férias',
        content: 'A duração das férias é de 22 dias úteis, acrescida de 1 dia útil por cada 3 anos de antiguidade, até ao máximo de 30 dias úteis.',
        keywords: ['férias', 'duração', 'antiguidade', 'dias']
      },
      {
        number: '117',
        title: 'Subsídio de Férias',
        content: 'O trabalhador tem direito a subsídio de férias de valor igual à retribuição correspondente ao período de férias, a pagar antes do início destas.',
        keywords: ['subsídio', 'férias', 'retribuição', 'pagamento']
      },
      {
        number: '120',
        title: 'Faltas Justificadas',
        content: 'São consideradas faltas justificadas: a) casamento (até 8 dias); b) falecimento de familiar (até 5 dias); c) nascimento de filho (3 dias para o pai); d) doença comprovada; e) cumprimento de obrigações legais.',
        keywords: ['faltas', 'justificadas', 'casamento', 'falecimento', 'doença']
      },
      {
        number: '121',
        title: 'Efeitos das Faltas Injustificadas',
        content: 'As faltas injustificadas implicam: a) perda de retribuição; b) desconto na antiguidade; c) eventual procedimento disciplinar. Três faltas seguidas ou cinco interpoladas no ano podem constituir justa causa de despedimento.',
        keywords: ['faltas', 'injustificadas', 'desconto', 'disciplinar', 'despedimento']
      },
    ]
  },
  {
    id: 'cap6',
    number: 'VI',
    title: 'Retribuição',
    titleEn: 'Remuneration',
    articles: [
      {
        number: '162',
        title: 'Retribuição Mínima',
        content: 'O salário mínimo nacional é fixado pelo Governo, ouvidas as organizações sindicais e patronais. A retribuição não pode ser inferior ao salário mínimo legalmente estabelecido.',
        keywords: ['salário', 'mínimo', 'retribuição', 'nacional']
      },
      {
        number: '163',
        title: 'Componentes da Retribuição',
        content: 'A retribuição compreende: a) a retribuição base; b) as prestações complementares regulares (subsídios); c) as prestações complementares eventuais (prémios, gratificações).',
        keywords: ['retribuição', 'componentes', 'base', 'subsídios', 'prémios']
      },
      {
        number: '164',
        title: 'Tempo e Forma de Pagamento',
        content: 'A retribuição deve ser paga em dinheiro, até ao último dia útil do mês a que respeita. O pagamento pode ser feito por transferência bancária ou cheque, com acordo do trabalhador.',
        keywords: ['pagamento', 'prazo', 'dinheiro', 'transferência', 'mensal']
      },
      {
        number: '170',
        title: 'Subsídio de Natal (13º Mês)',
        content: 'O trabalhador tem direito a subsídio de Natal de valor igual a um mês de retribuição, a pagar até 15 de Dezembro de cada ano. Em caso de admissão ou cessação durante o ano, o subsídio é proporcional.',
        keywords: ['natal', 'subsídio', '13º', 'décimo terceiro', 'dezembro']
      },
    ]
  },
  {
    id: 'cap7',
    number: 'VII',
    title: 'Regime Disciplinar',
    titleEn: 'Disciplinary Regime',
    articles: [
      {
        number: '43',
        title: 'Infracção Disciplinar',
        content: 'Constitui infracção disciplinar todo o comportamento culposo do trabalhador que viole os deveres decorrentes do contrato de trabalho ou da lei.',
        keywords: ['infracção', 'disciplinar', 'comportamento', 'deveres']
      },
      {
        number: '44',
        title: 'Sanções Disciplinares',
        content: 'São sanções disciplinares aplicáveis ao trabalhador: a) admoestação verbal; b) admoestação registada (advertência); c) suspensão do trabalho com perda de retribuição até 20 dias; d) despedimento com justa causa.',
        keywords: ['sanções', 'advertência', 'suspensão', 'despedimento', 'admoestação']
      },
      {
        number: '45',
        title: 'Processo Disciplinar',
        content: 'A aplicação de sanção disciplinar, com excepção da admoestação verbal, deve ser precedida de processo disciplinar escrito com comunicação da intenção de aplicar sanção e concessão de prazo não inferior a 5 dias úteis para defesa.',
        keywords: ['processo', 'disciplinar', 'defesa', 'prazo', 'comunicação']
      },
      {
        number: '46',
        title: 'Prescrição',
        content: 'O procedimento disciplinar deve iniciar-se nos 30 dias seguintes ao conhecimento da infracção pelo empregador. A sanção não pode ser aplicada sem audiência prévia do trabalhador.',
        keywords: ['prescrição', 'prazo', '30 dias', 'audiência']
      },
      {
        number: '204',
        title: 'Justa Causa de Despedimento',
        content: 'Constituem justa causa de despedimento: a) desobediência grave; b) violação de direitos de colegas; c) provocação de conflitos; d) lesões corporais; e) furto ou roubo; f) abandono do trabalho; g) faltas injustificadas; h) embriaguez habitual.',
        keywords: ['justa causa', 'despedimento', 'desobediência', 'furto', 'faltas']
      },
    ]
  },
  {
    id: 'cap8',
    number: 'VIII',
    title: 'Cessação do Contrato',
    titleEn: 'Contract Termination',
    articles: [
      {
        number: '195',
        title: 'Formas de Cessação',
        content: 'O contrato de trabalho pode cessar por: a) caducidade; b) acordo das partes; c) denúncia pelo trabalhador; d) despedimento por iniciativa do empregador; e) resolução pelo trabalhador.',
        keywords: ['cessação', 'contrato', 'denúncia', 'despedimento', 'acordo']
      },
      {
        number: '197',
        title: 'Aviso Prévio do Trabalhador',
        content: 'O trabalhador que pretenda cessar o contrato deve comunicar por escrito ao empregador com antecedência mínima de: a) 15 dias para contratos até 2 anos; b) 30 dias para contratos superiores a 2 anos.',
        keywords: ['aviso prévio', 'denúncia', 'dias', 'antecedência', 'comunicação']
      },
      {
        number: '202',
        title: 'Indemnização por Despedimento',
        content: 'Em caso de despedimento sem justa causa, o trabalhador tem direito a indemnização correspondente a 45 dias de retribuição base por cada ano completo de antiguidade ou fracção, com mínimo de 3 meses.',
        keywords: ['indemnização', 'despedimento', '45 dias', 'antiguidade']
      },
      {
        number: '208',
        title: 'Certificado de Trabalho',
        content: 'O empregador é obrigado a passar ao trabalhador, no prazo de 8 dias após a cessação do contrato, um certificado de trabalho indicando as datas de admissão e cessação, cargo exercido e retribuição auferida.',
        keywords: ['certificado', 'trabalho', 'cessação', 'documento']
      },
    ]
  },
  {
    id: 'cap9',
    number: 'IX',
    title: 'Protecção da Maternidade e Paternidade',
    titleEn: 'Maternity and Paternity Protection',
    articles: [
      {
        number: '136',
        title: 'Licença de Maternidade',
        content: 'A trabalhadora tem direito a licença de maternidade de 90 dias, podendo iniciar-se até 4 semanas antes do parto previsto. Durante a licença, mantém o direito à retribuição integral.',
        keywords: ['maternidade', 'licença', '90 dias', 'parto', 'gravidez']
      },
      {
        number: '137',
        title: 'Licença de Paternidade',
        content: 'O pai trabalhador tem direito a licença de paternidade de 3 dias úteis consecutivos, a gozar nos primeiros 15 dias após o nascimento.',
        keywords: ['paternidade', 'licença', 'pai', 'nascimento', '3 dias']
      },
      {
        number: '138',
        title: 'Dispensa para Amamentação',
        content: 'A trabalhadora que amamenta o filho tem direito a dispensa diária de trabalho de 1 hora, durante o primeiro ano de vida da criança, sem perda de retribuição.',
        keywords: ['amamentação', 'dispensa', 'hora', 'bebé', 'lactação']
      },
      {
        number: '139',
        title: 'Protecção contra Despedimento',
        content: 'A trabalhadora grávida, puérpera ou lactante não pode ser despedida, salvo por justa causa, devendo esta ser previamente apreciada pela Inspecção do Trabalho.',
        keywords: ['protecção', 'despedimento', 'grávida', 'inspecção']
      },
    ]
  },
  {
    id: 'cap10',
    number: 'X',
    title: 'Segurança Social e Impostos',
    titleEn: 'Social Security and Taxes',
    articles: [
      {
        number: 'INSS-1',
        title: 'Contribuição do Trabalhador (INSS)',
        content: 'O trabalhador contribui para a segurança social com 3% da sua retribuição bruta mensal. Este valor é retido pelo empregador e transferido para o INSS.',
        keywords: ['INSS', 'contribuição', '3%', 'trabalhador', 'segurança social']
      },
      {
        number: 'INSS-2',
        title: 'Contribuição do Empregador (INSS)',
        content: 'O empregador contribui para a segurança social com 8% da retribuição bruta do trabalhador. Esta contribuição é adicional ao salário do trabalhador.',
        keywords: ['INSS', 'empregador', '8%', 'contribuição', 'patronal']
      },
      {
        number: 'IRT-1',
        title: 'Imposto sobre Rendimentos do Trabalho',
        content: 'O IRT incide sobre os rendimentos do trabalho por conta de outrem. É retido na fonte pelo empregador segundo tabela progressiva. Rendimentos até ao mínimo de existência estão isentos.',
        keywords: ['IRT', 'imposto', 'retenção', 'fonte', 'progressivo']
      },
      {
        number: 'IRT-2',
        title: 'Tabela de IRT',
        content: 'Taxas de IRT (2024): Até 100.000 Kz - isento; 100.001-150.000 Kz - 13%; 150.001-200.000 Kz - 16%; 200.001-300.000 Kz - 18%; 300.001-500.000 Kz - 19%; 500.001-1.000.000 Kz - 20%; 1.000.001-1.500.000 Kz - 21%; 1.500.001-2.000.000 Kz - 22%; 2.000.001-2.500.000 Kz - 23%; 2.500.001-5.000.000 Kz - 24%; Acima de 5.000.000 Kz - 25%.',
        keywords: ['IRT', 'tabela', 'taxa', 'escalões', 'percentagem']
      },
    ]
  },
];

export function searchLaborLaw(query: string): { chapter: LaborLawChapter; article: LaborLawArticle }[] {
  const results: { chapter: LaborLawChapter; article: LaborLawArticle }[] = [];
  const normalizedQuery = query.toLowerCase().trim();
  
  if (!normalizedQuery) return results;

  laborLawChapters.forEach(chapter => {
    chapter.articles.forEach(article => {
      const matchesKeyword = article.keywords.some(k => k.includes(normalizedQuery));
      const matchesTitle = article.title.toLowerCase().includes(normalizedQuery);
      const matchesContent = article.content.toLowerCase().includes(normalizedQuery);
      const matchesNumber = article.number.toLowerCase() === normalizedQuery || 
                           `artigo ${article.number}`.toLowerCase().includes(normalizedQuery) ||
                           `art. ${article.number}`.toLowerCase().includes(normalizedQuery);
      
      if (matchesKeyword || matchesTitle || matchesContent || matchesNumber) {
        results.push({ chapter, article });
      }
    });
  });

  return results;
}
