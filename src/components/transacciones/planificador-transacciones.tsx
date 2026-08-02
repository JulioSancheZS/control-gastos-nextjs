"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Trash2,
  Calendar,
  ChevronRight
} from "lucide-react";
import { useDataProvider } from "@/hooks/use-data-provider";
import { MainLayout } from "@/components/shared/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlanFinanciero,
  Proposito,
  Movimiento,
  Cuenta
} from "@/types";

export function PlanificadorTransacciones() {
  const provider = useDataProvider();

  const [planes, setPlanes] = useState<PlanFinanciero[]>([]);
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState<string>("");
  const [propositos, setPropositos] = useState<Proposito[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [ingresosMap, setIngresosMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const propositosData = await provider.getPropositos();
        setPropositos(propositosData);

        const ctas = await provider.getCuentas();
        setCuentas(ctas);

        const planesData = await provider.getHistoricoPlanes();
        const sorted = planesData.sort((a, b) => new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime());
        setPlanes(sorted);

        const incomeMap: Record<string, number> = {};
        for (const p of sorted) {
          const kpis = await provider.getResumenKPIs(p.id);
          incomeMap[p.id] = kpis.ingreso_total;
        }
        setIngresosMap(incomeMap);

        const activo = sorted.find(p => p.estado === "ACTIVO") || sorted[0];
        if (activo) {
          setPlanSeleccionadoId(activo.id);
          const movs = await provider.getMovimientos(activo.id);
          setMovimientos(movs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        }

      } catch (e) {
        console.error("Error cargando transacciones", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [provider]);

  const handlePlanSelect = async (id: string) => {
    setPlanSeleccionadoId(id);
    setLoading(true);
    try {
      const movs = await provider.getMovimientos(id);
      setMovimientos(movs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarMovimiento = async (id: string) => {
    if (!confirm("¿Eliminar este movimiento?")) return;
    try {
      await provider.eliminarMovimiento(id);
      const actualizados = await provider.getMovimientos(planSeleccionadoId);
      setMovimientos(actualizados.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e) {
      console.error(e);
    }
  };

  const planSeleccionado = planes.find(p => p.id === planSeleccionadoId);

  const formatFechaListado = (str?: string) => {
    if (!str) return "";
    const date = new Date(str + "T00:00:00");
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
  };

  if (loading && planes.length === 0) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Cargando transacciones...</p>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar de períodos */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="glass-panel border-border/40 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-foreground">Historial de Planes</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Seleccioná un plan para revisar sus movimientos.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 space-y-1">
              {planes.map((p) => {
                const isSelected = p.id === planSeleccionadoId;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePlanSelect(p.id)}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between border transition-all duration-200 ${
                      isSelected
                        ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                        : "bg-transparent border-transparent hover:bg-muted/40 hover:border-border/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold truncate max-w-[150px]">
                        {p.nombre}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatFechaListado(p.fecha_inicio)} - {formatFechaListado(p.fecha_fin)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-right">
                        C$ {(ingresosMap[p.id] ?? 0).toLocaleString()}
                      </span>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Tabla de transacciones */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="glass-panel border-border/40 rounded-2xl">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-primary">
                    Transacciones del Plan
                  </CardTitle>
                  {planSeleccionado && (
                    <CardDescription className="text-xs text-muted-foreground">
                      {formatFechaListado(planSeleccionado.fecha_inicio)} al {formatFechaListado(planSeleccionado.fecha_fin)}
                    </CardDescription>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                  planSeleccionado?.estado === "ACTIVO"
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border/60"
                }`}>
                  {planSeleccionado?.estado === "ACTIVO" ? "Activo" : "Cerrado"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2">Cargando...</p>
                </div>
              ) : movimientos.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground text-xs space-y-2">
                  <ArrowLeftRight className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                  <p>No hay transacciones en este plan.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase font-semibold">
                        <th className="py-2.5 px-2">Fecha</th>
                        <th className="py-2.5 px-2">Movimiento</th>
                        <th className="py-2.5 px-2">Cuenta</th>
                        <th className="py-2.5 px-2 text-right">Monto</th>
                        <th className="py-2.5 px-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {movimientos.map((mov) => {
                        const esIngreso = mov.tipo === "INGRESO";
                        const cta = cuentas.find(c => c.id === mov.cuenta_id);
                        let nombreProp = "";
                        let color = "#9f9f9f";
                        
                        if (esIngreso) {
                          nombreProp = "Ingreso de Dinero";
                          color = "#22c55e"; 
                        } else {
                          const prop = propositos.find(p => p.id === mov.proposito_id);
                          nombreProp = prop ? prop.nombre : "Gasto Libre";
                          color = prop ? (prop.color ?? color) : color;
                        }

                        return (
                          <tr key={mov.id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-2 text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(mov.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                  <span className="font-semibold text-xs">{nombreProp}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate">
                                  {mov.descripcion || mov.fuente || "Sin descripción"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-[10px] font-semibold text-muted-foreground">
                              {cta?.nombre ?? "—"}
                            </td>
                            <td className={`py-3 px-2 text-right font-bold text-xs whitespace-nowrap ${esIngreso ? "text-emerald-500" : ""}`}>
                              {esIngreso ? "+" : "-"}C$ {mov.monto.toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right">
                              {planSeleccionado?.estado === "ACTIVO" ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEliminarMovimiento(mov.id)}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/60 italic">Cerrado</span>
                              )}
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
      </div>
    </MainLayout>
  );
}
