"use client";

import { useEffect, useState } from "react";
import { useDataProvider } from "@/hooks/use-data-provider";
import { PerfilUsuario } from "@/types";
import { TrackerDashboard } from "@/components/dashboard/tracker-dashboard";
import { PlanificadorDashboard } from "@/components/dashboard/planificador-dashboard";

export default function DashboardRouterPage() {
  const provider = useDataProvider();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      try {
        const savedPerfil = await provider.getPerfil();
        setPerfil(savedPerfil || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    checkProfile();
  }, [provider]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando...</div>;
  }

  // Si no hay perfil, el guardia de rutas de onboarding (que añadiremos luego o ya existe a nivel layout)
  // debería encargarse. Por ahora, si no hay perfil, mostramos un fallback o redireccionamos a Onboarding (el usuario pidió el guardia).
  // Haremos la redirección en el OnboardingGuard después, por ahora si es TRACKER mostramos Tracker.

  if (perfil?.tipo_perfil === "TRACKER") {
    return <TrackerDashboard />;
  }

  // Por defecto (Planificador o Ahorrador) mostramos el dashboard principal (PlanificadorDashboard)
  return <PlanificadorDashboard />;
}
