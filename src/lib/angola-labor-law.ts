/**
 * Lei Geral de Trabalho de Angola (Lei n.º 12/23)
 * Angolan General Labor Law - Constants and Calculations
 */

// ============================================================================
// INSS - Instituto Nacional de Segurança Social
// Social Security Contributions (Decreto Presidencial 48/24)
// ============================================================================

export const INSS_RATES = {
  // Employer rate: 8% of gross salary (Lei de Protecção Social)
  EMPLOYER_RATE: 0.08, // 8%
  // Employee rate: 3% of gross salary
  EMPLOYEE_RATE: 0.03, // 3%
  // Retired employees returning to work pay 8% instead of 3%
  RETIRED_EMPLOYEE_RATE: 0.08,
} as const;

// ============================================================================
// IRT - Imposto sobre o Rendimento do Trabalho
// Personal Income Tax Brackets (Group A - Employment Income)
// OLD/Current IRT Table (still in use)
// Formula: IRT = Parcela Fixa + (Rendimento Coletável - Excesso de) × Taxa
// ============================================================================

export interface IRTBracket {
  min: number;
  max: number;
  rate: number;
  fixedAmount: number; // Parcela fixa (fixed amount to add)
  excessOver: number;  // "Excesso de" exactly as defined by the IRT table
}

// IRT Exemption threshold for Transport and Meal Allowances
export const IRT_ALLOWANCE_EXEMPTION = 30_000; // 30,000 Kz

// IRT progressive tax brackets for Group A (Employment Income)
// Formula: IRT = Parcela Fixa + (Rendimento Coletável - Excesso de) × Taxa
// Rendimento Coletável = IRT Taxable Gross - INSS
//
// TABLE SOURCE: "Tabela do IRT" (MAUBE Consultoria e Auditoria)
// Escalão | De (Kz)     | Até (Kz)      | Parcela Fixa | Taxa   | Excesso de
// 1º      | 0           | 100.000       | 0            | Isento | -
// 2º      | 100.001     | 150.000       | 0            | 13%    | 100.001
// 3º      | 150.001     | 200.000       | 12.500       | 16%    | 150.001
// 4º      | 200.001     | 300.000       | 31.250       | 18%    | 200.001
// 5º      | 300.001     | 500.000       | 49.259       | 19%    | 300.001
// 6º      | 500.001     | 1.000.000     | 87.250       | 20%    | 500.001
// 7º      | 1.000.001   | 1.500.000     | 187.249      | 21%    | 1.000.001
// 8º      | 1.500.001   | 2.000.000     | 292.249      | 22%    | 1.500.001
// 9º      | 2.000.001   | 2.500.000     | 402.249      | 23%    | 2.000.001
// 10º     | 2.500.001   | 5.000.000     | 517.249      | 24%    | 2.500.001
// 11º     | 5.000.001   | 10.000.000    | 1.117.249    | 24.5%  | 5.000.001
// 12º     | 10.000.001  | ∞             | 2.342.248    | 25%    | 10.000.001
// 
// IRT INCLUSIONS:
// - Salário Base: Fully taxable
// - Subsídio de Natal (13º mês): Fully taxable
// - Subsídio de Férias: Fully taxable
// - Subsídio de Alimentação: Only EXCESS above 30,000 Kz
// - Subsídio de Transporte: Only EXCESS above 30,000 Kz
// 
// IRT EXCLUSIONS:
// - Abono de Família: Fully exempt from IRT
export const IRT_BRACKETS: IRTBracket[] = [
  { min: 0, max: 100_000, rate: 0, fixedAmount: 0, excessOver: 0 },
  { min: 100_001, max: 150_000, rate: 0.13, fixedAmount: 0, excessOver: 100_001 },
  { min: 150_001, max: 200_000, rate: 0.16, fixedAmount: 12_500, excessOver: 150_001 },
  { min: 200_001, max: 300_000, rate: 0.18, fixedAmount: 31_250, excessOver: 200_001 },
  { min: 300_001, max: 500_000, rate: 0.19, fixedAmount: 49_259, excessOver: 300_001 },
  { min: 500_001, max: 1_000_000, rate: 0.20, fixedAmount: 87_250, excessOver: 500_001 },
  { min: 1_000_001, max: 1_500_000, rate: 0.21, fixedAmount: 187_249, excessOver: 1_000_001 },
  { min: 1_500_001, max: 2_000_000, rate: 0.22, fixedAmount: 292_249, excessOver: 1_500_001 },
  { min: 2_000_001, max: 2_500_000, rate: 0.23, fixedAmount: 402_249, excessOver: 2_000_001 },
  { min: 2_500_001, max: 5_000_000, rate: 0.24, fixedAmount: 517_249, excessOver: 2_500_001 },
  { min: 5_000_001, max: 10_000_000, rate: 0.245, fixedAmount: 1_117_249, excessOver: 5_000_001 },
  { min: 10_000_001, max: Infinity, rate: 0.25, fixedAmount: 2_342_248, excessOver: 10_000_001 },
];

// ============================================================================
// Lei Geral de Trabalho (Lei n.º 12/23, de 27 de Dezembro)
// General Labor Law Constants
// ============================================================================

export const LABOR_LAW = {
  // Working Hours (Artigo 98)
  WEEKLY_HOURS: 44, // Maximum regular weekly hours
  DAILY_HOURS: 8, // Maximum regular daily hours
  WORKING_DAYS_PER_WEEK: 6, // 6 days work week (Monday-Saturday)
  WORKING_DAYS_PER_MONTH: 26, // Standard working days for salary calculations (6 days × 4.33 weeks)
  
  // Overtime Rates (Artigo 185 and 188 - Lei n.º 12/23)
  // Up to 30 hours/month: +50% (150% of normal rate)
  // Over 30 hours/month: +75% (175% of normal rate)
  OVERTIME: {
    NORMAL_RATE_FIRST_30: 1.5, // 50% extra for first 30 hours/month
    NORMAL_RATE_OVER_30: 1.75, // 75% extra for hours over 30/month
    NIGHT_RATE: 1.75, // 75% extra for night overtime (20:00-06:00)
    HOLIDAY_RATE: 2.0, // 100% extra for holidays/rest days
    MONTHLY_LIMIT: 40, // Maximum overtime hours per month
    ANNUAL_LIMIT: 200, // Maximum overtime hours per year
    THRESHOLD_HOURS: 30, // Threshold where rate increases from 50% to 75%
  },
  
  // Night Work (Artigo 100)
  NIGHT_WORK: {
    START_HOUR: 20, // 20:00
    END_HOUR: 6, // 06:00
    EXTRA_RATE: 0.25, // 25% extra for night shift
  },
  
  // Annual Leave (Artigo 134-146)
  ANNUAL_LEAVE: {
    MIN_DAYS: 22, // Minimum 22 working days per year
    BONUS_PER_3_YEARS: 1, // Additional day for every 3 years of service
    MAX_EXTRA_DAYS: 10, // Maximum additional days from seniority
  },
  
  // Maternity/Paternity Leave (Artigo 150-151)
  MATERNITY_LEAVE: {
    DAYS: 90, // 3 months maternity leave (paid by INSS)
  },
  PATERNITY_LEAVE: {
    DAYS: 3, // 3 days paternity leave
  },
  
  // 13th Month Salary / Christmas Bonus (Subsídio de Natal)
  THIRTEENTH_MONTH: {
    RATE: 0.5, // 50% of base salary (minimum)
    MONTH_DUE: 12, // Paid in December
  },
  
  // Holiday Subsidy (Subsídio de Férias)
  HOLIDAY_SUBSIDY: {
    RATE: 0.5, // 50% of base salary (paid when taking vacation)
  },
  
  // Probation Period (Período Experimental - Artigo 16)
  PROBATION_PERIOD: {
    STANDARD_DAYS: 60, // 2 months for regular employees
    QUALIFIED_DAYS: 90, // 3 months for qualified positions
    DIRECTOR_DAYS: 180, // 6 months for directors
  },
  
  // Notice Period (Aviso Prévio - Artigo 26)
  NOTICE_PERIOD: {
    LESS_THAN_1_YEAR: 15, // 15 days
    UP_TO_3_YEARS: 30, // 30 days (1-3 years)
    MORE_THAN_3_YEARS: 60, // 60 days (>3 years)
  },
  
  // Severance Pay (Indemnização - Artigo 28)
  SEVERANCE: {
    YEARS_MULTIPLIER: 1, // 1 month salary per year of service
    MAX_YEARS: 20, // Maximum 20 months
  },
  
  // Meal Allowance (Subsídio de Alimentação)
  // Not mandatory but common practice
  MEAL_ALLOWANCE: {
    TYPICAL_AMOUNT: 15000, // Typical daily meal allowance in AOA
  },
  
  // Transport Allowance (Subsídio de Transporte)
  // Not mandatory but common practice
  TRANSPORT_ALLOWANCE: {
    TYPICAL_AMOUNT: 25000, // Typical monthly transport allowance in AOA
  },
  
  // Family Allowance (Abono de Família)
  // Paid per dependent
  FAMILY_ALLOWANCE: {
    PER_DEPENDENT: 5000, // AOA per dependent per month
    MAX_DEPENDENTS: 6, // Maximum dependents eligible
  },
} as const;

// ============================================================================
// National Holidays in Angola
// ============================================================================

export const NATIONAL_HOLIDAYS = [
  { date: '01-01', name: 'Ano Novo', nameEn: 'New Year' },
  { date: '02-04', name: 'Dia do Início da Luta Armada', nameEn: 'Start of Armed Struggle Day' },
  { date: '02-21', name: 'Carnaval', nameEn: 'Carnival' },
  { date: '03-08', name: 'Dia Internacional da Mulher', nameEn: 'International Women\'s Day' },
  { date: '03-23', name: 'Dia da Libertação da África Austral', nameEn: 'Southern Africa Liberation Day' },
  { date: '04-04', name: 'Dia da Paz e Reconciliação Nacional', nameEn: 'Peace and National Reconciliation Day' },
  { date: '05-01', name: 'Dia do Trabalhador', nameEn: 'Workers\' Day' },
  { date: '09-17', name: 'Dia do Fundador da Nação', nameEn: 'National Founder\'s Day' },
  { date: '11-02', name: 'Dia dos Finados', nameEn: 'All Souls\' Day' },
  { date: '11-11', name: 'Dia da Independência Nacional', nameEn: 'Independence Day' },
  { date: '12-25', name: 'Natal', nameEn: 'Christmas Day' },
];

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate IRT (Income Tax) for a given taxable income
 * Based on Group A - Employment Income
 * Formula: IRT = Parcela Fixa + (Rendimento Coletável - Excesso de) × Taxa
 * 
 * IMPORTANT: The taxable income (Rendimento Coletável) should ALREADY have INSS deducted
 * 
 * IRT INCLUSIONS (Rendimento Tributável):
 * - Salário Base: Fully taxable
 * - Subsídio de Natal (13º mês): Fully taxable
 * - Subsídio de Férias: Fully taxable
 * - Subsídio de Alimentação: Only EXCESS above 30,000 Kz
 * - Subsídio de Transporte: Only EXCESS above 30,000 Kz
 * - Overtime
 * - Other allowances
 * 
 * NOT included in IRT:
 * - Abono de Família: Fully exempt
 * - First 30,000 Kz of Alimentação
 * - First 30,000 Kz of Transporte
 */
export function calculateIRT(taxableIncome: number): number {
  // Salaries up to 100,000 AOA are exempt (1º Escalão)
  if (taxableIncome <= 100_000) {
    return 0;
  }

  // Find the applicable bracket
  const bracket = IRT_BRACKETS.find(
    (b) => taxableIncome >= b.min && taxableIncome <= b.max
  );

  if (!bracket) {
    // Use highest bracket for salaries above 10,000,000
    const highestBracket = IRT_BRACKETS[IRT_BRACKETS.length - 1];
    const excess = taxableIncome - highestBracket.excessOver;
    return Math.round((highestBracket.fixedAmount + (excess * highestBracket.rate)) * 100) / 100;
  }

  // Calculate: IRT = Parcela Fixa + (Rendimento Coletável - Excesso de) × Taxa
  // Where "Excesso de" is taken directly from the IRT table (stored in excessOver)
  const excess = taxableIncome - bracket.excessOver;
  return Math.round((bracket.fixedAmount + (excess * bracket.rate)) * 100) / 100;
}

/**
 * Calculate the taxable portion of an allowance for IRT
 * Returns 0 if allowance is <= 30,000 Kz
 * Returns the excess above 30,000 Kz otherwise
 */
export function getIRTTaxableAllowance(allowanceValue: number): number {
  if (allowanceValue <= IRT_ALLOWANCE_EXEMPTION) {
    return 0;
  }
  return allowanceValue - IRT_ALLOWANCE_EXEMPTION;
}

/**
 * Calculate INSS contributions
 * INSS (3% employee, 8% employer) is calculated on Salário Bruto:
 * 
 * INCLUDED in INSS base:
 * - Salário Base
 * - Subsídio de Alimentação (full value)
 * - Subsídio de Transporte (full value)
 * - Subsídio de Natal (13º mês)
 * - Abono de Família
 * - Overtime
 * - Other allowances
 * 
 * NOT included in INSS base:
 * - Subsídio de Férias
 */
export function calculateINSS(
  inssBase: number, // base + transport + meal + natal + overtime + other (NOT férias, NOT abono)
  isRetired: boolean = false
): { employeeContribution: number; employerContribution: number } {
  const employeeRate = isRetired 
    ? INSS_RATES.RETIRED_EMPLOYEE_RATE 
    : INSS_RATES.EMPLOYEE_RATE;
  
  return {
    employeeContribution: Math.round(inssBase * employeeRate * 100) / 100,
    employerContribution: Math.round(inssBase * INSS_RATES.EMPLOYER_RATE * 100) / 100,
  };
}

/**
 * Calculate overtime pay according to Lei Geral de Trabalho (Lei n.º 12/23)
 * Artigo 185 and 188:
 * - Normal overtime up to 30h/month: +50% (1.5x)
 * - Normal overtime over 30h/month: +75% (1.75x)
 * - Night overtime: +75% (1.75x)
 * - Holiday/rest day overtime: +100% (2.0x)
 */
export function calculateOvertime(
  hourlyRate: number,
  hours: number,
  type: 'normal' | 'night' | 'holiday',
  totalNormalHoursThisMonth: number = 0 // For tracking the 30h threshold
): number {
  if (type === 'night') {
    return Math.round(hourlyRate * hours * LABOR_LAW.OVERTIME.NIGHT_RATE);
  }
  
  if (type === 'holiday') {
    return Math.round(hourlyRate * hours * LABOR_LAW.OVERTIME.HOLIDAY_RATE);
  }
  
  // Normal overtime with progressive rate
  const threshold = LABOR_LAW.OVERTIME.THRESHOLD_HOURS;
  
  // Calculate hours at each rate
  const hoursBeforeThreshold = Math.max(0, Math.min(hours, threshold - totalNormalHoursThisMonth));
  const hoursAfterThreshold = Math.max(0, hours - hoursBeforeThreshold);
  
  const amountFirstRate = hourlyRate * hoursBeforeThreshold * LABOR_LAW.OVERTIME.NORMAL_RATE_FIRST_30;
  const amountSecondRate = hourlyRate * hoursAfterThreshold * LABOR_LAW.OVERTIME.NORMAL_RATE_OVER_30;
  
  return Math.round(amountFirstRate + amountSecondRate);
}

/**
 * Calculate hourly rate from monthly salary
 * Based on 44 hours/week * 4.33 weeks/month = 190.52 hours/month
 */
export function calculateHourlyRate(monthlySalary: number): number {
  const monthlyHours = (LABOR_LAW.WEEKLY_HOURS * 52) / 12;
  return monthlySalary / monthlyHours;
}

/**
 * Calculate daily rate for absence deductions
 * Based on 22 working days per month (Lei Geral de Trabalho)
 */
export function calculateDailyRate(monthlySalary: number): number {
  return monthlySalary / LABOR_LAW.WORKING_DAYS_PER_MONTH;
}

/**
 * Calculate absence deduction
 * Based on 22 working days per month
 */
export function calculateAbsenceDeduction(
  baseSalary: number,
  daysAbsent: number
): number {
  const dailyRate = calculateDailyRate(baseSalary);
  return Math.round(dailyRate * daysAbsent);
}

/**
 * Calculate annual leave days based on years of service
 */
export function calculateAnnualLeaveDays(yearsOfService: number): number {
  const baseDays = LABOR_LAW.ANNUAL_LEAVE.MIN_DAYS;
  const extraDays = Math.min(
    Math.floor(yearsOfService / 3) * LABOR_LAW.ANNUAL_LEAVE.BONUS_PER_3_YEARS,
    LABOR_LAW.ANNUAL_LEAVE.MAX_EXTRA_DAYS
  );
  return baseDays + extraDays;
}

/**
 * Calculate 13th month salary (Subsídio de Natal)
 * Proportional to months worked in the year
 */
export function calculate13thMonth(
  baseSalary: number,
  monthsWorked: number = 12
): number {
  const proportion = monthsWorked / 12;
  return Math.round(baseSalary * LABOR_LAW.THIRTEENTH_MONTH.RATE * proportion);
}

/**
 * Calculate holiday subsidy (Subsídio de Férias)
 */
export function calculateHolidaySubsidy(baseSalary: number): number {
  return Math.round(baseSalary * LABOR_LAW.HOLIDAY_SUBSIDY.RATE);
}

/**
 * Calculate severance pay (Indemnização)
 */
export function calculateSeverance(
  baseSalary: number,
  yearsOfService: number
): number {
  const years = Math.min(yearsOfService, LABOR_LAW.SEVERANCE.MAX_YEARS);
  return Math.round(baseSalary * years * LABOR_LAW.SEVERANCE.YEARS_MULTIPLIER);
}

/**
 * Calculate notice period in days based on years of service
 */
export function calculateNoticePeriod(yearsOfService: number): number {
  if (yearsOfService < 1) {
    return LABOR_LAW.NOTICE_PERIOD.LESS_THAN_1_YEAR;
  } else if (yearsOfService <= 3) {
    return LABOR_LAW.NOTICE_PERIOD.UP_TO_3_YEARS;
  }
  return LABOR_LAW.NOTICE_PERIOD.MORE_THAN_3_YEARS;
}

/**
 * Format currency in Angolan Kwanza
 */
export function formatAOA(value: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Calculate family allowance (Abono de Família)
 */
export function calculateFamilyAllowance(dependents: number): number {
  const eligibleDependents = Math.min(dependents, LABOR_LAW.FAMILY_ALLOWANCE.MAX_DEPENDENTS);
  return eligibleDependents * LABOR_LAW.FAMILY_ALLOWANCE.PER_DEPENDENT;
}

/**
 * Calculate complete payroll for an employee
 */
export interface PayrollInput {
  baseSalary: number;
  mealAllowance?: number;
  transportAllowance?: number;
  otherAllowances?: number;
  familyAllowanceValue?: number; // Fixed value for family allowance
  overtimeHoursNormal?: number;
  overtimeHoursNight?: number;
  overtimeHoursHoliday?: number;
  isRetired?: boolean;
  isColaborador?: boolean; // Colaboradores: no INSS, but IRT applies

  // Auto-calculated subsidies
  include13thMonth?: boolean;
  monthsWorkedThisYear?: number;
  includeHolidaySubsidy?: boolean;

  // Explicit overrides (when the payroll entry stores a specific value)
  thirteenthMonthValue?: number;
  holidaySubsidyValue?: number;
}

export interface PayrollResult {
  // Earnings
  baseSalary: number;
  mealAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  familyAllowance: number;
  overtimeNormal: number;
  overtimeNight: number;
  overtimeHoliday: number;
  thirteenthMonth: number;
  holidaySubsidy: number;
  grossSalary: number;
  
  // Deductions
  irt: number;
  inssEmployee: number;
  totalDeductions: number;
  
  // Employer costs
  inssEmployer: number;
  
  // Net
  netSalary: number;
  
  // Total cost to employer
  totalEmployerCost: number;
  
  // Dependents
  dependents: number;
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const {
    baseSalary,
    mealAllowance = 0,
    transportAllowance = 0,
    otherAllowances = 0,
    familyAllowanceValue = 0,
    overtimeHoursNormal = 0,
    overtimeHoursNight = 0,
    overtimeHoursHoliday = 0,
    isRetired = false,
    isColaborador = false,
    include13thMonth = false,
    monthsWorkedThisYear = 12,
    includeHolidaySubsidy = false,
  } = input;

  // Calculate hourly rate for overtime
  const hourlyRate = calculateHourlyRate(baseSalary);

  // Calculate overtime
  const overtimeNormal = calculateOvertime(hourlyRate, overtimeHoursNormal, 'normal');
  const overtimeNight = calculateOvertime(hourlyRate, overtimeHoursNight, 'night');
  const overtimeHoliday = calculateOvertime(hourlyRate, overtimeHoursHoliday, 'holiday');

  // Calculate subsidies
  const thirteenthMonth = typeof input.thirteenthMonthValue === 'number'
    ? input.thirteenthMonthValue
    : (include13thMonth ? calculate13thMonth(baseSalary, monthsWorkedThisYear) : 0);

  const holidaySubsidy = typeof input.holidaySubsidyValue === 'number'
    ? input.holidaySubsidyValue
    : (includeHolidaySubsidy ? calculateHolidaySubsidy(baseSalary) : 0);
  
  // Use the fixed family allowance value directly
  const familyAllowance = familyAllowanceValue;

  // =========================================================================
  // INSS Calculation
  // INSS base = Base + Transport + Meal + Natal (13º) + Abono + Overtime + Other
  // NOT including: Subsídio de Férias
  // Colaboradores: NO INSS at all
  // =========================================================================
  const overtimeTotal = overtimeNormal + overtimeNight + overtimeHoliday;
  let inssEmployee = 0;
  let inssEmployer = 0;
  
  if (!isColaborador) {
    const inssBase = baseSalary + transportAllowance + mealAllowance + thirteenthMonth + 
                     familyAllowance + overtimeTotal + otherAllowances;
    const inssResult = calculateINSS(inssBase, isRetired);
    inssEmployee = inssResult.employeeContribution;
    inssEmployer = inssResult.employerContribution;
  }

  // =========================================================================
  // IRT Calculation
  // Transport/Meal: Only EXCESS above 30,000 Kz is taxable
  // Férias and Natal: Fully taxable
  // NOT included: Abono de Família
  // Colaboradores: IRT APPLIES (they earn taxable income)
  // =========================================================================
  let irt = 0;
  
  const taxableTransport = getIRTTaxableAllowance(transportAllowance);
  const taxableMeal = getIRTTaxableAllowance(mealAllowance);
  
  const irtTaxableGross = baseSalary + taxableTransport + taxableMeal +
                          thirteenthMonth + holidaySubsidy + overtimeTotal + otherAllowances;
  
  // Rendimento Coletável = IRT Taxable Gross - INSS (colaboradores have 0 INSS)
  const rendimentoColetavel = irtTaxableGross - inssEmployee;
  
  // Calculate IRT on the rendimento coletável
  irt = calculateIRT(rendimentoColetavel);

  // Gross salary includes everything (for display purposes)
  const grossSalary = baseSalary + mealAllowance + transportAllowance + familyAllowance +
                      overtimeTotal + thirteenthMonth + holidaySubsidy + otherAllowances;

  const totalDeductions = irt + inssEmployee;
  const netSalary = grossSalary - totalDeductions;
  const totalEmployerCost = grossSalary + inssEmployer;

  return {
    baseSalary,
    mealAllowance,
    transportAllowance,
    otherAllowances,
    familyAllowance,
    overtimeNormal,
    overtimeNight,
    overtimeHoliday,
    thirteenthMonth,
    holidaySubsidy,
    grossSalary,
    irt,
    inssEmployee,
    totalDeductions,
    inssEmployer,
    netSalary,
    totalEmployerCost,
    dependents: 0, // No longer used but kept for compatibility
  };
}
