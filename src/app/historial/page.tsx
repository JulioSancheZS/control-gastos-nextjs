"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/shared/main-layout";
import { useDataProvider } from "@/hooks/use-data-provider";
import { PlanFinanciero, ResumenKPIs } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { CalendarRange, Info } from "lucide-react";

type PlanConKPIs = PlanFinanciero & {
  kpis: ResumenKPIs;
};

export default function HistorialPage() {
  const provider = useDataProvider();
  const [planes, setPlanes] = useState<PlanConKPIs[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function load() {
      const todosLosPlanes = await provider.getHistoricoPlanes();
      
      // Fetch KPIs para cada plan
      const planesConKpis = await Promise.all(
        todosLosPlanes.map(async (plan) => {
          const kpis = await provider.getResumenKPIs(plan.id);
          return { ...plan, kpis };
        })
      );
      
      // Ordenar por fecha de inicio (más antiguo a más nuevo para el gráfico)
      planesConKpis.sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio));
      
      setPlanes(planesConKpis);
      setCargando(false);
    }
    load();
  }, [provider]);

  if (cargando) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (planes.length === 0) {
    return (
      <MainLayout>
        <div className="p-6">
          <Card className="glass-panel text-center py-12">
            <CardContent>
              <CalendarRange className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold mb-2">No hay historial todavía</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Tus planes financieros aparecerán aquí para que puedas analizar tu evolución a lo largo del tiempo.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Datos para el gráfico de barras (Evolución)
  const dataEvolucion = planes.map(p => ({
    nombre: p.nombre,
    Ingresos: p.kpis.ingreso_total,
    Gastos: p.kpis.total_gastado,
    Ahorros: p.kpis.total_ahorrado || 0,
  }));

  // Datos para el gráfico de pastel del ÚLTIMO plan
  const ultimoPlan = planes[planes.length - 1];
  const dataDistribucion = [
    { name: "Gastos Reales", value: ultimoPlan.kpis.total_gastado, color: "#f43f5e" }, // Rose
    { name: "Ahorros Trasladados", value: ultimoPlan.kpis.total_ahorrado || 0, color: "#a855f7" }, // Purple
    { name: "Dinero Libre (Sobrante)", value: ultimoPlan.kpis.sin_asignar > 0 ? ultimoPlan.kpis.sin_asignar : 0, color: "#10b981" }, // Emerald
    { name: "Dinero en Sobres (Sobrante)", value: (ultimoPlan.kpis.ingreso_total - ultimoPlan.kpis.total_gastado - (ultimoPlan.kpis.total_ahorrado || 0) - ultimoPlan.kpis.sin_asignar) > 0 ? (ultimoPlan.kpis.ingreso_total - ultimoPlan.kpis.total_gastado - (ultimoPlan.kpis.total_ahorrado || 0) - ultimoPlan.kpis.sin_asignar) : 0, color: "#3b82f6" } // Blue
  ].filter(d => d.value > 0);

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent inline-block">
            Tu Evolución Financiera
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualiza cómo has gestionado tu dinero a lo largo de los meses.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Gráfico Principal: Evolución */}
          <Card className="glass-panel border-border/40 lg:col-span-2">
            <CardHeader>
              <CardTitle>Ingresos vs Gastos</CardTitle>
              <CardDescription>Comparativa histórica mensual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataEvolucion} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="nombre" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip 
                      cursor={{fill: '#ffffff05'}}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                    <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="Ahorros" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico Secundario: Distribución del último mes */}
          <Card className="glass-panel border-border/40">
            <CardHeader>
              <CardTitle>Último Mes: {ultimoPlan.nombre}</CardTitle>
              <CardDescription>Distribución al cierre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dataDistribucion}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dataDistribucion.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      formatter={(value: any) => [`C$ ${Number(value).toFixed(2)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {dataDistribucion.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">C$ {d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Planes Históricos */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-400" />
            Resumen Detallado
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planes.map((plan) => {
              const porcentajeGastado = (plan.kpis.total_gastado / plan.kpis.ingreso_total) * 100 || 0;
              const porcentajeAhorrado = ((plan.kpis.total_ahorrado || 0) / plan.kpis.ingreso_total) * 100 || 0;
              
              return (
                <Card key={plan.id} className={`glass-panel border-border/40 ${plan.estado === 'ACTIVO' ? 'ring-1 ring-emerald-500/50' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{plan.nombre}</CardTitle>
                      {plan.estado === 'ACTIVO' && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                          Activo
                        </span>
                      )}
                    </div>
                    <CardDescription>
                      {plan.fecha_inicio} a {plan.fecha_fin}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ingresos</span>
                        <span className="font-semibold text-emerald-400">C$ {plan.kpis.ingreso_total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Gastos Reales</span>
                        <span className="font-semibold text-rose-400">C$ {plan.kpis.total_gastado.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ahorrado</span>
                        <span className="font-semibold text-purple-400">C$ {(plan.kpis.total_ahorrado || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-border/40">
                        <span className="text-muted-foreground">Sobrante Total</span>
                        <span className="font-bold text-foreground">C$ {(plan.kpis.ingreso_total - plan.kpis.total_gastado - (plan.kpis.total_ahorrado || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>% Gastado</span>
                        <span>{porcentajeGastado.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-rose-500" 
                          style={{ width: `${Math.min(porcentajeGastado, 100)}%` }}
                        />
                        <div 
                          className="h-full bg-purple-500" 
                          style={{ width: `${Math.min(porcentajeAhorrado, 100 - porcentajeGastado)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
