import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  salary: number;
  status: "paid" | "pending" | "overdue";
}

const employees: Employee[] = [
  {
    id: "1",
    name: "Maria Santos",
    position: "Gerente de RH",
    department: "Recursos Humanos",
    salary: 450000,
    status: "paid"
  },
  {
    id: "2",
    name: "João Fernandes",
    position: "Desenvolvedor Sénior",
    department: "Tecnologia",
    salary: 380000,
    status: "paid"
  },
  {
    id: "3",
    name: "Ana Luísa Costa",
    position: "Contabilista",
    department: "Finanças",
    salary: 320000,
    status: "pending"
  },
  {
    id: "4",
    name: "Pedro Miguel",
    position: "Vendedor",
    department: "Comercial",
    salary: 250000,
    status: "paid"
  },
  {
    id: "5",
    name: "Catarina Sousa",
    position: "Designer",
    department: "Marketing",
    salary: 280000,
    status: "pending"
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusLabel(status: Employee["status"]): string {
  const labels = {
    paid: "Pago",
    pending: "Pendente",
    overdue: "Em atraso"
  };
  return labels[status];
}

export function EmployeeTable() {
  return (
    <div className="stat-card animate-slide-up p-0 overflow-hidden" style={{ animationDelay: "300ms" }}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Funcionários Recentes
            </h2>
            <p className="text-sm text-muted-foreground">
              Últimos pagamentos e status
            </p>
          </div>
          <Button variant="outline" size="sm">
            Ver todos
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Departamento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Salário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {employees.map((employee) => (
              <tr key={employee.id} className="table-row-hover">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-foreground">{employee.name}</p>
                    <p className="text-sm text-muted-foreground">{employee.position}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-foreground">{employee.department}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-foreground">
                    {formatCurrency(employee.salary)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "badge-status",
                    employee.status === "paid" && "badge-paid",
                    employee.status === "pending" && "badge-pending",
                    employee.status === "overdue" && "badge-overdue"
                  )}>
                    {getStatusLabel(employee.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
