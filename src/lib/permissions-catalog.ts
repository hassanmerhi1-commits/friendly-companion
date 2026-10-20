/**
 * PayrollAO permission catalog - top-nav tabs, inner tabs, and action keys.
 */

export type Permission =
  | 'dashboard.view'
  | 'cards.view'
  | 'taxsim.view'
  | 'settings.view'
  | 'settings.edit'
  | 'settings.company'
  | 'settings.payments'
  | 'settings.tax'
  | 'settings.irt'
  | 'settings.notifications'
  | 'settings.assistant'
  | 'settings.updates'
  | 'settings.province'
  | 'settings.network'
  | 'settings.database'
  | 'settings.backup_json'
  | 'settings.backup_sqlite'
  | 'settings.reset'
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'employees.tab_overview'
  | 'employees.tab_folha'
  | 'employees.tab_attendance'
  | 'employees.tab_financeiro'
  | 'employees.tab_rh'
  | 'employees.tab_auditoria'
  | 'payroll.view'
  | 'payroll.history'
  | 'payroll.calculate'
  | 'payroll.approve'
  | 'payroll.export'
  | 'payroll.archive'
  | 'payroll.reopen'
  | 'deductions.view'
  | 'deductions.create'
  | 'deductions.edit'
  | 'deductions.delete'
  | 'deductions.advance_tab'
  | 'deductions.advance_request'
  | 'deductions.advance_approve'
  | 'branches.view'
  | 'branches.create'
  | 'branches.edit'
  | 'branches.delete'
  | 'attendance.view'
  | 'attendance.create'
  | 'attendance.edit'
  | 'attendance.delete'
  | 'attendance.edit_past'
  | 'attendance.close'
  | 'attendance.daily'
  | 'attendance.bulk'
  | 'attendance.clock'
  | 'attendance.records'
  | 'attendance.overtime'
  | 'attendance.calendar'
  | 'attendance.effectiveness'
  | 'hr.view'
  | 'hr.create'
  | 'hr.edit'
  | 'hr.delete'
  | 'hr.termination'
  | 'hr.disciplinary'
  | 'hr.adjustments'
  | 'hr.history'
  | 'hr.comparison'
  | 'hr.transfer'
  | 'loans.view'
  | 'loans.create'
  | 'loans.edit'
  | 'loans.delete'
  | 'holidays.view'
  | 'holidays.create'
  | 'holidays.edit'
  | 'reports.view'
  | 'reports.export'
  | 'reports.fiscal'
  | 'reports.payroll'
  | 'reports.hr'
  | 'reports.attendance'
  | 'reports.annual'
  | 'reports.holiday_plan'
  | 'documents.view'
  | 'documents.create'
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'laborlaw.view';

export type UserRole = 'admin' | 'manager' | 'hr' | 'accountant' | 'viewer';

export type PermissionCategoryDef = {
  labelPt: string;
  labelEn: string;
  permissions: { key: Permission; labelPt: string; labelEn: string }[];
};

const EMPLOYEE_PROFILE_TABS: Permission[] = ['employees.tab_overview', 'employees.tab_folha', 'employees.tab_attendance', 'employees.tab_financeiro', 'employees.tab_rh', 'employees.tab_auditoria'];

const ATTENDANCE_INNER_TABS: Permission[] = ['attendance.daily', 'attendance.bulk', 'attendance.clock', 'attendance.records', 'attendance.overtime', 'attendance.calendar', 'attendance.effectiveness'];

const HR_INNER_TABS: Permission[] = ['hr.termination', 'hr.disciplinary', 'hr.adjustments', 'hr.history', 'hr.comparison', 'hr.transfer'];

const SETTINGS_INNER_TABS: Permission[] = ['settings.company', 'settings.payments', 'settings.tax', 'settings.irt', 'settings.notifications', 'settings.assistant', 'settings.updates', 'settings.province', 'settings.network', 'settings.database', 'settings.backup_json', 'settings.backup_sqlite', 'settings.reset'];

const SETTINGS_INNER_SAFE: Permission[] = SETTINGS_INNER_TABS.filter((p) => p !== 'settings.reset');

const REPORTS_INNER: Permission[] = ['reports.fiscal', 'reports.payroll', 'reports.hr', 'reports.attendance', 'reports.annual', 'reports.holiday_plan'];

export const NEW_TAB_PERMISSION_MARKERS: Permission[] = ['dashboard.view', 'cards.view', 'payroll.history', 'taxsim.view', 'attendance.daily', 'hr.termination', 'settings.company', 'reports.fiscal', 'employees.tab_overview'];

export function expandLegacyPermissions(perms: Permission[]): Permission[] {
  if (!Array.isArray(perms) || perms.length === 0) return [];
  const set = new Set<Permission>(perms);
  const add = (...keys: Permission[]) => keys.forEach((k) => set.add(k));
  const hasNew = perms.some((p) => NEW_TAB_PERMISSION_MARKERS.includes(p));

  if (!hasNew) {
    // Old permission lists: expand parent → all inner tabs
    add('dashboard.view');
    if (set.has('employees.view')) add('cards.view', ...EMPLOYEE_PROFILE_TABS);
    if (set.has('payroll.view')) add('payroll.history', 'taxsim.view');
    if (set.has('attendance.view')) add(...ATTENDANCE_INNER_TABS);
    if (set.has('hr.view')) add(...HR_INNER_TABS);
    if (set.has('settings.view')) add(...SETTINGS_INNER_SAFE);
    if (set.has('reports.view')) add(...REPORTS_INNER);
  } else {
    // Partial/new lists: only ADD missing gaps — never remove grants.
    // Critical: settings.view must keep Empresa (company name/logo) reachable after 1.0.96.
    if (set.has('settings.view')) {
      const hasAnySettingsTab = SETTINGS_INNER_TABS.some((p) => set.has(p));
      if (!hasAnySettingsTab) {
        add(...SETTINGS_INNER_SAFE);
      } else if (!set.has('settings.company')) {
        add('settings.company');
      }
    }
  }

  return [...set];
}

export const PERMISSION_CATEGORIES: Record<string, PermissionCategoryDef> = {
  geral: {
    labelPt: 'Geral',
    labelEn: 'General',
    permissions: [
      { key: 'dashboard.view', labelPt: 'Ver Dashboard', labelEn: 'View Dashboard' },
      { key: 'cards.view', labelPt: 'Ver Cartoes ID', labelEn: 'View ID Cards' },
      { key: 'taxsim.view', labelPt: 'Ver Simulador IRT', labelEn: 'View Tax Simulator' },
    ],
  },
  ficheiro: {
    labelPt: 'Definicoes',
    labelEn: 'Settings',
    permissions: [
      { key: 'settings.view', labelPt: 'Abrir Definicoes', labelEn: 'Open Settings' },
      { key: 'settings.edit', labelPt: 'Guardar alteracoes', labelEn: 'Save changes' },
      { key: 'settings.company', labelPt: 'Separador Empresa', labelEn: 'Company tab' },
      { key: 'settings.payments', labelPt: 'Separador Pagamentos', labelEn: 'Payments tab' },
      { key: 'settings.tax', labelPt: 'Separador Impostos', labelEn: 'Tax rates tab' },
      { key: 'settings.irt', labelPt: 'Separador IRT 2026', labelEn: 'IRT 2026 tab' },
      { key: 'settings.notifications', labelPt: 'Separador Notificacoes', labelEn: 'Notifications tab' },
      { key: 'settings.assistant', labelPt: 'Separador Assistente', labelEn: 'Assistant tab' },
      { key: 'settings.updates', labelPt: 'Separador Actualizacoes', labelEn: 'Updates tab' },
      { key: 'settings.province', labelPt: 'Separador Provincia', labelEn: 'Province tab' },
      { key: 'settings.network', labelPt: 'Separador Rede LAN', labelEn: 'LAN tab' },
      { key: 'settings.database', labelPt: 'Separador Base dados', labelEn: 'Database tab' },
      { key: 'settings.backup_json', labelPt: 'Separador Backup JSON', labelEn: 'JSON backup tab' },
      { key: 'settings.backup_sqlite', labelPt: 'Separador SQLite', labelEn: 'SQLite tab' },
      { key: 'settings.reset', labelPt: 'Separador Repor dados', labelEn: 'Reset data tab' },
    ],
  },
  funcionarios: {
    labelPt: 'Funcionarios',
    labelEn: 'Employees',
    permissions: [
      { key: 'employees.view', labelPt: 'Ver lista', labelEn: 'View list' },
      { key: 'employees.create', labelPt: 'Criar', labelEn: 'Create' },
      { key: 'employees.edit', labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'employees.delete', labelPt: 'Eliminar', labelEn: 'Delete' },
      { key: 'employees.tab_overview', labelPt: 'Perfil: Resumo', labelEn: 'Profile: Overview' },
      { key: 'employees.tab_folha', labelPt: 'Perfil: Folha', labelEn: 'Profile: Payroll' },
      { key: 'employees.tab_attendance', labelPt: 'Perfil: Presencas', labelEn: 'Profile: Attendance' },
      { key: 'employees.tab_financeiro', labelPt: 'Perfil: Financeiro', labelEn: 'Profile: Financial' },
      { key: 'employees.tab_rh', labelPt: 'Perfil: RH', labelEn: 'Profile: HR' },
      { key: 'employees.tab_auditoria', labelPt: 'Perfil: Auditoria', labelEn: 'Profile: Audit' },
    ],
  },
  folhaSalarial: {
    labelPt: 'Folha Salarial',
    labelEn: 'Payroll',
    permissions: [
      { key: 'payroll.view', labelPt: 'Ver folha', labelEn: 'View payroll' },
      { key: 'payroll.history', labelPt: 'Ver historico', labelEn: 'View history' },
      { key: 'payroll.calculate', labelPt: 'Calcular', labelEn: 'Calculate' },
      { key: 'payroll.approve', labelPt: 'Aprovar', labelEn: 'Approve' },
      { key: 'payroll.export', labelPt: 'Exportar', labelEn: 'Export' },
      { key: 'payroll.archive', labelPt: 'Arquivar', labelEn: 'Archive' },
      { key: 'payroll.reopen', labelPt: 'Reabrir', labelEn: 'Reopen' },
    ],
  },
  deducoes: {
    labelPt: 'Deducoes',
    labelEn: 'Deductions',
    permissions: [
      { key: 'deductions.view', labelPt: 'Ver', labelEn: 'View' },
      { key: 'deductions.create', labelPt: 'Criar', labelEn: 'Create' },
      { key: 'deductions.edit', labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'deductions.delete', labelPt: 'Eliminar', labelEn: 'Delete' },
      { key: 'deductions.advance_tab', labelPt: 'Separador Pedidos adiantamento', labelEn: 'Advance requests tab' },
      { key: 'deductions.advance_request', labelPt: 'Criar pedido adiantamento', labelEn: 'Create advance request' },
      { key: 'deductions.advance_approve', labelPt: 'Aprovar pedido adiantamento', labelEn: 'Approve advance request' },
    ],
  },
  filiais: {
    labelPt: 'Filiais',
    labelEn: 'Branches',
    permissions: [
      { key: 'branches.view', labelPt: 'Ver', labelEn: 'View' },
      { key: 'branches.create', labelPt: 'Criar', labelEn: 'Create' },
      { key: 'branches.edit', labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'branches.delete', labelPt: 'Eliminar', labelEn: 'Delete' },
    ],
  },
  assiduidade: {
    labelPt: 'Assiduidade',
    labelEn: 'Attendance',
    permissions: [
      { key: 'attendance.view', labelPt: 'Abrir Presencas', labelEn: 'Open Attendance' },
      { key: 'attendance.create', labelPt: 'Criar', labelEn: 'Create' },
      { key: 'attendance.edit', labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'attendance.delete', labelPt: 'Eliminar', labelEn: 'Delete' },
      { key: 'attendance.edit_past', labelPt: 'Editar meses anteriores', labelEn: 'Edit past months' },
      { key: 'attendance.close', labelPt: 'Fechar/Reabrir', labelEn: 'Close/Reopen' },
      { key: 'attendance.daily', labelPt: 'Separador Diario', labelEn: 'Daily tab' },
      { key: 'attendance.bulk', labelPt: 'Separador Em massa', labelEn: 'Bulk tab' },
      { key: 'attendance.clock', labelPt: 'Separador Relogio', labelEn: 'Clock tab' },
      { key: 'attendance.records', labelPt: 'Separador Registos', labelEn: 'Records tab' },
      { key: 'attendance.overtime', labelPt: 'Separador Horas Extra', labelEn: 'Overtime tab' },
      { key: 'attendance.calendar', labelPt: 'Separador Calendario', labelEn: 'Calendar tab' },
      { key: 'attendance.effectiveness', labelPt: 'Separador Efectividade', labelEn: 'Effectiveness tab' },
    ],
  },
  recursosHumanos: {
    labelPt: 'Recursos Humanos',
    labelEn: 'HR',
    permissions: [
      { key: 'hr.view', labelPt: 'Abrir Painel RH', labelEn: 'Open HR Panel' },
      { key: 'hr.create', labelPt: 'Criar', labelEn: 'Create' },
      { key: 'hr.edit', labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'hr.delete', labelPt: 'Eliminar', labelEn: 'Delete' },
      { key: 'hr.termination', labelPt: 'Separador Rescisao', labelEn: 'Termination tab' },
      { key: 'hr.disciplinary', labelPt: 'Separador Disciplinar', labelEn: 'Disciplinary tab' },
      { key: 'hr.adjustments', labelPt: 'Separador Ajustes', labelEn: 'Adjustments tab' },
      { key: 'hr.history', labelPt: 'Separador Historico', labelEn: 'History tab' },
      { key: 'hr.comparison', labelPt: 'Separador Comparacao', labelEn: 'Comparison tab' },
      { key: 'hr.transfer', labelPt: 'Separador Transferencias', labelEn: 'Transfers tab' },
    ],
  },
  emprestimos: {
    labelPt: 'Emprestimos',
    labelEn: 'Loans',
    permissions: [
      { key: 'loans.view', labelPt: 'Ver', labelEn: 'View' },
      { key: 'loans.create', labelPt: 'Criar', labelEn: 'Create' },
      { key: 'loans.edit', labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'loans.delete', labelPt: 'Eliminar', labelEn: 'Delete' },
    ],
  },
  ferias: {
    labelPt: 'Ferias',
    labelEn: 'Holidays',
    permissions: [
      { key: 'holidays.view', labelPt: 'Ver', labelEn: 'View' },
      { key: 'holidays.create', labelPt: 'Criar', labelEn: 'Create' },
      { key: 'holidays.edit', labelPt: 'Editar', labelEn: 'Edit' },
    ],
  },
  relatorios: {
    labelPt: 'Relatorios',
    labelEn: 'Reports',
    permissions: [
      { key: 'reports.view', labelPt: 'Abrir Relatorios', labelEn: 'Open Reports' },
      { key: 'reports.export', labelPt: 'Exportar', labelEn: 'Export' },
      { key: 'reports.fiscal', labelPt: 'Filtro Fiscal', labelEn: 'Fiscal filter' },
      { key: 'reports.payroll', labelPt: 'Filtro Folha', labelEn: 'Payroll filter' },
      { key: 'reports.hr', labelPt: 'Filtro RH', labelEn: 'HR filter' },
      { key: 'reports.attendance', labelPt: 'Filtro Presencas', labelEn: 'Attendance filter' },
      { key: 'reports.annual', labelPt: 'Filtro Anual', labelEn: 'Annual filter' },
      { key: 'reports.holiday_plan', labelPt: 'Plano Anual de Ferias', labelEn: 'Annual Holiday Plan' },
    ],
  },
  documentos: {
    labelPt: 'Documentos',
    labelEn: 'Documents',
    permissions: [
      { key: 'documents.view', labelPt: 'Ver', labelEn: 'View' },
      { key: 'documents.create', labelPt: 'Criar', labelEn: 'Create' },
    ],
  },
  utilizadores: {
    labelPt: 'Utilizadores',
    labelEn: 'Users',
    permissions: [
      { key: 'users.view', labelPt: 'Ver', labelEn: 'View' },
      { key: 'users.create', labelPt: 'Criar', labelEn: 'Create' },
      { key: 'users.edit', labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'users.delete', labelPt: 'Eliminar', labelEn: 'Delete' },
    ],
  },
  leiTrabalho: {
    labelPt: 'Lei do Trabalho',
    labelEn: 'Labor Law',
    permissions: [
      { key: 'laborlaw.view', labelPt: 'Ver', labelEn: 'View' },
    ],
  },
};

export function getAllPermissions(): Permission[] {
  const all: Permission[] = [];
  Object.values(PERMISSION_CATEGORIES).forEach((cat) => {
    cat.permissions.forEach((p) => all.push(p.key));
  });
  return all;
}

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: getAllPermissions(),
  manager: ['dashboard.view', 'employees.view', 'employees.create', 'employees.edit', 'employees.tab_overview', 'employees.tab_folha', 'employees.tab_attendance', 'employees.tab_financeiro', 'employees.tab_rh', 'employees.tab_auditoria', 'cards.view', 'payroll.view', 'payroll.history', 'payroll.calculate', 'payroll.approve', 'payroll.export', 'taxsim.view', 'deductions.view', 'deductions.create', 'deductions.edit', 'deductions.advance_tab', 'deductions.advance_request', 'deductions.advance_approve', 'branches.view', 'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.daily', 'attendance.bulk', 'attendance.clock', 'attendance.records', 'attendance.overtime', 'attendance.calendar', 'attendance.effectiveness', 'hr.view', 'hr.create', 'hr.edit', 'hr.termination', 'hr.disciplinary', 'hr.adjustments', 'hr.history', 'hr.comparison', 'hr.transfer', 'loans.view', 'loans.create', 'loans.edit', 'holidays.view', 'holidays.create', 'holidays.edit', 'reports.view', 'reports.export', 'reports.fiscal', 'reports.payroll', 'reports.hr', 'reports.attendance', 'reports.annual', 'reports.holiday_plan', 'documents.view', 'documents.create', 'laborlaw.view', 'settings.view', 'settings.company', 'settings.payments', 'settings.tax', 'settings.irt', 'settings.notifications', 'settings.assistant', 'settings.updates', 'settings.province', 'settings.network', 'settings.database', 'settings.backup_json', 'settings.backup_sqlite'],
  hr: ['dashboard.view', 'employees.view', 'employees.create', 'employees.edit', 'employees.tab_overview', 'employees.tab_folha', 'employees.tab_attendance', 'employees.tab_financeiro', 'employees.tab_rh', 'employees.tab_auditoria', 'cards.view', 'payroll.view', 'payroll.history', 'deductions.view', 'deductions.create', 'deductions.advance_tab', 'deductions.advance_request', 'branches.view', 'attendance.view', 'attendance.create', 'attendance.edit', 'attendance.daily', 'attendance.bulk', 'attendance.clock', 'attendance.records', 'attendance.overtime', 'attendance.calendar', 'attendance.effectiveness', 'hr.view', 'hr.create', 'hr.edit', 'hr.termination', 'hr.disciplinary', 'hr.adjustments', 'hr.history', 'hr.comparison', 'hr.transfer', 'loans.view', 'loans.create', 'holidays.view', 'holidays.create', 'holidays.edit', 'reports.view', 'reports.hr', 'reports.attendance', 'reports.holiday_plan', 'documents.view', 'documents.create', 'laborlaw.view'],
  accountant: ['dashboard.view', 'employees.view', 'employees.tab_overview', 'employees.tab_folha', 'employees.tab_financeiro', 'payroll.view', 'payroll.history', 'payroll.calculate', 'payroll.export', 'taxsim.view', 'deductions.view', 'deductions.create', 'deductions.edit', 'deductions.advance_tab', 'deductions.advance_request', 'deductions.advance_approve', 'attendance.view', 'attendance.effectiveness', 'loans.view', 'loans.create', 'loans.edit', 'reports.view', 'reports.export', 'reports.fiscal', 'reports.payroll', 'reports.annual', 'laborlaw.view'],
  viewer: ['dashboard.view', 'employees.view', 'employees.tab_overview', 'cards.view', 'payroll.view', 'payroll.history', 'deductions.view', 'deductions.advance_tab', 'branches.view', 'attendance.view', 'attendance.daily', 'attendance.records', 'attendance.calendar', 'attendance.effectiveness', 'hr.view', 'hr.history', 'hr.comparison', 'loans.view', 'holidays.view', 'reports.view', 'reports.fiscal', 'reports.payroll', 'reports.hr', 'reports.attendance', 'reports.annual', 'laborlaw.view'],
};

export const roleLabels: Record<UserRole, { pt: string; en: string }> = {
  admin: { pt: 'Administrador', en: 'Administrator' },
  manager: { pt: 'Gestor', en: 'Manager' },
  hr: { pt: 'Recursos Humanos', en: 'Human Resources' },
  accountant: { pt: 'Contabilista', en: 'Accountant' },
  viewer: { pt: 'Visualizador', en: 'Viewer' },
};

export const SETTINGS_TAB_PERMISSION: Record<string, Permission> = {
  empresa: 'settings.company',
  pagamentos: 'settings.payments',
  fiscal: 'settings.tax',
  irt: 'settings.irt',
  notificacoes: 'settings.notifications',
  assistente: 'settings.assistant',
  actualizacoes: 'settings.updates',
  provincia: 'settings.province',
  rede: 'settings.network',
  basedados: 'settings.database',
  'backup-json': 'settings.backup_json',
  'backup-sqlite': 'settings.backup_sqlite',
  reset: 'settings.reset',
};

export const ATTENDANCE_TAB_PERMISSION: Record<string, Permission> = {
  daily: 'attendance.daily',
  bulk: 'attendance.bulk',
  clock: 'attendance.clock',
  records: 'attendance.records',
  overtime: 'attendance.overtime',
  ot_register: 'attendance.overtime', // same gate as Horas Extra (cash summary tab)
  calendar: 'attendance.calendar',
  effectiveness: 'attendance.effectiveness',
};

export const HR_TAB_PERMISSION: Record<string, Permission> = {
  termination: 'hr.termination',
  disciplinary: 'hr.disciplinary',
  adjustments: 'hr.adjustments',
  history: 'hr.history',
  comparison: 'hr.comparison',
  transfer: 'hr.transfer',
};

export const REPORTS_CATEGORY_PERMISSION: Record<string, Permission | null> = {
  all: null,
  fiscal: 'reports.fiscal',
  payroll: 'reports.payroll',
  hr: 'reports.hr',
  attendance: 'reports.attendance',
  annual: 'reports.annual',
};

export const EMPLOYEE_PROFILE_TAB_PERMISSION: Record<string, Permission> = {
  overview: 'employees.tab_overview',
  folha: 'employees.tab_folha',
  attendance: 'employees.tab_attendance',
  financeiro: 'employees.tab_financeiro',
  rh: 'employees.tab_rh',
  auditoria: 'employees.tab_auditoria',
};
