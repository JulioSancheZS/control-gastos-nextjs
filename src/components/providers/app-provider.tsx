"use client";

import { useEffect, useRef } from "react";
import { inicializarDatos } from "@/lib/data/seed";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      inicializarDatos();
      initialized.current = true;
    }
  }, []);

  return <>{children}</>;
}