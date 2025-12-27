import { forwardRef } from 'react';
import type { Employee } from '@/types/employee';
import { useSettingsStore } from '@/stores/settings-store';
import { useBranchStore } from '@/stores/branch-store';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import companyLogo from '@/assets/distri-good-logo.jpeg';

interface PrintableEmployeeCardProps {
  employee: Employee;
}

export const PrintableEmployeeCard = forwardRef<HTMLDivElement, PrintableEmployeeCardProps>(
  ({ employee }, ref) => {
    const { settings } = useSettingsStore();
    const { getBranch } = useBranchStore();
    const branch = employee.branchId ? getBranch(employee.branchId) : null;

    const contractTypeLabels: Record<string, string> = {
      permanent: 'Efectivo',
      fixed_term: 'Prazo Determinado',
      part_time: 'Tempo Parcial',
      probation: 'Período de Experiência',
    };

    return (
      <div ref={ref} className="print-container p-4 bg-white">
        <style>
          {`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-container {
                width: 100%;
              }
              .card-container {
                page-break-inside: avoid;
              }
            }
          `}
        </style>

        <div className="flex flex-col items-center gap-8">
          {/* FRONT SIDE */}
          <div className="card-container">
            <p className="text-xs text-gray-500 mb-2 text-center font-medium">FRENTE</p>
            <div 
              className="relative overflow-hidden"
              style={{
                width: '340px',
                height: '214px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1e3a5f 0%, #0d1f33 50%, #1a2f4a 100%)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              }}
            >
              {/* Decorative elements */}
              <div 
                className="absolute"
                style={{
                  top: '-50px',
                  right: '-50px',
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                }}
              />
              <div 
                className="absolute"
                style={{
                  bottom: '-30px',
                  left: '-30px',
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.03)',
                }}
              />

              {/* Header with company logo and name */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="flex-shrink-0 bg-white rounded overflow-hidden"
                    style={{ 
                      width: '36px',
                      height: '36px',
                      padding: '2px',
                    }}
                  >
                    <img 
                      src={companyLogo} 
                      alt="Logo" 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                  <div>
                    <h1 className="text-white font-bold text-sm tracking-wide">
                      {settings.companyName || 'EMPRESA'}
                    </h1>
                    <p className="text-blue-300 text-[10px] tracking-wider">
                      CARTÃO DE IDENTIFICAÇÃO
                    </p>
                  </div>
                </div>
                <div 
                  className="px-2 py-1 rounded text-[9px] font-bold tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                    color: '#1e3a5f',
                  }}
                >
                  {employee.status === 'active' ? 'ACTIVO' : employee.status.toUpperCase()}
                </div>
              </div>

              {/* Main content */}
              <div className="px-4 flex gap-4">
                {/* Photo */}
                <div 
                  className="flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{
                    width: '90px',
                    height: '110px',
                    borderRadius: '8px',
                    border: '3px solid rgba(255,255,255,0.2)',
                    background: employee.photoUrl ? 'transparent' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  }}
                >
                  {employee.photoUrl ? (
                    <img 
                      src={employee.photoUrl} 
                      alt={`${employee.firstName} ${employee.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-white text-2xl font-bold">
                      {employee.firstName[0]}{employee.lastName[0]}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 py-1">
                  <h2 className="text-white font-bold text-lg leading-tight">
                    {employee.firstName}
                  </h2>
                  <h2 className="text-white font-bold text-lg leading-tight mb-2">
                    {employee.lastName}
                  </h2>
                  
                  <div className="space-y-1">
                    <div>
                      <p className="text-blue-300 text-[9px] uppercase tracking-wider">Cargo</p>
                      <p className="text-white text-xs font-medium">{employee.position}</p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-blue-300 text-[9px] uppercase tracking-wider">Depto</p>
                        <p className="text-white text-xs font-medium">{employee.department}</p>
                      </div>
                      <div>
                        <p className="text-blue-300 text-[9px] uppercase tracking-wider">Nº</p>
                        <p className="text-white text-xs font-bold">{employee.employeeNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div 
                className="absolute bottom-0 left-0 right-0 px-4 py-2 flex justify-between items-center"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                }}
              >
                <p className="text-blue-200 text-[10px]">
                  {branch?.name || 'Sede Principal'}
                </p>
                <p className="text-blue-200 text-[10px]">
                  {contractTypeLabels[employee.contractType]}
                </p>
              </div>
            </div>
          </div>

          {/* BACK SIDE */}
          <div className="card-container">
            <p className="text-xs text-gray-500 mb-2 text-center font-medium">VERSO</p>
            <div 
              className="relative overflow-hidden"
              style={{
                width: '340px',
                height: '214px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
              }}
            >
              {/* Magnetic stripe simulation */}
              <div 
                className="w-full"
                style={{
                  height: '35px',
                  marginTop: '15px',
                  background: 'linear-gradient(180deg, #1e293b 0%, #334155 100%)',
                }}
              />

              {/* Info section */}
              <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <p className="text-gray-500 text-[9px] uppercase tracking-wider font-medium">
                    Bilhete de Identidade
                  </p>
                  <p className="text-gray-800 text-xs font-semibold">
                    {employee.bilheteIdentidade || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-[9px] uppercase tracking-wider font-medium">NIF</p>
                  <p className="text-gray-800 text-xs font-semibold">
                    {employee.nif || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-[9px] uppercase tracking-wider font-medium">
                    INSS
                  </p>
                  <p className="text-gray-800 text-xs font-semibold">
                    {employee.inssNumber || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-[9px] uppercase tracking-wider font-medium">
                    Data de Admissão
                  </p>
                  <p className="text-gray-800 text-xs font-semibold">
                    {format(new Date(employee.hireDate), 'dd/MM/yyyy', { locale: pt })}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-500 text-[9px] uppercase tracking-wider font-medium">
                    Contacto de Emergência
                  </p>
                  <p className="text-gray-800 text-xs font-semibold">
                    {employee.emergencyContactName || 'Não definido'} 
                    {employee.emergencyContactPhone && ` • ${employee.emergencyContactPhone}`}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div 
                className="absolute bottom-0 left-0 right-0 px-4 py-2 flex justify-between items-center"
                style={{
                  borderTop: '1px solid #cbd5e1',
                }}
              >
                <div>
                  <p className="text-gray-400 text-[8px]">
                    Este cartão é intransferível e de uso exclusivo do portador.
                  </p>
                  <p className="text-gray-400 text-[8px]">
                    Em caso de perda, comunique imediatamente ao RH.
                  </p>
                </div>
                <div 
                  className="flex items-center justify-center"
                  style={{
                    width: '50px',
                    height: '50px',
                    background: '#1e3a5f',
                    borderRadius: '6px',
                  }}
                >
                  <div className="grid grid-cols-5 gap-[2px]">
                    {/* Simple QR-like pattern */}
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="w-[6px] h-[6px]"
                        style={{
                          background: Math.random() > 0.4 ? '#fff' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Print instructions */}
          <p className="text-xs text-gray-400 text-center mt-4 print:hidden">
            Recorte pelas linhas externas do cartão após impressão
          </p>
        </div>
      </div>
    );
  }
);

PrintableEmployeeCard.displayName = 'PrintableEmployeeCard';
