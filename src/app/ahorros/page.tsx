"use client";

import { useEffect, useState } from "react";
import { useDataProvider } from "@/hooks/use-data-provider";
import { Proposito } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PiggyBank, Target, ArrowUpRight, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

import { MainLayout } from "@/components/shared/main-layout";

export default function AhorrosPage() {
  const provider = useDataProvider();
  const [loading, setLoading] = useState(true);
  const [ahorros, setAhorros] = useState<any[]>([]);
  const [totalAcumulado, setTotalAcumulado] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const plan = await provider.getPlanActivo();
        if (!plan) {
          setLoading(false);
          return;
        }

        const asigs = await provider.getAsignaciones(plan.id);
        const sobres = await Promise.all(
          asigs.map(async (a) => {
            const disp = await provider.getDisponiblePorAsignacion(a.id);
            return {
              proposito_id: a.proposito_id,
              disponible: disp.disponible
            };
          })
        );
        
        const props = await provider.getPropositos();

        const ahorrosProps = props.filter(p => p.es_ahorro);
        
        let total = 0;
        const data = ahorrosProps.map(p => {
          const sobre = sobres.find((s: any) => s.proposito_id === p.id);
          const disponible = sobre ? sobre.disponible : 0;
          total += disponible;
          
          let metaValor = null;
          if (p.patron_esperado && !isNaN(Number(p.patron_esperado))) {
            metaValor = Number(p.patron_esperado);
          }
          
          return {
            ...p,
            acumulado: disponible,
            meta: metaValor
          };
        });

        setTotalAcumulado(total);
        setAhorros(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [provider]);

  if (loading) {
    return <MainLayout><div className="p-8 text-center text-slate-500 animate-pulse">Cargando portafolio...</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <PiggyBank className="h-8 w-8 text-emerald-500" />
          Mi Portafolio de Ahorros
        </h1>
        <p className="text-slate-500 dark:text-slate-400">Monitorea el crecimiento de tus metas y fondos de inversión.</p>
      </div>

      <Card className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white border-none shadow-xl">
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-emerald-100 font-medium mb-1">Total Acumulado</p>
            <h2 className="text-5xl font-extrabold tracking-tight">
              C$ {totalAcumulado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ahorros.map(a => {
          const progreso = a.meta && a.meta > 0 ? Math.min(100, (a.acumulado / a.meta) * 100) : 0;
          
          return (
            <Card key={a.id} className="shadow-md hover:shadow-lg transition-shadow border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: a.color || '#10b981' }}
                    >
                      {a.icono || <Target className="h-5 w-5" />}
                    </div>
                    <CardTitle className="text-lg">{a.nombre}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    C$ {a.acumulado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  
                  {a.meta && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs text-slate-500 font-medium">
                        <span>Progreso hacia la meta</span>
                        <span>{progreso.toFixed(1)}%</span>
                      </div>
                      <Progress value={progreso} className="h-2" />
                      <p className="text-xs text-right text-slate-400">Meta: C$ {a.meta.toLocaleString()}</p>
                    </div>
                  )}
                  
                  {!a.meta && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500 italic flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> Fondo de crecimiento libre
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {ahorros.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed rounded-xl">
            Aún no tienes propósitos configurados como ahorro. <br /> Ve a Configuración y crea uno nuevo.
          </div>
        )}
      </div>
    </div>
    </MainLayout>
  );
}
