"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDataProvider } from "@/hooks/use-data-provider";
import { Button } from "@/components/ui/button";
import { ArrowRight, Cloud, Smartphone, Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const provider = useDataProvider();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      try {
        const user = await provider.getUser();
        const perfil = await provider.getPerfil();
        
        if (perfil) {
          const planActivo = await provider.getPlanActivo();
          if (planActivo) {
            router.push("/dashboard");
          } else {
            router.push("/planificacion");
          }
        } else if (user) {
          // Si está autenticado pero aún no ha creado el perfil en la base de datos (Ej: Recién hace click en el Magic Link)
          router.push("/onboarding");
        } else {
          // Si no hay perfil activo ni usuario (sesión cerrada)
          if (typeof window !== "undefined" && window.localStorage.getItem("hasRegistered") === "true") {
            router.push("/auth/login");
          } else {
            // Es un usuario completamente nuevo, mostramos la landing
            setChecking(false);
          }
        }
      } catch (e) {
        console.error("Error redireccionando en home", e);
        setChecking(false);
      }
    }
    checkProfile();
  }, [provider, router]);

  if (checking) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              Control Financiero
            </h2>
            <p className="text-xs text-muted-foreground animate-pulse">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 z-10">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-6">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            Toma el control de tu <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">dinero</span>
          </h1>
          <p className="text-muted-foreground text-lg px-4">
            Planifica tus gastos, haz seguimiento de cada Córdoba y alcanza tus metas financieras.
          </p>
        </div>

        <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-2xl space-y-4">
          <Button 
            onClick={() => router.push("/auth/registro")}
            className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-medium shadow-lg hover:shadow-emerald-500/25 transition-all group"
          >
            <Cloud className="mr-2 h-5 w-5" />
            Crear Cuenta Gratis
            <ArrowRight className="ml-auto h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          <Button 
            variant="outline"
            onClick={() => router.push("/onboarding")}
            className="w-full py-6 rounded-xl border-border/50 bg-background/50 hover:bg-background/80 text-foreground transition-all group"
          >
            <Smartphone className="mr-2 h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            Empezar (Modo de prueba)
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{" "}
          <button 
            onClick={() => router.push("/auth/login")}
            className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
