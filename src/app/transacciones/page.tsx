"use client";

import { useEffect, useState } from "react";
import { useDataProvider } from "@/hooks/use-data-provider";
import { PerfilUsuario } from "@/types";
import { PlanificadorTransacciones } from "@/components/transacciones/planificador-transacciones";
import { TrackerTransacciones } from "@/components/transacciones/tracker-transacciones";

export default function TransaccionesRouterPage() {
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

  if (perfil?.tipo_perfil === "TRACKER") {
    return <TrackerTransacciones />;
  }

  return <PlanificadorTransacciones />;
}
