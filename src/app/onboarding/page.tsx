"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDataProvider } from "@/hooks/use-data-provider";
import { migrateLocalDataToCloud } from "@/lib/data/migration";
import { PROPOSITOS_DEFAULT } from "@/lib/data/seed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TipoPerfil } from "@/types";
import { CloudUpload, RefreshCw, XCircle } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const provider = useDataProvider();
  const [loading, setLoading] = useState(false);
  
  // Migration State
  const [hasLocalData, setHasLocalData] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [migrationLog, setMigrationLog] = useState("");
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);

  useEffect(() => {
    const perfil = localStorage.getItem('perfil_usuario');
    const migracionHecha = localStorage.getItem('control-gastos-migrated');
    
    // Si hay un perfil de usuario, significa que realmente usó la app de forma local (pasó el onboarding local).
    // Evitamos el falso positivo de los "propósitos" que se precargan por defecto en AppProvider.
    if (perfil && !migracionHecha) {
      setHasLocalData(true);
      setShowMigration(true);
    }
  }, []);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const user = await provider.getUser();
      if (!user) throw new Error("No hay usuario autenticado.");
      
      await migrateLocalDataToCloud(user.id, (msg) => {
        setMigrationLog(prev => prev + msg + "\n");
      });
      
      setMigrationDone(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (e: any) {
      setMigrationLog(prev => prev + "\nERROR: " + e.message);
      console.error(e);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkipMigration = () => {
    localStorage.setItem('control-gastos-migrated', 'true');
    setShowMigration(false);
  };

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

      // 3. Crear Propósitos por Defecto si no existen
      if (tipo_perfil === "PLANIFICADOR") {
        const propositos = await provider.getPropositos();
        if (propositos.length === 0) {
          for (const p of PROPOSITOS_DEFAULT) {
            await provider.crearProposito({
              nombre: p.nombre,
              icono: p.icono,
              color: p.color,
              patron_esperado: p.patron_esperado,
              es_ahorro: p.es_ahorro,
              tipo_categoria: p.tipo_categoria,
              activa: p.activa
            });
          }
        }
      }

      // 3. Registrar Log
      await provider.guardarLog("ONBOARDING_COMPLETADO", { tipo_perfil });

      // 4. Routing basado en perfil
      if (tipo_perfil === "TRACKER") {
        router.push("/dashboard");
      } else {
        // Planificador va a crear su primer plan
        router.push("/planificacion");
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (showMigration) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background text-foreground relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl z-10 animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center">
              <CloudUpload className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">¡Datos locales detectados!</h2>
            <p className="text-muted-foreground text-sm">
              Hemos encontrado cuentas y movimientos en tu dispositivo creados en el modo de prueba. 
              ¿Deseas sincronizarlos con tu nueva cuenta en la nube para no perderlos?
            </p>

            {migrationLog && (
              <div className="w-full mt-4 p-3 bg-black/50 rounded-lg text-left overflow-y-auto max-h-32">
                <pre className="text-xs text-blue-300 font-mono whitespace-pre-wrap">{migrationLog}</pre>
              </div>
            )}

            {!migrationDone ? (
              <div className="w-full flex flex-col gap-3 pt-4">
                <Button 
                  onClick={handleMigrate} 
                  disabled={isMigrating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isMigrating ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : <CloudUpload className="h-5 w-5 mr-2" />}
                  {isMigrating ? "Migrando datos..." : "Sí, sincronizar datos"}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleSkipMigration}
                  disabled={isMigrating}
                  className="w-full text-muted-foreground hover:text-white"
                >
                  No, empezar desde cero
                </Button>
              </div>
            ) : (
              <div className="w-full pt-4">
                <p className="text-emerald-400 font-medium pb-4">¡Migración exitosa!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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

        <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-6 pt-4">
          
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

        </div>
      </div>
    </div>
  );
}
