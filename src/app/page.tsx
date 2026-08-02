"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDataProvider } from "@/hooks/use-data-provider";

export default function Home() {
  const router = useRouter();
  const provider = useDataProvider();

  useEffect(() => {
    async function redirigir() {
      try {
        const perfil = await provider.getPerfil();
        if (!perfil) {
          router.push("/onboarding");
          return;
        }

        const planActivo = await provider.getPlanActivo();
        if (planActivo) {
          router.push("/dashboard");
        } else {
          router.push("/planificacion");
        }
      } catch (e) {
        console.error("Error redireccionando en home", e);
        router.push("/onboarding");
      }
    }
    redirigir();
  }, [provider, router]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        {/* Simple loader */}
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
            Control Financiero
          </h2>
          <p className="text-xs text-muted-foreground animate-pulse">Cargando entorno local persistente...</p>
        </div>
      </div>
    </div>
  );
}
