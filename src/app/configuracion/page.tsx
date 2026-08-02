"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Calendar, Info } from "lucide-react";
import { useDataProvider } from "@/hooks/use-data-provider";
import { MainLayout } from "@/components/shared/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PerfilUsuario, PlanFinanciero, Asignacion, Movimiento } from "@/types";
const DIAS_DEL_MES = Array.from({ length: 30 }, (_, i) => i + 1);

export default function ConfiguracionPage() {
  const provider = useDataProvider();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  
  // Local state for the form
  const [d1, setD1] = useState(10);
  const [d2, setD2] = useState(25);
  const [metaAhorro, setMetaAhorro] = useState(8000);
  
  const [guardado, setGuardado] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const saved = await provider.getPerfil();
        if (saved) {
          setPerfil(saved);
          setD1(saved.dia_corte_1 ?? 10);
          setD2(saved.dia_corte_2 ?? 25);
          setMetaAhorro(saved.meta_ahorro_mensual ?? 8000);
        }
      } catch (e) {
        console.error("Error cargando configuración", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [provider]);

  const handleGuardar = async () => {
    if (d1 === d2 || !perfil) return;
    try {
      const actualizado: PerfilUsuario = {
        ...perfil,
        dia_corte_1: d1,
        dia_corte_2: d2,
        meta_ahorro_mensual: metaAhorro
      };
      await provider.actualizarPerfil(actualizado);
      setPerfil(actualizado);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e) {
      console.error("Error guardando configuración", e);
    }
  };

  const handleSimularDatos = () => {
    if (!confirm("Esto reemplazará tus planes actuales con una simulación del ciclo del 10 y 25. ¿Deseas continuar?")) return;

    // Crear plan simulado (10 al 24)
    const planDemo: PlanFinanciero = {
      id: "plan-simulacion-10",
      user_id: "local",
      nombre: "Quincena del 10 (Simulación)",
      estado: "ACTIVO",
      fecha_inicio: "2026-07-10",
      fecha_fin: "2026-07-24",
      created_at: new Date().toISOString()
    };

    // Asignaciones simuladas
    const asigGasolina: Asignacion = {
      id: "asig-sim-1",
      plan_id: planDemo.id,
      proposito_id: "prop-gasolina", // Asegurarse que exista en defaults
      monto_asignado: 2500,
      created_at: new Date().toISOString()
    };
    
    const asigComida: Asignacion = {
      id: "asig-sim-2",
      plan_id: planDemo.id,
      proposito_id: "prop-comida",
      monto_asignado: 4000,
      created_at: new Date().toISOString()
    };

    // Movimientos simulados
    const movIngreso: Movimiento = {
      id: "mov-sim-1",
      user_id: "local",
      cuenta_id: "cta-banco",
      tipo: "INGRESO",
      monto: 15000,
      fecha: "2026-07-10",
      descripcion: "Salario Quincena 10",
      plan_id: planDemo.id,
      fuente: "Salario",
      created_at: new Date().toISOString()
    };

    const movGastoGasolina: Movimiento = {
      id: "mov-sim-2",
      user_id: "local",
      cuenta_id: "cta-banco",
      tipo: "GASTO",
      monto: 1200,
      fecha: "2026-07-12",
      descripcion: "Llenado de tanque",
      asignacion_id: asigGasolina.id,
      proposito_id: "prop-gasolina",
      created_at: new Date().toISOString()
    };

    localStorage.setItem("planes", JSON.stringify([planDemo]));
    localStorage.setItem("asignaciones", JSON.stringify([asigGasolina, asigComida]));
    localStorage.setItem("movimientos", JSON.stringify([movIngreso, movGastoGasolina]));

    alert("Simulación cargada con éxito. Ve al Dashboard para ver los resultados.");
    window.location.href = "/dashboard";
  };

  const presets: { label: string; p1: number; p2: number }[] = [
    { label: "10 y 25", p1: 10, p2: 25 },
    { label: "15 y 30", p1: 15, p2: 30 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto space-y-6 text-center pt-20 text-muted-foreground">
          <p>No tienes un perfil creado aún. Completa el Onboarding primero.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configuración del Perfil
          </h1>
          <p className="text-sm text-muted-foreground">
            Personaliza los detalles de tu perfil, como tu tipo de planificación y días de quincena.
          </p>
        </div>

        {/* Quincenas */}
        <Card className="glass-panel border-border/40 rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Días de Pago
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Selecciona los días en que recibes tu quincena (si aplica). El sistema usará estas fechas para sugerencias.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets rápidos */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Atajos comunes
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((p) => {
                  const selected = d1 === p.p1 && d2 === p.p2;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => { setD1(p.p1); setD2(p.p2); }}
                      className={`h-10 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 text-muted-foreground hover:bg-muted/40 hover:border-border/80"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selectores de día */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Primer día de pago
                </Label>
                <select
                  value={d1}
                  onChange={(e) => setD1(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border border-border/60 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  {DIAS_DEL_MES.map((d) => (
                    <option key={d} value={d}>
                      Día {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Segundo día de pago
                </Label>
                <select
                  value={d2}
                  onChange={(e) => setD2(Number(e.target.value))}
                  className="w-full h-11 px-3 rounded-xl border border-border/60 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                >
                  {DIAS_DEL_MES.map((d) => (
                    <option key={d} value={d}>
                      Día {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {d1 === d2 && (
              <p className="text-xs text-destructive font-medium">
                Los dos días de pago no pueden ser iguales.
              </p>
            )}

            {/* Meta de ahorro mensual */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">
                Meta de ahorro mensual (C$)
              </Label>
              <input
                type="number"
                value={metaAhorro}
                onChange={(e) => setMetaAhorro(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border border-border/60 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
              <p className="text-[10px] text-muted-foreground">
                Objetivo de cuánto querés ahorrar cada mes entre ambas quincenas.
              </p>
            </div>

            {/* Guardar */}
            <Button
              onClick={handleGuardar}
              disabled={d1 === d2}
              className="w-full h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
            >
              {guardado ? (
                <>
                  <span className="h-4 w-4 rounded-full bg-primary-foreground/20 flex items-center justify-center text-[10px]">✓</span>
                  Guardado correctamente
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Zona de Demostración */}
        <Card className="glass-panel border-amber-500/30 rounded-2xl bg-amber-500/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-amber-500 flex items-center gap-2">
              <Info className="h-5 w-5" />
              Zona de Demostración
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Inyecta datos falsos para simular cómo se vería tu quincena (Paga el día 10, de 15,000 córdobas). Esto reemplazará tus planes actuales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleSimularDatos}
              variant="outline"
              className="w-full h-11 rounded-xl font-bold border-amber-500/40 text-amber-500 hover:bg-amber-500 hover:text-white transition-all"
            >
              Cargar Simulación (10 y 25)
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
