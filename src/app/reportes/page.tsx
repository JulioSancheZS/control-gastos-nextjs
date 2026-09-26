"use client";

import { useEffect, useState } from "react";
import { useDataProvider } from "@/hooks/use-data-provider";
import { ReporteCategoria, ReporteEvolucion } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pie, PieChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Loader2, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { MainLayout } from "@/components/shared/main-layout";

export default function ReportesPage() {
  const provider = useDataProvider();
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState<ReporteCategoria[]>([]);
  const [evolucion, setEvolucion] = useState<ReporteEvolucion[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const catData = await provider.getReporteCategorias();
        const evoData = await provider.getReporteEvolucion(6);
        setCategorias(catData);
        setEvolucion(evoData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [provider]);

  if (loading) {
    return <MainLayout><div className="p-8 text-center text-slate-500 animate-pulse">Cargando reportes...</div></MainLayout>;
  }

  const COLORS = categorias.map(c => c.color || '#3b82f6');

  // Para recharts el tooltip nativo es suficiente por ahora si no queremos complicarnos con chartConfig
  return (
    <MainLayout>
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Reportes y Estadísticas</h1>
        <p className="text-slate-500 dark:text-slate-400">Analiza tu salud financiera y descubre a dónde se va tu dinero.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gráfico Circular: Gastos por Categoría */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-500" />
              <CardTitle>Gastos por Categoría</CardTitle>
            </div>
            <CardDescription>Distribución de gastos en los últimos 30 días</CardDescription>
          </CardHeader>
          <CardContent>
            {categorias.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No hay datos suficientes
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorias}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="total"
                      nameKey="nombre"
                      stroke="none"
                    >
                      {categorias.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [`C$ ${Number(value).toLocaleString()}`, 'Total Gastado']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Barras: Evolución Mensual */}
        <Card className="shadow-lg border-slate-200 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <CardTitle>Evolución Financiera</CardTitle>
            </div>
            <CardDescription>Ingresos vs Gastos en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {evolucion.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-slate-500">
                No hay datos suficientes
              </div>
            ) : (
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evolucion} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `C$${val/1000}k`} />
                    <Tooltip 
                      cursor={{ fill: '#334155', opacity: 0.1 }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [`C$ ${Number(value).toLocaleString()}`, undefined]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
    </MainLayout>
  );
}
