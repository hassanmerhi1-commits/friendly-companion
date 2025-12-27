import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Building2 } from 'lucide-react';
import { ANGOLA_PROVINCES, Province, setSelectedProvince } from '@/lib/province-storage';

interface ProvinceSelectorProps {
  onProvinceSelected: () => void;
}

export function ProvinceSelector({ onProvinceSelected }: ProvinceSelectorProps) {
  const [selectedProvince, setSelected] = useState<Province | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = () => {
    if (!selectedProvince) return;
    
    setIsLoading(true);
    
    // Set the province
    setSelectedProvince(selectedProvince);
    
    // Small delay for UX
    setTimeout(() => {
      onProvinceSelected();
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Selecionar Província</CardTitle>
          <CardDescription className="text-base">
            Escolha a província para esta instalação. Cada província terá sua própria base de dados independente.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Província</label>
            <Select 
              value={selectedProvince} 
              onValueChange={(value) => setSelected(value as Province)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma província..." />
              </SelectTrigger>
              <SelectContent>
                {ANGOLA_PROVINCES.map((province) => (
                  <SelectItem key={province} value={province}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {province}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">⚠️ Importante:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Cada província tem uma base de dados separada</li>
              <li>Os dados não são partilhados entre províncias</li>
              <li>Esta escolha pode ser alterada nas Configurações</li>
            </ul>
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleConfirm}
            disabled={!selectedProvince || isLoading}
          >
            {isLoading ? 'A inicializar...' : 'Confirmar e Continuar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
