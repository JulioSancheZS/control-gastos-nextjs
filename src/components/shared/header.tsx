"use client";

import { useEffect, useState } from "react";
import { Menu, Sun, Moon, Calendar, ChevronRight, HelpCircle } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { useDataProvider } from "@/hooks/use-data-provider";
import { PlanFinanciero } from "@/types";

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { theme, toggle } = useTheme();
  const provider = useDataProvider();
  const [planActivo, setPlanActivo] = useState<PlanFinanciero | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const active = await provider.getPlanActivo();
        setPlanActivo(active);
      } catch (e) {
        console.error("Error cargando plan activo en header", e);
      }
    }
    load();
  }, [provider]);

  // Formatear fechas
  const formatFecha = (str?: string) => {
    if (!str) return "";
    const date = new Date(str + "T00:00:00");
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-border/45 bg-background/50 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={onMenuToggle}
          className="md:hidden h-9 w-9 border-border/60 hover:bg-muted/60"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Period Context Badge */}
        {planActivo ? (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-500 border border-emerald-500/20">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {planActivo.ciclo === "SEMANAL"
                ? "Semanal"
                : planActivo.ciclo === "QUINCENAL"
                ? "Quincena"
                : planActivo.ciclo === "MENSUAL"
                ? "Mensual"
                : "Plan"}:{" "}
              {formatFecha(planActivo.fecha_inicio)} al {formatFecha(planActivo.fecha_fin)}
            </span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-xs font-semibold text-amber-500 border border-amber-500/20">
            <span>Sin plan activo</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggle}
          className="h-9 w-9 rounded-xl border-border/60 hover:bg-muted/60"
          title="Cambiar tema"
        >
          {theme === "dark" ? (
            <Sun className="h-4.5 w-4.5 text-amber-400" />
          ) : (
            <Moon className="h-4.5 w-4.5 text-indigo-500" />
          )}
        </Button>

        {/* User Info Capsule */}
        <div className="flex items-center gap-2 pl-2 border-l border-border/40">
          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/45">
            <span className="text-xs font-bold text-emerald-500">JD</span>
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold">Julio Demo</p>
            <p className="text-[10px] text-muted-foreground">App User</p>
          </div>
        </div>
      </div>
    </header>
  );
}
