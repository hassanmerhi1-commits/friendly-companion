/**
 * Company branch types for PayrollAO
 * Supports multiple branches in same city/province
 */

export interface Branch {
  id: string;
  name: string;
  code: string; // Short code like "LDA-01", "LDA-02"
  province: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  managerId?: string; // Employee ID of branch manager
  pin?: string; // 4-6 digit PIN for branch attendance access
  isHeadquarters: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BranchFormData {
  name: string;
  code: string;
  province: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  managerId?: string;
  pin?: string;
  isHeadquarters: boolean;
}

// Angolan Provinces
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
  'Zaire',
] as const;

// Major cities by province
export const ANGOLA_CITIES: Record<string, string[]> = {
  'Bengo': ['Caxito', 'Ambriz', 'Dande', 'Bula Atumba'],
  'Benguela': ['Benguela', 'Lobito', 'Catumbela', 'Cubal', 'Ganda'],
  'Bié': ['Kuito', 'Camacupa', 'Andulo', 'Chinguar'],
  'Cabinda': ['Cabinda', 'Cacongo', 'Belize', 'Buco-Zau'],
  'Cuando Cubango': ['Menongue', 'Cuangar', 'Cuchi', 'Mavinga'],
  'Cuanza Norte': ['N\'dalatando', 'Cambambe', 'Lucala', 'Cazengo'],
  'Cuanza Sul': ['Sumbe', 'Porto Amboim', 'Gabela', 'Waku Kungo'],
  'Cunene': ['Ondjiva', 'Xangongo', 'Cahama', 'Cuvelai'],
  'Huambo': ['Huambo', 'Caála', 'Longonjo', 'Bailundo'],
  'Huíla': ['Lubango', 'Matala', 'Chibia', 'Humpata'],
  'Luanda': ['Luanda', 'Viana', 'Cacuaco', 'Cazenga', 'Talatona', 'Belas'],
  'Lunda Norte': ['Lucapa', 'Dundo', 'Chitato', 'Cambulo'],
  'Lunda Sul': ['Saurimo', 'Muconda', 'Cacolo', 'Dala'],
  'Malanje': ['Malanje', 'Cacuso', 'Calandula', 'Cangandala'],
  'Moxico': ['Luena', 'Luau', 'Cazombo', 'Bundas'],
  'Namibe': ['Namibe', 'Tômbwa', 'Virei', 'Bibala'],
  'Uíge': ['Uíge', 'Negage', 'Maquela do Zombo', 'Songo'],
  'Zaire': ['M\'banza Kongo', 'Soyo', 'N\'zeto', 'Cuimba'],
};
