import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import type { Employee } from "@/types/employee";

interface EmployeeSearchSelectProps {
  employees: Employee[];
  value: string;
  onSelect: (employeeId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function EmployeeSearchSelect({
  employees,
  value,
  onSelect,
  disabled = false,
  placeholder,
  className,
}: EmployeeSearchSelectProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const selectedEmployee = employees.find(e => e.id === value);
  const defaultPlaceholder = language === 'pt' ? 'Pesquisar funcionário...' : 'Search employee...';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          {selectedEmployee
            ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
            : (placeholder || defaultPlaceholder)}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[300px] p-0" align="start">
        <Command filter={(value, search) => {
          // Custom filter: match against full name, position, department, employee number
          const normalizedSearch = search.toLowerCase().trim();
          const normalizedValue = value.toLowerCase();
          // Split search into words and check all words match
          const searchWords = normalizedSearch.split(/\s+/);
          return searchWords.every(word => normalizedValue.includes(word)) ? 1 : 0;
        }}>
          <CommandInput placeholder={language === 'pt' ? 'Pesquisar por nome...' : 'Search by name...'} />
          <CommandList>
            <CommandEmpty>{language === 'pt' ? 'Nenhum funcionário encontrado.' : 'No employee found.'}</CommandEmpty>
            <CommandGroup>
              {employees.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={`${emp.firstName} ${emp.lastName} ${emp.position || ''} ${emp.department || ''} ${emp.employeeNumber || ''}`}
                  onSelect={() => {
                    onSelect(emp.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === emp.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span>{emp.firstName} {emp.lastName}</span>
                    {emp.position && (
                      <span className="text-xs text-muted-foreground">{emp.position}{emp.department ? ` · ${emp.department}` : ''}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
