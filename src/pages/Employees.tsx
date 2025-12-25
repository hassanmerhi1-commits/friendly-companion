import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Filter, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  salary: number;
  startDate: string;
  status: "active" | "inactive" | "on-leave";
}

const employees: Employee[] = [
  {
    id: "1",
    name: "Maria Santos",
    email: "maria.santos@empresa.co.ao",
    position: "Gerente de RH",
    department: "Recursos Humanos",
    salary: 450000,
    startDate: "2021-03-15",
    status: "active"
  },
  {
    id: "2",
    name: "João Fernandes",
    email: "joao.fernandes@empresa.co.ao",
    position: "Desenvolvedor Sénior",
    department: "Tecnologia",
    salary: 380000,
    startDate: "2020-08-01",
    status: "active"
  },
  {
    id: "3",
    name: "Ana Luísa Costa",
    email: "ana.costa@empresa.co.ao",
    position: "Contabilista",
    department: "Finanças",
    salary: 320000,
    startDate: "2022-01-10",
    status: "active"
  },
  {
    id: "4",
    name: "Pedro Miguel",
    email: "pedro.miguel@empresa.co.ao",
    position: "Vendedor",
    department: "Comercial",
    salary: 250000,
    startDate: "2023-06-20",
    status: "on-leave"
  },
  {
    id: "5",
    name: "Catarina Sousa",
    email: "catarina.sousa@empresa.co.ao",
    position: "Designer",
    department: "Marketing",
    salary: 280000,
    startDate: "2022-09-05",
    status: "active"
  },
  {
    id: "6",
    name: "Ricardo Almeida",
    email: "ricardo.almeida@empresa.co.ao",
    position: "Analista Financeiro",
    department: "Finanças",
    salary: 340000,
    startDate: "2021-11-20",
    status: "active"
  },
  {
    id: "7",
    name: "Beatriz Ferreira",
    email: "beatriz.ferreira@empresa.co.ao",
    position: "Assistente Administrativo",
    department: "Administração",
    salary: 180000,
    startDate: "2023-02-14",
    status: "inactive"
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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getStatusLabel(status: Employee["status"]): string {
  const labels = {
    active: "Ativo",
    inactive: "Inativo",
    "on-leave": "De Licença"
  };
  return labels[status];
}

const Employees = () => {
  return (
    <MainLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Funcionários
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerir todos os funcionários da empresa
          </p>
        </div>
        <Button variant="accent" size="lg">
          <UserPlus className="h-5 w-5 mr-2" />
          Adicionar Funcionário
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6 animate-slide-up">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar funcionários..." 
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Employee Table */}
      <div className="stat-card p-0 overflow-hidden animate-slide-up" style={{ animationDelay: "100ms" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Funcionário
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Departamento
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Salário
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Data de Início
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {employees.map((employee) => (
                <tr key={employee.id} className="table-row-hover">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-accent">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-foreground">{employee.department}</p>
                      <p className="text-sm text-muted-foreground">{employee.position}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-foreground">
                      {formatCurrency(employee.salary)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground">
                      {formatDate(employee.startDate)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "badge-status",
                      employee.status === "active" && "badge-paid",
                      employee.status === "inactive" && "badge-overdue",
                      employee.status === "on-leave" && "badge-pending"
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium">1-7</span> de <span className="font-medium">48</span> funcionários
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm">
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Employees;
