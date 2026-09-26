"use client";

import { useEffect, useState, createContext } from "react";
import { inicializarDatos } from "@/lib/data/seed";
import { DataProvider } from "@/lib/data/types";
import { LocalProvider } from "@/lib/data/local-provider";
import { SupabaseProvider } from "@/lib/data/supabase-provider";
import { supabase } from "@/lib/supabase-client";

export const DataProviderContext = createContext<DataProvider | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Por defecto iniciamos con LocalProvider para que SSR y el primer render no rompan
  const [provider, setProvider] = useState<DataProvider>(() => new LocalProvider());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Inicializar LocalStorage seed si es necesario (modo demo)
    inicializarDatos();

    // 2. Revisar sesión activa de Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setProvider(new SupabaseProvider());
      } else {
        setProvider(new LocalProvider());
      }
      setLoading(false);
    });

    // 3. Escuchar cambios de autenticación (Login / Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setProvider(new SupabaseProvider());
      } else {
        setProvider(new LocalProvider());
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    // Retornamos null o un loader genérico mientras decidimos qué base de datos usar
    return null;
  }

  return (
    <DataProviderContext.Provider value={provider}>
      {children}
    </DataProviderContext.Provider>
  );
}
