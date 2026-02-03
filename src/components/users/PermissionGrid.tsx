/**
 * Permission Grid Component
 * Displays checkboxes for granular permission management like the reference screenshot
 */

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Permission } from '@/stores/auth-store';
import { Check, Minus } from 'lucide-react';

// Permission categories matching the reference screenshot layout
export const PERMISSION_CATEGORIES = {
  ficheiro: {
    labelPt: 'Ficheiro',
    labelEn: 'File',
    permissions: [
      { key: 'settings.view' as Permission, labelPt: 'Ver Definições', labelEn: 'View Settings' },
      { key: 'settings.edit' as Permission, labelPt: 'Editar Definições', labelEn: 'Edit Settings' },
    ],
  },
  funcionarios: {
    labelPt: 'Funcionários',
    labelEn: 'Employees',
    permissions: [
      { key: 'employees.view' as Permission, labelPt: 'Ver', labelEn: 'View' },
      { key: 'employees.create' as Permission, labelPt: 'Criar', labelEn: 'Create' },
      { key: 'employees.edit' as Permission, labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'employees.delete' as Permission, labelPt: 'Eliminar', labelEn: 'Delete' },
    ],
  },
  folhaSalarial: {
    labelPt: 'Folha Salarial',
    labelEn: 'Payroll',
    permissions: [
      { key: 'payroll.view' as Permission, labelPt: 'Ver', labelEn: 'View' },
      { key: 'payroll.calculate' as Permission, labelPt: 'Calcular', labelEn: 'Calculate' },
      { key: 'payroll.approve' as Permission, labelPt: 'Aprovar', labelEn: 'Approve' },
      { key: 'payroll.export' as Permission, labelPt: 'Exportar', labelEn: 'Export' },
    ],
  },
  deducoes: {
    labelPt: 'Deduções',
    labelEn: 'Deductions',
    permissions: [
      { key: 'deductions.view' as Permission, labelPt: 'Ver', labelEn: 'View' },
      { key: 'deductions.create' as Permission, labelPt: 'Criar', labelEn: 'Create' },
      { key: 'deductions.edit' as Permission, labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'deductions.delete' as Permission, labelPt: 'Eliminar', labelEn: 'Delete' },
    ],
  },
  filiais: {
    labelPt: 'Filiais',
    labelEn: 'Branches',
    permissions: [
      { key: 'branches.view' as Permission, labelPt: 'Ver', labelEn: 'View' },
      { key: 'branches.create' as Permission, labelPt: 'Criar', labelEn: 'Create' },
      { key: 'branches.edit' as Permission, labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'branches.delete' as Permission, labelPt: 'Eliminar', labelEn: 'Delete' },
    ],
  },
  relatorios: {
    labelPt: 'Relatórios',
    labelEn: 'Reports',
    permissions: [
      { key: 'reports.view' as Permission, labelPt: 'Ver', labelEn: 'View' },
      { key: 'reports.export' as Permission, labelPt: 'Exportar', labelEn: 'Export' },
    ],
  },
  documentos: {
    labelPt: 'Documentos',
    labelEn: 'Documents',
    permissions: [
      { key: 'documents.view' as Permission, labelPt: 'Ver', labelEn: 'View' },
      { key: 'documents.create' as Permission, labelPt: 'Criar', labelEn: 'Create' },
    ],
  },
  utilizadores: {
    labelPt: 'Utilizadores',
    labelEn: 'Users',
    permissions: [
      { key: 'users.view' as Permission, labelPt: 'Ver', labelEn: 'View' },
      { key: 'users.create' as Permission, labelPt: 'Criar', labelEn: 'Create' },
      { key: 'users.edit' as Permission, labelPt: 'Editar', labelEn: 'Edit' },
      { key: 'users.delete' as Permission, labelPt: 'Eliminar', labelEn: 'Delete' },
    ],
  },
  leiTrabalho: {
    labelPt: 'Lei do Trabalho',
    labelEn: 'Labor Law',
    permissions: [
      { key: 'laborlaw.view' as Permission, labelPt: 'Ver', labelEn: 'View' },
    ],
  },
};

interface PermissionGridProps {
  selectedPermissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}

type PermissionCheckboxProps = {
  id?: string;
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
  onCheckedChange?: (checked: boolean) => void;
};

/**
 * NOTE: We intentionally use a native <input> here (instead of Radix Checkbox)
 * because Radix Checkbox + callback refs can trigger a nested-update loop in this modal.
 */
function PermissionCheckbox({
  id,
  checked,
  indeterminate = false,
  disabled = false,
  className,
  onCheckedChange,
}: PermissionCheckboxProps) {
  const ref = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  const state = indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked';

  return (
    <span className="relative inline-flex h-4 w-4 shrink-0">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        data-state={state}
        onChange={(e) => onCheckedChange?.(e.currentTarget.checked)}
        className={cn(
          "peer h-4 w-4 appearance-none rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
          "data-[state=indeterminate]:bg-primary/50 data-[state=indeterminate]:text-primary-foreground",
          className,
        )}
      />

      <Check className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-primary-foreground opacity-0 peer-data-[state=checked]:opacity-100" />
      <Minus className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-primary-foreground opacity-0 peer-data-[state=indeterminate]:opacity-100" />
    </span>
  );
}

export function PermissionGrid({ selectedPermissions, onChange, disabled = false }: PermissionGridProps) {
  const { language } = useLanguage();

  const handleToggle = (permission: Permission, nextChecked: boolean) => {
    if (disabled) return;

    const has = selectedPermissions.includes(permission);
    if (nextChecked && !has) onChange([...selectedPermissions, permission]);
    if (!nextChecked && has) onChange(selectedPermissions.filter((p) => p !== permission));
  };

  const handleToggleCategory = (categoryKey: string) => {
    if (disabled) return;
    
    const category = PERMISSION_CATEGORIES[categoryKey as keyof typeof PERMISSION_CATEGORIES];
    const categoryPermissions = category.permissions.map(p => p.key);
    const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p));

    if (allSelected) {
      // Remove all permissions from this category
      onChange(selectedPermissions.filter(p => !categoryPermissions.includes(p)));
    } else {
      // Add all missing permissions from this category
      const newPermissions = [...selectedPermissions];
      categoryPermissions.forEach(p => {
        if (!newPermissions.includes(p)) {
          newPermissions.push(p);
        }
      });
      onChange(newPermissions);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    const allPermissions: Permission[] = [];
    Object.values(PERMISSION_CATEGORIES).forEach(cat => {
      cat.permissions.forEach(p => allPermissions.push(p.key));
    });
    onChange(allPermissions);
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Quick actions */}
      <div className="flex gap-2 pb-2 border-b">
        <button
          type="button"
          onClick={selectAll}
          disabled={disabled}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          {language === 'pt' ? 'Selecionar Tudo' : 'Select All'}
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          onClick={clearAll}
          disabled={disabled}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          {language === 'pt' ? 'Limpar Tudo' : 'Clear All'}
        </button>
      </div>

      {/* Permission grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
        {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => {
          const categoryPermissions = category.permissions.map(p => p.key);
          const selectedCount = categoryPermissions.filter(p => selectedPermissions.includes(p)).length;
          const allSelected = selectedCount === categoryPermissions.length;
          const someSelected = selectedCount > 0 && selectedCount < categoryPermissions.length;

          return (
            <div 
              key={key} 
              className="p-3 rounded-lg border bg-card"
            >
              {/* Category header */}
              <div 
                className="flex items-center gap-2 pb-2 mb-2 border-b cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                onClick={() => handleToggleCategory(key)}
              >
                <PermissionCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  disabled={disabled}
                  className={someSelected ? 'data-[state=indeterminate]:bg-primary/50' : ''}
                />
                <Label className="font-semibold text-sm cursor-pointer">
                  {language === 'pt' ? category.labelPt : category.labelEn}
                </Label>
                <span className="text-xs text-muted-foreground ml-auto">
                  {selectedCount}/{categoryPermissions.length}
                </span>
              </div>

              {/* Individual permissions */}
              <div className="space-y-2">
                {category.permissions.map(perm => (
                  <div key={perm.key} className="flex items-center gap-2">
                    <PermissionCheckbox
                      id={perm.key}
                      checked={selectedPermissions.includes(perm.key)}
                      onCheckedChange={(v) => handleToggle(perm.key, Boolean(v))}
                      disabled={disabled}
                    />
                    <Label 
                      htmlFor={perm.key} 
                      className="text-sm cursor-pointer"
                    >
                      {language === 'pt' ? perm.labelPt : perm.labelEn}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected count */}
      <div className="pt-2 border-t text-sm text-muted-foreground">
        {selectedPermissions.length} {language === 'pt' ? 'permissões selecionadas' : 'permissions selected'}
      </div>
    </div>
  );
}
