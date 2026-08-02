"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/shared/main-layout";
import { useDataProvider } from "@/hooks/use-data-provider";
import { Movimiento, Proposito, Cuenta } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowDownCircle, ArrowUpCircle, Filter, CalendarDays, Search } from "lucide-react";

export function TrackerTransacciones() {
  const provider = useDataProvider();
  
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [propositos, setPropositos] = useState<Proposito[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  
  // Filtros
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anoActual, setAnoActual] = useState(new Date().getFullYear());
  const [filtroTexto, setFiltroTexto] = useState("");

  useEffect(() => {
    async function load() {
      const allMovs = await provider.getMovimientos();
      setMovimientos(allMovs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()));
      
      const props = await provider.getPropositos();
      setPropositos(props);

      const accs = await provider.getCuentas();
      setCuentas(accs);
    }
    load();
  }, [provider]);

  // Filtrar por Mes, Año y Texto
  const movimientosFiltrados = movimientos.filter(m => {
    const d = new Date(m.fecha);
    const coincidenciaFecha = d.getMonth() === mesActual && d.getFullYear() === anoActual;
    const coincidenciaTexto = filtroTexto === "" || 
      (m.descripcion?.toLowerCase().includes(filtroTexto.toLowerCase()) || m.fuente?.toLowerCase().includes(filtroTexto.toLowerCase()));
    
    return coincidenciaFecha && coincidenciaTexto;
  });

  const totalIngresos = movimientosFiltrados.filter(m => m.tipo === "INGRESO").reduce((sum, m) => sum + m.monto, 0);
  const totalGastos = movimientosFiltrados.filter(m => m.tipo === "GASTO").reduce((sum, m) => sum + m.monto, 0);

  const mesesStr = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const anosDisponibles = Array.from(new Set(movimientos.map(m => new Date(m.fecha).getFullYear()))).sort((a, b) => b - a);
  if (anosDisponibles.length === 0) anosDisponibles.push(new Date().getFullYear());

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Historial de Transacciones
            </h1>
            <p className="text-muted-foreground mt-1">
              Registro completo de tus ingresos y gastos
            </p>
          </div>
        </div>

        {/* Barra de Filtros */}
        <Card className="glass-panel border-border/40">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
              
              <div className="space-y-1.5 w-full md:w-auto">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Período
                </label>
                <div className="flex gap-2">
                  <select 
                    value={mesActual} 
                    onChange={(e) => setMesActual(parseInt(e.target.value))}
                    className="h-10 px-3 rounded-lg border border-border/60 bg-background text-sm flex-1 md:w-32"
                  >
                    {mesesStr.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  
                  <select 
                    value={anoActual} 
                    onChange={(e) => setAnoActual(parseInt(e.target.value))}
                    className="h-10 px-3 rounded-lg border border-border/60 bg-background text-sm w-24"
                  >
                    {anosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 w-full flex-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5" /> Buscar
                </label>
                <input 
                  type="text" 
                  placeholder="Buscar por descripción..." 
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="h-10 px-3 w-full rounded-lg border border-border/60 bg-background text-sm"
                />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Resumen del Período */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="glass-panel border-border/40 border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground font-medium">Ingresos del período</p>
              <p className="text-2xl font-bold text-emerald-400">C$ {totalIngresos.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel border-border/40 border-l-4 border-l-rose-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground font-medium">Gastos del período</p>
              <p className="text-2xl font-bold text-rose-400">C$ {totalGastos.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla */}
        <Card className="glass-panel border-border/40">
          <CardContent className="p-0">
            {movimientosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Filter className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No se encontraron movimientos en este período.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/40">
                    <tr>
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Descripción</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Cuenta</th>
                      <th className="px-6 py-4 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosFiltrados.map((mov) => {
                      const cuenta = cuentas.find(c => c.id === mov.cuenta_id)?.nombre || "-";
                      let tipoLabel = mov.tipo === "INGRESO" ? "Ingreso" : "Gasto";
                      if (mov.tipo === "GASTO" && mov.proposito_id === "AHORRO_TRACKER") {
                        tipoLabel = "Ahorro";
                      }
                      
                      return (
                        <tr key={mov.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-medium">{mov.fecha}</td>
                          <td className="px-6 py-4">{mov.descripcion || mov.fuente}</td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "inline-flex items-center font-bold px-2.5 py-1 rounded-full text-xs",
                              tipoLabel === 'Ingreso' && "bg-emerald-500/10 text-emerald-400",
                              tipoLabel === 'Gasto' && "bg-rose-500/10 text-rose-400",
                              tipoLabel === 'Ahorro' && "bg-yellow-500/10 text-yellow-500"
                            )}>
                              {tipoLabel === 'Ingreso' && <ArrowUpCircle className="mr-1 h-3 w-3" />}
                              {tipoLabel === 'Gasto' && <ArrowDownCircle className="mr-1 h-3 w-3" />}
                              {tipoLabel === 'Ahorro' && <ArrowDownCircle className="mr-1 h-3 w-3" />}
                              {tipoLabel}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{cuenta}</td>
                          <td className="px-6 py-4 text-right font-bold">
                            C$ {mov.monto.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}

// Utility for classes
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
