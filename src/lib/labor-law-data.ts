/**
 * Lei Geral do Trabalho de Angola (Lei n.º 12/23, de 27 de Dezembro)
 * Payroll-relevant index — NOT the full legal text (322 articles).
 * Summaries aligned to Lei 12/23 article numbering.
 */

export interface LaborLawArticle {
  number: string;
  title: string;
  titleEn?: string;
  content: string;
  contentEn?: string;
  keywords: string[];
}

export interface LaborLawChapter {
  id: string;
  number: string;
  title: string;
  titleEn: string;
  articles: LaborLawArticle[];
}

export interface ComplementaryArticle {
  id: string;
  title: string;
  titleEn: string;
  content: string;
  contentEn?: string;
  keywords: string[];
  reference: string;
}

export interface ComplementarySection {
  id: string;
  title: string;
  titleEn: string;
  reference: string;
  articles: ComplementaryArticle[];
}

export const LAW_METADATA = {
  number: '12/23',
  published: '27 de Dezembro de 2023',
  effective: '27 de Março de 2024',
  totalArticles: 322,
  totalChapters: 12,
  revokes: 'Lei n.º 7/15',
} as const;

export const laborLawChapters: LaborLawChapter[] = [
  {
    id: 'cap1',
    number: 'I',
    title: 'Princípios Gerais',
    titleEn: 'General Principles',
    articles: [
      {
        number: '1',
        title: 'Âmbito de aplicação',
        titleEn: 'Scope of application',
        content:
          'Aplica-se a todos os contratos de trabalho entre pessoas singulares e entidades empregadoras (públicas, privadas, cooperativas, ONG, representações diplomáticas). Aplica-se supletivamente a contratos para execução em Angola celebrados entre estrangeiros não residentes.',
        contentEn:
          'Applies to all employment contracts between individuals and employers. Supplementarily applies to contracts to be performed in Angola.',
        keywords: ['âmbito', 'aplicação', 'contrato', 'trabalhador', 'empregador'],
      },
      {
        number: '2',
        title: 'Exclusão do âmbito',
        titleEn: 'Exclusions',
        content:
          'Ficam excluídos do âmbito da Lei os trabalhadores que exerçam funções de natureza administrativa no Estado, magistrados, militares em serviço activo e outras categorias expressamente previstas.',
        keywords: ['exclusão', 'funções públicas', 'militares', 'magistrados'],
      },
      {
        number: '4',
        title: 'Direito ao trabalho',
        titleEn: 'Right to work',
        content:
          'O trabalho é um direito fundamental. O Estado promove políticas de emprego, formação profissional e protecção dos trabalhadores.',
        keywords: ['direito', 'trabalho', 'emprego', 'formação'],
      },
      {
        number: '7',
        title: 'Fontes de regulação',
        titleEn: 'Sources of regulation',
        content:
          'As relações de trabalho regem-se pela Constituição, pela presente Lei, convenções colectivas, contratos individuais, regulamentos internos e usos compatíveis com a lei.',
        keywords: ['fontes', 'convenção colectiva', 'regulamento interno', 'contrato'],
      },
    ],
  },
  {
    id: 'cap2',
    number: 'II',
    title: 'Estabelecimento da Relação Jurídico-Laboral',
    titleEn: 'Establishment of the Employment Relationship',
    articles: [
      {
        number: '8',
        title: 'Constituição do contrato',
        titleEn: 'Formation of the contract',
        content:
          'O contrato de trabalho constitui-se pelo acordo de vontades entre trabalhador e empregador sobre a prestação de trabalho subordinado, mediante retribuição.',
        keywords: ['contrato', 'constituição', 'acordo', 'retribuição'],
      },
      {
        number: '12',
        title: 'Forma do contrato',
        titleEn: 'Form of the contract',
        content:
          'O contrato não está sujeito a forma especial, salvo disposição legal. Deve ser escrito quando: for por tempo determinado; envolver trabalhador estrangeiro; ou a lei o exigir.',
        keywords: ['forma', 'escrito', 'contrato', 'estrangeiro', 'termo'],
      },
      {
        number: '14',
        title: 'Duração do contrato',
        titleEn: 'Contract duration',
        content:
          'O contrato pode ser por tempo indeterminado ou determinado. O contrato por tempo determinado só é admissível em situações expressamente previstas na lei.',
        keywords: ['duração', 'indeterminado', 'determinado', 'termo'],
      },
      {
        number: '16',
        title: 'Duração do contrato por tempo determinado',
        titleEn: 'Fixed-term contract duration',
        content:
          'O contrato por tempo determinado tem duração máxima de 5 anos, incluindo renovações. Ultrapassado esse prazo, converte-se em contrato por tempo indeterminado.',
        keywords: ['termo', 'determinado', '5 anos', 'renovação', 'conversão'],
      },
      {
        number: '18',
        title: 'Período experimental',
        titleEn: 'Probation period',
        content:
          'No contrato por tempo indeterminado: 60 dias (podendo acordar até 120 dias, ou 180 dias para funções de direcção). No contrato por tempo determinado: máximo 30 dias se acordado por escrito. Durante o período experimental qualquer parte pode cessar o contrato sem aviso prévio nem indemnização.',
        keywords: ['período', 'experimental', 'probatório', '60 dias', '120 dias', '180 dias'],
      },
      {
        number: '31',
        title: 'Licença de maternidade',
        titleEn: 'Maternity leave',
        content:
          'A trabalhadora tem direito a licença de maternidade de três meses, podendo iniciar até quatro semanas antes do parto previsto. Em parto múltiplo, a parte pós-parto alarga-se em mais quatro semanas.',
        keywords: ['maternidade', 'licença', '90 dias', 'parto', 'gravidez'],
      },
      {
        number: '35',
        title: 'Protecção contra despedimento',
        titleEn: 'Protection against dismissal',
        content:
          'A trabalhadora grávida, puérpera ou em licença de maternidade não pode ser despedida por causas objectivas, salvo autorização da Inspecção Geral do Trabalho.',
        keywords: ['protecção', 'despedimento', 'grávida', 'maternidade', 'inspecção'],
      },
      {
        number: '62',
        title: 'Modalidades do teletrabalho',
        titleEn: 'Remote work modalities',
        content:
          'O teletrabalho pode ser a tempo completo ou parcial, permanente ou temporário. O trabalhador em teletrabalho tem os mesmos direitos dos demais trabalhadores.',
        keywords: ['teletrabalho', 'remoto', 'modalidades', 'direitos'],
      },
    ],
  },
  {
    id: 'cap3',
    number: 'III',
    title: 'Conteúdo da Relação Jurídico-Laboral',
    titleEn: 'Content of the Employment Relationship',
    articles: [
      {
        number: '81',
        title: 'Deveres da entidade empregadora',
        titleEn: 'Employer duties',
        content:
          'São deveres do empregador: respeitar e tratar com urbanidade o trabalhador; pagar pontualmente a retribuição; proporcionar boas condições de trabalho; contribuir para a segurança social; passar certificado de trabalho.',
        keywords: ['deveres', 'empregador', 'pagamento', 'condições', 'INSS'],
      },
      {
        number: '84',
        title: 'Deveres do trabalhador',
        titleEn: 'Employee duties',
        content:
          'São deveres do trabalhador: comparecer com assiduidade e pontualidade; realizar o trabalho com zelo; cumprir ordens legítimas; guardar lealdade; velar pela conservação dos bens da empresa.',
        keywords: ['deveres', 'trabalhador', 'assiduidade', 'pontualidade', 'lealdade'],
      },
      {
        number: '86',
        title: 'Poder disciplinar',
        titleEn: 'Disciplinary power',
        content:
          'O empregador tem poder disciplinar sobre o trabalhador, podendo aplicar medidas disciplinares por infracções, nos limites e forma estabelecidos na lei.',
        keywords: ['disciplinar', 'poder', 'medidas', 'infracção'],
      },
      {
        number: '87',
        title: 'Medidas disciplinares',
        titleEn: 'Disciplinary measures',
        content:
          'Medidas aplicáveis: admoestação oral; admoestação registada; despromoção temporária; redução temporária de salário; suspensão com perda parcial de retribuição; despedimento disciplinar.',
        keywords: ['medidas', 'advertência', 'suspensão', 'despedimento', 'disciplinar'],
      },
      {
        number: '88',
        title: 'Procedimento disciplinar',
        titleEn: 'Disciplinary procedure',
        content:
          'A medida disciplinar (excepto admoestação oral) exige procedimento com convocatória escrita, descrição dos factos, qualificação jurídica, data da entrevista e direito a defesa com acompanhante e testemunhas.',
        keywords: ['procedimento', 'disciplinar', 'entrevista', 'defesa', 'convocatória'],
      },
      {
        number: '101',
        title: 'Prazo de prescrição e caducidade',
        titleEn: 'Prescription and lapse',
        content:
          'O procedimento disciplinar deve iniciar-se no prazo legal após conhecimento da infracção. A medida não pode ser decidida antes de 3 dias úteis nem depois de 30 dias sobre a data da entrevista.',
        keywords: ['prescrição', 'caducidade', 'prazo', '30 dias', 'disciplinar'],
      },
    ],
  },
  {
    id: 'cap6',
    number: 'VI',
    title: 'Organização e Duração Temporal do Trabalho',
    titleEn: 'Organization and Working Time',
    articles: [
      {
        number: '148',
        title: 'Duração do período normal de trabalho',
        titleEn: 'Normal working hours',
        content:
          'O período normal não pode exceder 44 horas semanais nem 8 horas diárias. Excepções: até 9h/dia (trabalho intermitente, 5 dias/semana) ou até 10h/dia (horário modulado/variável ou recuperação).',
        keywords: ['horário', 'horas', '44', '8', 'diário', 'semanal'],
      },
      {
        number: '179',
        title: 'Noção de trabalho nocturno',
        titleEn: 'Night work',
        content:
          'Considera-se trabalho nocturno o prestado entre as 20h00 de um dia e as 6h00 do dia seguinte.',
        keywords: ['nocturno', 'noite', '22h', '6h'],
      },
      {
        number: '182',
        title: 'Remuneração do trabalho nocturno',
        titleEn: 'Night work pay',
        content:
          'O trabalho nocturno confere remuneração adicional de 20% sobre o salário de base (substituível por redução de tempo por convenção colectiva).',
        keywords: ['nocturno', '20%', 'acréscimo', 'remuneração'],
      },
      {
        number: '183',
        title: 'Noção de trabalho extraordinário',
        titleEn: 'Overtime definition',
        content:
          'É trabalho extraordinário o exercido fora do período normal diário, no prolongamento deste, no intervalo de refeição/descanso ou em dia/meio-dia de descanso complementar ou semanal.',
        keywords: ['extraordinário', 'horas extra', 'prolongamento', 'descanso'],
      },
      {
        number: '185',
        title: 'Limites do trabalho extraordinário',
        titleEn: 'Overtime limits',
        content:
          'Limites: 2 horas por dia normal de trabalho; 40 horas por mês; 200 horas por ano.',
        keywords: ['extraordinário', 'limite', '40 horas', '200 horas', '2 horas'],
      },
      {
        number: '186',
        title: 'Descanso compensatório',
        titleEn: 'Compensatory rest',
        content:
          'Trabalho extraordinário que impeça repouso diário: direito a descanso compensatório remunerado no dia útil seguinte. Em dia de descanso semanal: um dia de descanso compensatório remunerado.',
        keywords: ['descanso', 'compensatório', 'extraordinário', 'repouso'],
      },
      {
        number: '187',
        title: 'Registo de trabalho extraordinário',
        titleEn: 'Overtime records',
        content:
          'O empregador deve manter registo do início e fim do trabalho extraordinário. Violação do registo garante ao trabalhador retribuição equivalente a duas horas de extraordinário por cada dia.',
        keywords: ['registo', 'extraordinário', 'folha', 'efectividade'],
      },
      {
        number: '188',
        title: 'Remuneração do trabalho extraordinário',
        titleEn: 'Overtime pay',
        content:
          'Para pagamento: fracções inferiores a 15 minutos não contam; 15–44 minutos contam como meia hora; 45–60 minutos como uma hora. O dia/meio-dia de descanso complementar semanal conta como dia normal para efeito de remuneração.',
        keywords: ['remuneração', 'extraordinário', 'fracções', 'pagamento'],
      },
    ],
  },
  {
    id: 'cap7',
    number: 'VII',
    title: 'Interrupção da Prestação do Trabalho',
    titleEn: 'Interruption of Work',
    articles: [
      {
        number: '191',
        title: 'Direito ao descanso semanal',
        titleEn: 'Weekly rest',
        content:
          'O trabalhador tem direito a um dia de descanso semanal, normalmente ao domingo, salvo actividades em regime de laboração contínua ou por turnos.',
        keywords: ['descanso', 'semanal', 'domingo', 'repouso'],
      },
      {
        number: '200',
        title: 'Remuneração em feriados',
        titleEn: 'Holiday pay',
        content:
          'Feriados e tolerâncias de ponto são dias normais para efeito de salário. Trabalho em feriado (fora de turnos): acréscimo de mais de um dia de salário normal + descanso compensatório nos 3 dias seguintes.',
        keywords: ['feriado', 'remuneração', 'tolerância', 'descanso compensatório'],
      },
      {
        number: '201',
        title: 'Direito a férias',
        titleEn: 'Right to annual leave',
        content:
          'O trabalhador tem direito, em cada ano civil, a férias remuneradas. O direito reporta-se ao trabalho do ano anterior e vence a 1 de Janeiro. No ano de admissão, após 6 meses de trabalho efectivo, o gozo é proporcional.',
        keywords: ['férias', 'direito', '22 dias', 'remuneradas', 'janeiro'],
      },
      {
        number: '204',
        title: 'Duração das férias',
        titleEn: 'Leave duration',
        content:
          'Período de férias: 22 dias úteis por ano (não contam descanso semanal, complementar nem feriados). No ano de admissão: 2 dias úteis por mês completo, mínimo 6 dias. Idêntico cálculo se o contrato esteve suspenso por facto do trabalhador.',
        keywords: ['férias', 'duração', '22 dias', 'antiguidade', 'admissão'],
      },
      {
        number: '206',
        title: 'Plano de férias',
        titleEn: 'Leave schedule',
        content:
          'Cada centro de trabalho organiza plano de férias com datas de início e fim. Deve ser afixado até 31 de Janeiro e permanecer visível enquanto houver trabalhadores a gozar férias no ano.',
        keywords: ['plano', 'férias', 'marcação', '31 janeiro'],
      },
      {
        number: '212',
        title: 'Remuneração de férias por cessação',
        titleEn: 'Leave pay on termination',
        content:
          'Na cessação do contrato, o trabalhador tem direito à remuneração de férias vencidas e não gozadas, e ainda a 2 dias úteis por mês completo desde 1 de Janeiro (ou desde admissão se cessação antes do vencimento).',
        keywords: ['férias', 'cessação', 'remuneração', 'rescisão', 'indemnização'],
      },
      {
        number: '213',
        title: 'Remuneração e gratificação de férias',
        titleEn: 'Holiday pay and subsidy',
        content:
          'Remuneração de férias = salário-base + complementos técnicos e de disponibilidade. Subsídios de transporte/alimentação não são pagos durante férias salvo acordo. Pagamento até 15 dias antes do início do gozo.',
        keywords: ['subsídio', 'férias', 'gratificação', 'remuneração', '15 dias'],
      },
      {
        number: '216',
        title: 'Licença sem remuneração',
        titleEn: 'Unpaid leave',
        content:
          'A pedido do trabalhador, o empregador pode autorizar licença sem remuneração. Conta para antiguidade. Até 30 dias conta como tempo efectivo para férias; superior a 30 dias aplica regras de suspensão (Art. 204.º n.º 3).',
        keywords: ['licença', 'sem remuneração', 'antiguidade', 'férias'],
      },
      {
        number: '218',
        title: 'Licença de paternidade',
        titleEn: 'Paternity leave',
        content:
          'O pai tem direito a licença de paternidade nos termos regulamentados (incluindo substituição da mãe em casos de incapacidade ou morte da mãe). Consulte também regulamentação do INSS sobre subsídio parental.',
        keywords: ['paternidade', 'licença', 'pai', 'nascimento', 'parental'],
      },
      {
        number: '219',
        title: 'Conceito de falta',
        titleEn: 'Absence definition',
        content:
          'Falta é a ausência do trabalhador no local de trabalho durante o período normal diário. Ausências parciais somam-se para determinar dias de falta. Faltas injustificadas permitem desconto no salário do mês.',
        keywords: ['falta', 'ausência', 'desconto', 'assiduidade'],
      },
      {
        number: '230',
        title: 'Efeitos das faltas injustificadas',
        titleEn: 'Unjustified absence effects',
        content:
          'Faltas injustificadas implicam cumulativamente: perda de remuneração; infracção disciplinar quando excedam 3 dias/mês ou 12 dias/ano, ou causem prejuízos/riscos graves.',
        keywords: ['faltas', 'injustificadas', 'desconto', 'disciplinar', '3 dias', '12 dias'],
      },
    ],
  },
  {
    id: 'cap8',
    number: 'VIII',
    title: 'Valorização, Remuneração e Direitos Económicos',
    titleEn: 'Remuneration and Economic Rights',
    articles: [
      {
        number: '235',
        title: 'Conceito de remuneração',
        titleEn: 'Definition of remuneration',
        content:
          'Remuneração é a contrapartida do trabalho, incluindo salário-base, complementos regulares e eventuais, e outras prestações em dinheiro ou espécie previstas na lei ou contrato.',
        keywords: ['remuneração', 'salário', 'componentes', 'complementos'],
      },
      {
        number: '237',
        title: 'Não discriminação e salário-hora',
        titleEn: 'Equal pay and hourly rate',
        content:
          'Igualdade de remuneração para trabalho igual ou de igual complexidade. Fórmula salário-hora: S/H = (Sm × 12) / (52s × Hs), em que Sm é salário-base mensal e Hs horário semanal normal.',
        keywords: ['discriminação', 'salário-hora', 'fórmula', 'igualdade', 'cálculo'],
      },
      {
        number: '238',
        title: 'Complementos remuneratórios anuais',
        titleEn: 'Annual supplements',
        content:
          'Por cada ano de serviço efectivo: mínimo de 50% do salário-base como gratificação de férias (pago até 15 dias antes do gozo); mínimo de 50% do salário-base como subsídio de Natal. Proporcional se não completou o ano.',
        keywords: ['natal', 'subsídio', 'férias', '50%', '13º', 'gratificação'],
      },
      {
        number: '239',
        title: 'Informação das remunerações',
        titleEn: 'Pay information',
        content:
          'Antes de ocupar o posto, o empregador informa o trabalhador das condições remuneratórias. Gratificações anuais são proporcionais aos meses completos trabalhados em caso de admissão, suspensão ou cessação durante o ano.',
        keywords: ['informação', 'remuneração', 'proporcional', 'admissão'],
      },
      {
        number: '241',
        title: 'Fixação do salário mínimo nacional',
        titleEn: 'National minimum wage',
        content:
          'O salário mínimo nacional é fixado por diploma do Executivo, ouvidas organizações sindicais e patronais. A retribuição não pode ser inferior ao mínimo legal.',
        keywords: ['salário', 'mínimo', 'nacional', 'SMN'],
      },
      {
        number: '243',
        title: 'Periodicidade e prazo de pagamento',
        titleEn: 'Pay frequency and deadline',
        content:
          'O salário vence por períodos certos (mês, quinzena ou semana) e deve ser pago pontualmente até ao último dia útil do período a que se refere, durante as horas normais de trabalho.',
        keywords: ['pagamento', 'prazo', 'último dia útil', 'mensal', 'salário'],
      },
    ],
  },
  {
    id: 'cap10',
    number: 'X',
    title: 'Extinção da Relação Jurídico-Laboral',
    titleEn: 'Termination of Employment',
    articles: [
      {
        number: '275',
        title: 'Certificado de trabalho',
        titleEn: 'Employment certificate',
        content:
          'No prazo de 8 dias após a cessação, o empregador passa certificado indicando datas de admissão e cessação, funções exercidas e retribuições auferidas.',
        keywords: ['certificado', 'trabalho', 'cessação', 'documento'],
      },
      {
        number: '280',
        title: 'Cessação por mútuo acordo',
        titleEn: 'Mutual agreement',
        content:
          'As partes podem acordar a cessação do contrato, fixando livremente as condições, sem prejuízo dos direitos irrenunciáveis do trabalhador.',
        keywords: ['acordo', 'cessação', 'mútuo', 'rescisão'],
      },
      {
        number: '281',
        title: 'Justa causa',
        titleEn: 'Just cause',
        content:
          'O despedimento com invocação de justa causa disciplinar exige procedimento disciplinar válido e fundamentos previstos na lei (Art. 282.º).',
        keywords: ['justa causa', 'despedimento', 'disciplinar'],
      },
      {
        number: '282',
        title: 'Fundamentos da justa causa disciplinar',
        titleEn: 'Disciplinary just cause grounds',
        content:
          'Constituem justa causa, entre outros: desobediência grave; violação de direitos de colegas; provocação de conflitos; lesões; furto/roubo; abandono; faltas injustificadas reiteradas; embriaguez habitual no trabalho.',
        keywords: ['justa causa', 'despedimento', 'furto', 'abandono', 'faltas'],
      },
      {
        number: '286',
        title: 'Aviso prévio do empregador',
        titleEn: 'Employer notice period',
        content:
          'No despedimento por causas objectivas, o empregador envia aviso prévio com antecedência mínima de 30 dias, indicando motivo, data de cessação e montante/forma de pagamento da compensação e créditos.',
        keywords: ['aviso prévio', 'despedimento', '30 dias', 'compensação'],
      },
      {
        number: '287',
        title: 'Direitos durante aviso prévio',
        titleEn: 'Rights during notice',
        content:
          'Durante o aviso prévio de despedimento (motivos não económicos), o trabalhador tem direito a 15 dias de dispensa remunerada para procurar emprego.',
        keywords: ['aviso prévio', 'dispensa', '15 dias', 'procurar emprego'],
      },
      {
        number: '305',
        title: 'Denúncia pelo trabalhador',
        titleEn: 'Employee resignation',
        content:
          'Sem justa causa, o trabalhador pode cessar o contrato com aviso prévio escrito de 30 dias. Falta de aviso: compensação ao empregador equivalente ao salário do período em falta.',
        keywords: ['denúncia', 'aviso prévio', '30 dias', 'rescisão', 'trabalhador'],
      },
      {
        number: '308',
        title: 'Compensação por despedimento objectivo',
        titleEn: 'Objective dismissal compensation',
        content:
          'Compensação = salário-base × anos de antiguidade (máx. 5 anos) + 50% do salário-base × anos que excedam 5. Fracções ≥ 3 meses contam como um ano (Art. 311.º).',
        keywords: ['compensação', 'despedimento', 'antiguidade', 'indemnização'],
      },
      {
        number: '310',
        title: 'Indemnização por despedimento ilícito',
        titleEn: 'Unlawful dismissal compensation',
        content:
          'Em caso de ilicitude do despedimento disciplinar (sem reintegração) ou despedimento indirecto: indemnização = salário-base × anos de antiguidade, com mínimo de 3 meses de salário-base.',
        keywords: ['indemnização', 'despedimento', 'ilicitude', '3 meses', 'antiguidade'],
      },
    ],
  },
];

export const complementaryLegislation: ComplementarySection[] = [
  {
    id: 'inss',
    title: 'Segurança Social (INSS)',
    titleEn: 'Social Security (INSS)',
    reference: 'Lei de Protecção Social / Decreto Presidencial n.º 48/24',
    articles: [
      {
        id: 'inss-worker',
        title: 'Contribuição do trabalhador',
        titleEn: 'Employee contribution',
        reference: 'Regime geral INSS',
        content:
          'O trabalhador contribui com 3% da retribuição bruta mensal (8% se reformado que retoma trabalho). O valor é retido pelo empregador e entregue ao INSS.',
        keywords: ['INSS', '3%', 'trabalhador', 'contribuição', 'reforma'],
      },
      {
        id: 'inss-employer',
        title: 'Contribuição do empregador',
        titleEn: 'Employer contribution',
        reference: 'Regime geral INSS',
        content:
          'O empregador contribui com 8% adicional sobre a retribuição bruta do trabalhador. Não é descontado do salário do trabalhador.',
        keywords: ['INSS', '8%', 'empregador', 'patronal', 'contribuição'],
      },
      {
        id: 'inss-base',
        title: 'Base de incidência (folha)',
        titleEn: 'Contribution base (payroll)',
        reference: 'Prática PayrollAO',
        content:
          'Base INSS na folha: salário-base, subsídios de alimentação e transporte, subsídio de Natal, horas extraordinárias e outros complementos. Subsídio de férias e abono de família ficam normalmente excluídos da base INSS.',
        keywords: ['INSS', 'base', 'subsídio', 'férias', 'abono'],
      },
    ],
  },
  {
    id: 'irt',
    title: 'Imposto sobre o Rendimento do Trabalho (IRT)',
    titleEn: 'Personal Income Tax (IRT)',
    reference: 'Código do IRT — Grupo A (rendimentos do trabalho)',
    articles: [
      {
        id: 'irt-general',
        title: 'Retenção na fonte',
        titleEn: 'Withholding tax',
        reference: 'Código do IRT',
        content:
          'O IRT incide sobre rendimentos do trabalho por conta de outrem, retido na fonte pelo empregador segundo tabela progressiva. Rendimento colectável = rendimento tributável − INSS (3%).',
        keywords: ['IRT', 'imposto', 'retenção', 'fonte', 'progressivo'],
      },
      {
        id: 'irt-exempt',
        title: 'Isenções e exclusões (folha)',
        titleEn: 'Exemptions (payroll)',
        reference: 'Código do IRT / prática PayrollAO',
        content:
          'Isento até 150.000 Kz (1.º escalão, 2025). Abono de família isento. Subsídios de alimentação e transporte: só tributa o excesso acima de 30.000 Kz cada. Subsídio de Natal e de férias são tributáveis.',
        keywords: ['IRT', 'isenção', '150000', 'alimentação', 'transporte', 'abono'],
      },
      {
        id: 'irt-table',
        title: 'Tabela progressiva (referência)',
        titleEn: 'Tax brackets (reference)',
        reference: 'Diário da República, 30/12/2025 — Anexo I',
        content:
          'Escalões principais: até 150.000 Kz isento; 150.001–200.000 (16%); 200.001–300.000 (18%); 300.001–500.000 (19%); 500.001–1.000.000 (20%); acima progressivo até 25%. Ver cálculo exacto em Folha de Salário / Simulador IRT.',
        keywords: ['IRT', 'tabela', 'escalões', 'taxa', '2025'],
      },
    ],
  },
];

export function getLawIndexStats() {
  const indexedArticles = laborLawChapters.reduce((n, ch) => n + ch.articles.length, 0);
  const complementaryArticles = complementaryLegislation.reduce((n, s) => n + s.articles.length, 0);
  return {
    indexedArticles,
    indexedChapters: laborLawChapters.length,
    complementaryArticles,
    coveragePercent: Math.round((indexedArticles / LAW_METADATA.totalArticles) * 100),
  };
}

export type LaborLawSearchHit =
  | { kind: 'lgt'; chapter: LaborLawChapter; article: LaborLawArticle }
  | { kind: 'complementary'; section: ComplementarySection; article: ComplementaryArticle };

function matchesQuery(
  query: string,
  fields: { title: string; titleEn?: string; content: string; contentEn?: string; keywords: string[]; number?: string }
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return false;
  const haystack = [
    fields.title,
    fields.titleEn ?? '',
    fields.content,
    fields.contentEn ?? '',
    ...fields.keywords,
    fields.number ? `artigo ${fields.number}` : '',
    fields.number ? `art. ${fields.number}` : '',
    fields.number ?? '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q) || fields.keywords.some((k) => k.toLowerCase().includes(q));
}

export function searchLaborLaw(query: string): LaborLawSearchHit[] {
  const results: LaborLawSearchHit[] = [];
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return results;

  laborLawChapters.forEach((chapter) => {
    chapter.articles.forEach((article) => {
      if (matchesQuery(normalizedQuery, article)) {
        results.push({ kind: 'lgt', chapter, article });
      }
    });
  });

  complementaryLegislation.forEach((section) => {
    section.articles.forEach((article) => {
      if (matchesQuery(normalizedQuery, article)) {
        results.push({ kind: 'complementary', section, article });
      }
    });
  });

  return results;
}
