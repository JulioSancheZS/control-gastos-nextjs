"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  CalendarRange, 
  TrendingUp, 
  LogOut, 
  Settings,
  PiggyBank,
  PieChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useDataProvider } from "@/hooks/use-data-provider";
import { PerfilUsuario } from "@/types";

interface SidebarProps {
  className?: string;
  onItemClick?: () => void;
}

export function Sidebar({ className, onItemClick }: SidebarProps) {
  const pathname = usePathname();
  const provider = useDataProvider();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [user, setUser] = useState<{id: string} | null>(null);

  useEffect(() => {
    async function load() {
      const p = await provider.getPerfil();
      if (p) setPerfil(p);
      
      const u = await provider.getUser();
      if (u) setUser(u);
    }
    load();
  }, [provider]);

  let menuItems = [
    {
      nombre: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      nombre: "Nuevo Plan",
      href: "/planificacion",
      icon: CalendarRange,
    },
    {
      nombre: "Transacciones",
      href: "/transacciones",
      icon: ArrowLeftRight,
    },
    {
      nombre: "Historial",
      href: "/historial",
      icon: TrendingUp,
    },
    {
      nombre: "Reportes",
      href: "/reportes",
      icon: PieChart, 
    },
    {
      nombre: "Mis Ahorros",
      href: "/ahorros",
      icon: PiggyBank,
    },
    {
      nombre: "Configuración",
      href: "/configuracion",
      icon: Settings,
    }
  ];

  if (perfil?.tipo_perfil === "TRACKER") {
    menuItems = menuItems.filter(item => item.nombre !== "Nuevo Plan" && item.nombre !== "Historial");
  }

  const isLocal = user?.id === "local-user";

  return (
    <div className={cn("flex flex-col h-full bg-card/60 backdrop-blur-md border-r border-border/40 text-card-foreground premium-card-glow", className)}>
      {/* Brand Logo Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-border/40">
        <img src="/logo-app-finanzas.png" alt="Logo" className="h-8 w-8 object-contain" />
        <span className="font-sans font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
          Control de Gastos
        </span>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                active 
                  ? "bg-primary/10 text-primary border-l-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-transform duration-200 group-hover:scale-110",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {item.nombre}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Footer Section */}
      <div className="p-4 border-t border-border/40 space-y-2">
        {isLocal ? (
          <>
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl text-xs text-muted-foreground bg-muted/20">
              <div className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span>Modo Demo Local</span>
            </div>
            
            <button 
              onClick={() => {
                if (window.confirm("¿Estás seguro? Esto borrará toda tu base de datos local y te devolverá al Onboarding.")) {
                  localStorage.clear();
                  window.location.href = "/onboarding";
                }
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Resetear Demo
            </button>
          </>
        ) : (
          <button 
            onClick={async () => {
              await provider.logout();
              window.location.href = "/";
            }}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        )}
      </div>
    </div>
  );
}
