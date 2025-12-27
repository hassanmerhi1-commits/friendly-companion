// Province-based Storage System
// Each province gets its own separate database file

export const ANGOLA_PROVINCES = [
  'Bengo',
  'Benguela', 
  'Bié',
  'Cabinda',
  'Cuando Cubango',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cunene',
  'Huambo',
  'Huíla',
  'Luanda',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Moxico',
  'Namibe',
  'Uíge',
  'Zaire'
] as const;

export type Province = typeof ANGOLA_PROVINCES[number];

const PROVINCE_KEY = 'payroll_selected_province';

// Get the currently selected province
export function getSelectedProvince(): Province | null {
  try {
    const province = localStorage.getItem(PROVINCE_KEY);
    if (province && ANGOLA_PROVINCES.includes(province as Province)) {
      return province as Province;
    }
    return null;
  } catch {
    return null;
  }
}

// Set the selected province
export function setSelectedProvince(province: Province): void {
  try {
    localStorage.setItem(PROVINCE_KEY, province);
    // Clear all existing data when switching provinces
    // The new province will start with empty data
  } catch {
    console.error('Failed to set province');
  }
}

// Get the storage key prefix for the current province
export function getProvinceStoragePrefix(): string {
  const province = getSelectedProvince();
  if (!province) return 'default';
  // Convert province name to a safe key (lowercase, no spaces/accents)
  return province
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

// Check if a province is selected
export function isProvinceSelected(): boolean {
  return getSelectedProvince() !== null;
}

// Clear province selection (for switching)
export function clearProvinceSelection(): void {
  try {
    localStorage.removeItem(PROVINCE_KEY);
  } catch {
    console.error('Failed to clear province');
  }
}

// Get data file name for Electron storage
export function getProvinceDataFileName(): string {
  const prefix = getProvinceStoragePrefix();
  return `payroll-data-${prefix}.json`;
}
