"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDataProvider } from "@/hooks/use-data-provider";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const provider = useDataProvider();
  
  // Guardamos la última ruta que fue verificada con éxito
  const [verifiedPathname, setVerifiedPathname] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const perfil = await provider.getPerfil();
        
        // Regla 1: Sin perfil
        if (!perfil) {
          if (pathname !== "/onboarding" && pathname !== "/") {
            router.replace("/onboarding");
            return;
          }
        }

        // Regla 2: Tiene perfil y trata de ir a onboarding
        if (perfil && (pathname === "/onboarding" || pathname === "/")) {
          router.replace("/dashboard");
          return;
        }

        // Regla 3: Tracker intentando ir a planificación
        if (perfil?.tipo_perfil === "TRACKER" && pathname.startsWith("/planificacion")) {
          router.replace("/dashboard");
          return;
        }

        // Si pasó todas las reglas, marcamos la ruta actual como verificada
        if (isMounted) {
          setVerifiedPathname(pathname);
        }
      } catch (e) {
        console.error("Error en RouteGuard", e);
        // Si hay error grave, lo mandamos a onboarding (salvo que ya esté allí)
        if (pathname !== "/onboarding" && pathname !== "/") {
          router.replace("/onboarding");
        } else if (isMounted) {
          setVerifiedPathname(pathname);
        }
      }
    }
    
    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, provider, router]);

  // Bloqueamos el renderizado si la ruta actual no ha sido verificada.
  // Excepto si es la ruta de inicio o onboarding, que son públicas y queremos que carguen rápido.
  if (verifiedPathname !== pathname && pathname !== "/onboarding" && pathname !== "/") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
        <p className="text-sm text-muted-foreground">Verificando seguridad...</p>
      </div>
    );
  }

  return <>{children}</>;
}
