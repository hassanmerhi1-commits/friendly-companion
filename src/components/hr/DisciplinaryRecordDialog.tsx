import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar as CalendarIcon, FileWarning } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDisciplinaryStore } from '@/stores/disciplinary-store';
import { useEmployeeStore } from '@/stores/employee-store';
import { DisciplinaryType, DISCIPLINARY_TYPE_LABELS } from '@/types/disciplinary';

const formSchema = z.object({
  employeeId: z.string().min(1, 'Seleccione um funcionário'),
  type: z.enum(['advertencia_escrita', 'suspensao', 'processo_disciplinar']),
  date: z.date({ required_error: 'Data é obrigatória' }),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres').max(1000),
  duration: z.number().min(1).max(90).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DisciplinaryRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEmployeeId?: string;
}

export function DisciplinaryRecordDialog({
  open,
  onOpenChange,
  preselectedEmployeeId,
}: DisciplinaryRecordDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addRecord, hasActiveProcess } = useDisciplinaryStore();
  const { employees } = useEmployeeStore();
  const activeEmployees = employees.filter((e) => e.status === 'active');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employeeId: preselectedEmployeeId || '',
      type: 'advertencia_escrita',
      date: new Date(),
      description: '',
    },
  });

  const selectedType = form.watch('type');
  const selectedEmployeeId = form.watch('employeeId');

  const hasExistingProcess = selectedEmployeeId ? hasActiveProcess(selectedEmployeeId) : false;

  const onSubmit = async (data: FormData) => {
    if (data.type === 'processo_disciplinar' && hasExistingProcess) {
      toast.error('Este funcionário já tem um processo disciplinar activo');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addRecord({
        employeeId: data.employeeId,
        type: data.type,
        status: 'pendente',
        date: format(data.date, 'yyyy-MM-dd'),
        description: data.description,
        duration: data.type === 'suspensao' ? data.duration : undefined,
      });

      if (result) {
        toast.success('Registo disciplinar criado com sucesso');
        form.reset();
        onOpenChange(false);
      } else {
        toast.error('Erro ao criar registo');
      }
    } catch (error) {
      toast.error('Erro ao criar registo disciplinar');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-destructive" />
            Novo Registo Disciplinar
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funcionário</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione o funcionário" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} - {emp.position}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {hasExistingProcess && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                ⚠️ Este funcionário já tem um processo disciplinar activo
              </div>
            )}

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Acção</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DISCIPLINARY_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: pt })
                          ) : (
                            <span>Seleccione a data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType === 'suspensao' && (
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (dias)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={90}
                        placeholder="Ex: 3"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição / Motivo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da acção disciplinar..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'A guardar...' : 'Registar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
