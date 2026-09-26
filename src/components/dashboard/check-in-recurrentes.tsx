"use client";

import { useEffect, useState } from "react";
import { useDataProvider } from "@/hooks/use-data-provider";
import { TransaccionRecurrente } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarClock, CheckCircle2 } from "lucide-react";

export function CheckInRecurrentes() {
  const provider = useDataProvider();
  const [pendientes, setPendientes] = useState<TransaccionRecurrente[]>([]);
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    async function checkRecurrentes() {
      try {
        const recurrentes = await provider.getTransaccionesRecurrentes();
        const activas = recurrentes.filter(r => r.activa);
        
        const hoy = new Date();
        const diaActual = hoy.getDate();
        const mesActual = hoy.getMonth();
        const añoActual = hoy.getFullYear();

        const aEjecutar = activas.filter(r => {
          // Si el dia del mes ya pasó o es hoy
          if (r.dia_del_mes <= diaActual) {
            if (!r.ultima_ejecucion) return true; // Nunca ejecutada
            
            const ultima = new Date(r.ultima_ejecucion);
            // Si la última ejecución fue en un mes anterior al actual (del mismo año) o año anterior
            if (ultima.getFullYear() < añoActual || (ultima.getFullYear() === añoActual && ultima.getMonth() < mesActual)) {
              return true;
            }
          }
          return false;
        });

        if (aEjecutar.length > 0) {
          setPendientes(aEjecutar);
          setOpen(true);
        }
      } catch (error) {
        console.error("Error comprobando recurrentes:", error);
      }
    }
    checkRecurrentes();
  }, [provider]);

  const handleProcesarTodo = async () => {
    setIsProcessing(true);
    const hoyStr = new Date().toISOString().split('T')[0];
    
    try {
      const planActivo = await provider.getPlanActivo();
      
      for (const r of pendientes) {
        // Buscar si tiene plan activo o asignación en el plan
        let asignacionId = undefined;
        if (planActivo) {
          const { data: asignaciones } = await provider['supabase'].from('asignaciones').select('id').eq('plan_id', planActivo.id).eq('proposito_id', r.proposito_id).single();
          if (asignaciones) {
            asignacionId = asignaciones.id;
          }
        }

        // Registrar el gasto
        await provider.registrarGasto({
          cuenta_id: r.cuenta_id,
          proposito_id: r.proposito_id,
          monto: r.monto,
          fecha: hoyStr,
          descripcion: r.descripcion || 'Pago recurrente',
          plan_id: planActivo?.id,
          asignacion_id: asignacionId
        });
        
        // Actualizar última ejecución
        await provider.registrarEjecucionRecurrente(r.id, hoyStr);
      }
      
      setOpen(false);
      // Opcionalmente forzar un refresco recargando la pág
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("Hubo un error procesando algunos pagos.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600">
              <CalendarClock className="h-6 w-6" />
            </div>
            <DialogTitle>Pagos Recurrentes Pendientes</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Tienes {pendientes.length} transacción(es) recurrente(s) configurada(s) para este periodo que aún no se han registrado en tu saldo real. ¿Deseas procesarlas ahora?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4 max-h-[300px] overflow-y-auto">
          {pendientes.map(p => (
            <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3 rounded-md border border-slate-100 dark:border-slate-800">
              <div>
                <p className="font-medium text-sm">{p.descripcion || 'Pago fijo'}</p>
                <p className="text-xs text-slate-500">Día {p.dia_del_mes}</p>
              </div>
              <p className="font-bold text-sm">C$ {p.monto.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>
            Ignorar por ahora
          </Button>
          <Button onClick={handleProcesarTodo} disabled={isProcessing} className="bg-blue-600">
            {isProcessing ? 'Procesando...' : 'Registrar Todo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
