"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDataProvider } from "@/hooks/use-data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TipoPerfil } from "@/types";

export default function OnboardingPage() {
  const router = useRouter();
  const provider = useDataProvider();
  const [loading, setLoading] = useState(false);

  const handleSelectProfile = async (tipo_perfil: TipoPerfil) => {
    setLoading(true);
    try {
      // 1. Crear Perfil
      await provider.crearPerfil({
        tipo_perfil,
        moneda_defecto: "NIO",
        dia_corte_1: 10,
        dia_corte_2: 25,
      });

      // 2. Crear Cuenta de Efectivo inicial o recuperarla
      const cuentasExistentes = await provider.getCuentas();
      let cuenta = cuentasExistentes.find(c => c.nombre === "Billetera Efectivo");
      if (!cuenta) {
        cuenta = await provider.crearCuenta({
          nombre: "Billetera Efectivo",
          tipo: "EFECTIVO",
          saldo_inicial: 0
        });
      }

      // 3. Routing basado en perfil
      if (tipo_perfil === "TRACKER") {
        router.push("/dashboard");
      } else {
        // Planificador and Ahorrador go to create their first plan
        router.push("/planificacion");
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-4xl w-full space-y-8 animate-in fade-in zoom-in duration-500">
        
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent">
            Toma el control de tu dinero. A tu manera.
          </h1>
          <p className="text-xl text-muted-foreground">
            No te adaptes a una aplicación. Deja que la aplicación se adapte a ti.
          </p>
          <p className="text-sm font-medium pt-4">¿Cómo prefieres manejar tu dinero?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          
          {/* Tracker */}
          <Card className="relative overflow-hidden group hover:border-blue-500/50 transition-colors cursor-pointer bg-card/40 backdrop-blur-sm border-white/10" onClick={() => handleSelectProfile("TRACKER")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-blue-400">
                <span className="text-2xl">👀</span> El Tracker
              </CardTitle>
              <CardDescription className="text-base pt-2">
                "Solo quiero registrar lo que gasto para ver a dónde va mi dinero al final del mes."
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground mb-6">
                <li>• Experiencia minimalista</li>
                <li>• Registro rápido de gastos</li>
                <li>• Gráficos simples a fin de mes</li>
              </ul>
              <Button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Comenzar como Tracker
              </Button>
            </CardContent>
          </Card>

          {/* Planificador */}
          <Card className="relative overflow-hidden group hover:border-emerald-500/50 transition-colors cursor-pointer bg-card/40 backdrop-blur-sm border-white/10 ring-2 ring-emerald-500/20" onClick={() => handleSelectProfile("PLANIFICADOR")}>
            <div className="absolute top-0 right-0 bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-bl-lg">
              RECOMENDADO
            </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-emerald-400">
                <span className="text-2xl">🎯</span> El Planificador
              </CardTitle>
              <CardDescription className="text-base pt-2">
                "Quiero planificar cada córdoba que recibo antes de gastarlo en sobres virtuales."
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground mb-6">
                <li>• Presupuesto base cero</li>
                <li>• Asignación por propósitos</li>
                <li>• Control total del dinero</li>
              </ul>
              <Button disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                Comenzar como Planificador
              </Button>
            </CardContent>
          </Card>

          {/* Ahorrador */}
          <Card className="relative overflow-hidden group hover:border-purple-500/50 transition-colors cursor-pointer bg-card/40 backdrop-blur-sm border-white/10" onClick={() => handleSelectProfile("AHORRADOR")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-purple-400">
                <span className="text-2xl">💰</span> El Ahorrador
              </CardTitle>
              <CardDescription className="text-base pt-2">
                "Mi prioridad es separar mis ahorros y pagar deudas, el resto es para vivir."
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-2 text-muted-foreground mb-6">
                <li>• Págate a ti mismo primero</li>
                <li>• Seguimiento de metas</li>
                <li>• Distribución automática (50/30/20)</li>
              </ul>
              <Button disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                Comenzar como Ahorrador
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
