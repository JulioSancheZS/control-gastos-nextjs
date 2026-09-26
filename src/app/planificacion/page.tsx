"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Info,
  Wallet,
  Plus,
  CalendarDays,
  Trash2,
  Loader2
} from "lucide-react";
import { useDataProvider } from "@/hooks/use-data-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Proposito, Cuenta, PerfilUsuario, PatronProposito, PlanFinanciero, TipoCategoriaProposito } from "@/types";

function calcularFechasCicloMensual(hoy: Date): { inicio: string; fin: string; nombre: string } {
  const y = hoy.getFullYear();
  const m = hoy.getMonth();
  const format = (d: Date) => d.toISOString().split("T")[0];
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const inicioDate = new Date(y, m, 1);
  const finDate = new Date(y, m + 1, 0);

  return {
    inicio: format(inicioDate),
    fin: format(finDate),
    nombre: `${meses[m]} ${y}`
  };
}

export default function PlanificacionPage() {
  const router = useRouter();
  const provider = useDataProvider();

  const [step, setStep] = useState(1);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [propositos, setPropositos] = useState<Proposito[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [planActivo, setPlanActivo] = useState<PlanFinanciero | null>(null);
  const [esNuevoMes, setEsNuevoMes] = useState(true);

  const [nombrePlan, setNombrePlan] = useState("Mi Plan Financiero");
  const [nombreSugeridoMes, setNombreSugeridoMes] = useState("");
  const [mesPlanificado, setMesPlanificado] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [ingresoError, setIngresoError] = useState("");
  const [cuentaId, setCuentaId] = useState("");

  const [distribucion, setDistribucion] = useState<Record<string, number>>({});

  // Estado para el modal de nuevo propósito
  const [openNuevoProp, setOpenNuevoProp] = useState(false);
  const [nuevoPropNombre, setNuevoPropNombre] = useState("");
  const [nuevoPropTipoCat, setNuevoPropTipoCat] = useState<TipoCategoriaProposito>("COMPROMISO");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const p = await provider.getPerfil();
      const propData = await provider.getPropositos();
      const ctas = await provider.getCuentas();
      const plan = await provider.getPlanActivo();
      
      setPerfil(p);
      setPropositos(propData);
      setCuentas(ctas);

      if (ctas.length > 0) {
        setCuentaId(ctas[0].id);
      }

      // 1. Calcular fechas del mes actual
      const hoy = new Date();
      const sugeridas = calcularFechasCicloMensual(hoy);
      let initDate = sugeridas.inicio;
      let endDate = sugeridas.fin;
      let nombreSugerido = sugeridas.nombre;

      setFechaInicio(initDate);
      setFechaFin(endDate);
      setNombrePlan(nombreSugerido);
      setNombreSugeridoMes(nombreSugerido);
      
      const mesActualStr = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}`;
      setMesPlanificado(mesActualStr);
      setFechaIngreso(initDate); // Por defecto el mismo día de inicio del mes, o hoy (hoy.toISOString().split('T')[0])
      setFechaIngreso(hoy.toISOString().split('T')[0]);

      // 2. Gestionar plan activo y detección de vencimiento por cambio de mes
      if (plan) {
        setPlanActivo(plan);
        const mesActual = hoy.toISOString().substring(0, 7); // YYYY-MM
        const mesPlan = plan.fecha_inicio.substring(0, 7);
        const estaVencido = mesActual > mesPlan;

        if (estaVencido) {
          // Si venció el plan del mes anterior, por defecto forzar creación de nuevo plan
          setEsNuevoMes(true);
        } else {
          // Si estamos en el mismo mes, mantener la inyección al plan activo
          setNombrePlan(plan.nombre);
          setEsNuevoMes(false);
        }
      } else {
        setEsNuevoMes(true);
      }
    }
    load();
  }, [provider]);

  const handleAutofillSugeridos = () => {
    const distMap: Record<string, number> = {};
    propositos.forEach(cat => {
      distMap[cat.id] = 0;
    });
    setDistribucion(distMap);
  };

  const handleCrearProposito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoPropNombre.trim()) return;

    try {
      const nuevo = await provider.crearProposito({
        nombre: nuevoPropNombre,
        patron_esperado: nuevoPropTipoCat === "COMPROMISO" ? "FIJO" : "VARIABLE",
        es_ahorro: nuevoPropTipoCat === "AHORRO",
        tipo_categoria: nuevoPropTipoCat,
        activa: true,
        icono: nuevoPropTipoCat === "AHORRO" ? "📈" : nuevoPropTipoCat === "COMPROMISO" ? "📋" : "🛒",
        color: nuevoPropTipoCat === "AHORRO" ? "#8b5cf6" : nuevoPropTipoCat === "COMPROMISO" ? "#3b82f6" : "#f97316"
      });
      
      const nuevosProp = await provider.getPropositos();
      setPropositos(nuevosProp);
      
      setDistribucion(prev => ({ ...prev, [nuevo.id]: 0 }));
      setNuevoPropNombre("");
      setNuevoPropTipoCat("COMPROMISO");
      setOpenNuevoProp(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleEliminarProposito = async (id: string) => {
    try {
      await provider.actualizarProposito(id, { activa: false });
      const nuevosProp = await provider.getPropositos();
      setPropositos(nuevosProp);
      
      // Removerlo de la distribución si estaba
      setDistribucion(prev => {
        const d = { ...prev };
        delete d[id];
        return d;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const totalIngreso = Number(ingreso) || 0;
  const totalAsignado = Object.values(distribucion).reduce((a, b) => a + b, 0);
  const sinAsignar = totalIngreso - totalAsignado;

  const handleNext = () => {
    if (step === 1) {
      setIngresoError("");
      if (totalIngreso <= 0) {
        setIngresoError("Por favor ingresa un monto válido mayor a 0");
        return;
      }
      if (esNuevoMes) {
        if (!fechaInicio || !fechaFin || !cuentaId) return;
      } else {
        if (!cuentaId) return;
      }
      
      if (Object.keys(distribucion).length === 0) {
        handleAutofillSugeridos();
      }
      setStep(2);
    } else if (step === 2) {
      if (sinAsignar < 0) {
        alert("Has asignado más dinero del que tienes de ingreso.");
        return;
      }
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const distArray = Object.entries(distribucion)
        .filter(([, monto]) => monto > 0)
        .map(([proposito_id, monto]) => ({ proposito_id, monto }));

      console.log("PAYLOAD FRONTEND ANTES DE ENVIAR:", distArray);

      await provider.planificar({
        nombre: esNuevoMes ? nombrePlan : (planActivo?.nombre ?? "Plan Financiero"),
        fecha_inicio: esNuevoMes ? fechaInicio : (planActivo?.fecha_inicio ?? ""),
        fecha_fin: esNuevoMes ? fechaFin : (planActivo?.fecha_fin ?? ""),
        fecha_ingreso: fechaIngreso,
        ingreso_recibido: totalIngreso,
        cuenta_id: cuentaId,
        distribucion: distArray,
        plan_id_existente: esNuevoMes ? undefined : planActivo?.id
      });

      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl relative animate-in fade-in zoom-in duration-500">
        <div className="absolute -top-12 -left-12 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <Card className="glass-panel border border-border/40 shadow-2xl relative overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-border/40 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
                  ¡Recibiste Dinero!
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Vamos a darle un propósito a cada córdoba.
                </CardDescription>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Paso {step} de 3
              </span>
            </div>
            <div className="flex gap-2 mt-6">
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= 1 ? "bg-emerald-500" : "bg-muted"}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= 2 ? "bg-emerald-500" : "bg-muted"}`} />
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${step >= 3 ? "bg-emerald-500" : "bg-muted"}`} />
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* STEP 1: CONFIGURACIÓN DEL PLAN */}
            {step === 1 && (
              <div className="space-y-6">
                
                {planActivo && (
                  <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Plan Actual: {planActivo.nombre}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">El ingreso se sumará a los sobres de este mes.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const nuevoEstado = !esNuevoMes;
                        setEsNuevoMes(nuevoEstado);
                        setNombrePlan(nuevoEstado ? nombreSugeridoMes : planActivo.nombre);
                      }}
                      className="text-xs h-8 border-border/60 hover:bg-muted/40"
                    >
                      {esNuevoMes ? "Cancelar y usar el actual" : "Cerrar y crear nuevo mes"}
                    </Button>
                  </div>
                )}

                {esNuevoMes && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                      <Label htmlFor="mes">Mes a Planificar</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="mes"
                          type="month"
                          value={mesPlanificado}
                          onChange={(e) => {
                            const val = e.target.value; // Formato "YYYY-MM"
                            setMesPlanificado(val);
                            if (val) {
                              const [y, m] = val.split('-');
                              const year = parseInt(y, 10);
                              const month = parseInt(m, 10) - 1; // 0-indexed
                              const inicio = new Date(year, month, 1);
                              const fin = new Date(year, month + 1, 0); // Último día del mes
                              const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                              
                              setNombrePlan(`${meses[month]} ${year}`);
                              setFechaInicio(inicio.toISOString().split('T')[0]);
                              setFechaFin(fin.toISOString().split('T')[0]);
                            }
                          }}
                          className="pl-10 h-11 rounded-xl border-border/60 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500"
                        />
                      </div>
                      {nombrePlan && (
                        <p className="text-xs text-muted-foreground mt-1">
                          El plan se llamará: <strong className="text-foreground">{nombrePlan}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="cuenta">¿A qué cuenta ingresó el dinero?</Label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <select
                      id="cuenta"
                      value={cuentaId}
                      onChange={(e) => setCuentaId(e.target.value)}
                      className="w-full pl-10 h-11 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                    >
                      <option value="">Selecciona una cuenta</option>
                      {cuentas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fecha_ingreso">Fecha del Ingreso</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="fecha_ingreso"
                        type="date"
                        value={fechaIngreso}
                        onChange={(e) => setFechaIngreso(e.target.value)}
                        className="pl-10 h-11 rounded-xl border-border/60 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ingreso" className={ingresoError ? "text-rose-500" : ""}>
                      Monto del Ingreso (C$)
                    </Label>
                    <div className="relative">
                      <span className={`absolute left-3 top-2.5 font-bold ${ingresoError ? "text-rose-500" : "text-emerald-500"}`}>C$</span>
                      <Input
                        id="ingreso"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={ingreso}
                        onChange={(e) => {
                          setIngreso(e.target.value);
                          if (ingresoError) setIngresoError("");
                        }}
                        className={`pl-10 h-11 rounded-xl border-border/60 font-semibold text-lg ${ingresoError ? "border-rose-500 bg-rose-500/10 text-rose-500 focus-visible:ring-rose-500/40" : "text-emerald-500 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500 bg-emerald-500/5"}`}
                      />
                    </div>
                    {ingresoError && <p className="text-sm text-rose-500 mt-1">{ingresoError}</p>}
                  </div>
                </div>

              </div>
            )}

            {/* STEP 2: ASIGNACIÓN A PROPÓSITOS */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Ingreso</span>
                    <p className="text-sm font-bold text-emerald-400">C$ {totalIngreso.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Asignando Hoy</span>
                    <p className="text-sm font-bold text-blue-400">C$ {totalAsignado.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Falta Asignar</span>
                    <p className={`text-sm font-bold ${sinAsignar === 0 ? "text-emerald-400" : sinAsignar > 0 ? "text-blue-400" : "text-destructive animate-pulse"}`}>
                      C$ {sinAsignar.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="max-h-[350px] overflow-y-auto pr-2 space-y-3">
                  {propositos.filter(p => p.activa !== false).map(cat => {
                    const value = distribucion[cat.id] || "";

                    return (
                      <div key={cat.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${cat.es_ahorro ? 'bg-blue-500/5 border-blue-500/30' : 'bg-card border-border/40 hover:border-border/80'}`}>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-9 w-9 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                          >
                            <Info className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium flex items-center gap-2">
                              {cat.nombre}
                              {cat.es_ahorro && (
                                <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Ahorro</span>
                              )}
                            </p>
                            <span className="text-[10px] text-muted-foreground">
                              {cat.patron_esperado}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">C$</span>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={value}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setDistribucion(prev => ({
                                ...prev,
                                [cat.id]: val >= 0 ? val : 0
                              }));
                            }}
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            className="w-24 h-9 px-2 rounded-lg border border-border/60 bg-background text-right text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEliminarProposito(cat.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg ml-1"
                            title="Ocultar este propósito"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Botón Añadir Propósito */}
                <div className="pt-2 border-t border-border/40">
                  <Dialog open={openNuevoProp} onOpenChange={setOpenNuevoProp}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full h-11 border-dashed border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/50 gap-2">
                        <Plus className="h-4 w-4" /> Añadir Nuevo Propósito (Ej: Gym)
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-panel border-border/40 rounded-2xl max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Nuevo Propósito</DialogTitle>
                        <DialogDescription className="text-xs">
                          Crea un nuevo sobre para planificar tu dinero (Ej. Mensualidad Gym, Salidas).
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCrearProposito} className="space-y-4 pt-4">
                        <div className="space-y-1.5">
                          <Label>Nombre del propósito</Label>
                          <Input
                            required
                            placeholder="Ej. Gimnasio"
                            value={nuevoPropNombre}
                            onChange={(e) => setNuevoPropNombre(e.target.value)}
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Tipo de Sobres / Propósito</Label>
                          <select
                            value={nuevoPropTipoCat}
                            onChange={(e) => setNuevoPropTipoCat(e.target.value as TipoCategoriaProposito)}
                            className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary font-medium"
                          >
                            <option value="COMPROMISO">📌 Compromiso Obligatorio (Cuota Carro, Alquiler)</option>
                            <option value="FONDO_CONSUMO">⛽ Fondo de Consumo (Gasolina, Súper, Misceláneos)</option>
                            <option value="AHORRO">🏦 Fondo de Ahorro (Emergencias, Metas)</option>
                          </select>
                        </div>
                        <DialogFooter className="pt-2">
                          <Button type="submit" className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-xl">
                            Crear Propósito
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

              </div>
            )}

            {/* STEP 3: RESUMEN */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl border border-border/40 bg-card space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CheckCircle2 className="w-32 h-32 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Tu Dinero Está Listo
                  </h3>
                  <div className="divide-y divide-border/40 text-sm relative z-10">
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Plan</span>
                      <span className="font-semibold">{esNuevoMes ? nombrePlan : planActivo?.nombre}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Cuenta</span>
                      <span className="font-semibold">{cuentas.find(c => c.id === cuentaId)?.nombre}</span>
                    </div>
                    <div className="flex justify-between py-2.5">
                      <span className="text-muted-foreground">Ingreso Hoy</span>
                      <span className="font-bold text-emerald-400">C$ {totalIngreso.toLocaleString()}</span>
                    </div>
                    {sinAsignar > 0 && (
                      <div className="flex justify-between py-2.5 bg-blue-500/10 px-3 rounded-lg border border-blue-500/20 mt-2">
                        <span className="font-medium text-blue-400">Disponible Global (Sobrante Libre)</span>
                        <span className="font-extrabold text-blue-400">C$ {sinAsignar.toLocaleString()}</span>
                      </div>
                    )}
                    {sinAsignar === 0 && (
                      <div className="flex justify-between py-2.5 bg-emerald-500/10 px-3 rounded-lg border border-emerald-500/20 mt-2">
                        <span className="font-medium text-emerald-400">✓ Presupuesto Base Cero Logrado</span>
                        <span className="font-extrabold text-emerald-400">C$ 0 sin propósito</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3 text-xs text-blue-300">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>
                      <strong>Recuerda:</strong> El dinero que no asignas a ningún sobre pasa a ser tu "Disponible Global". Podrás gastarlo en tu día a día seleccionando "Gasto Libre".
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <div className="border-t border-border/40 px-6 py-4 flex items-center justify-between bg-muted/10">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack} className="rounded-xl gap-2 border-border/60 hover:bg-muted/60">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </Button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <Button onClick={handleNext} disabled={totalIngreso <= 0 || !cuentaId || (esNuevoMes && (!fechaInicio || !fechaFin))} className="rounded-xl gap-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-5">
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="pt-6 flex justify-between">
                <Button variant="outline" onClick={handleBack} disabled={isSubmitting} className="rounded-xl gap-2 border-border/60 hover:bg-muted/60">
                  <ArrowLeft className="h-4 w-4" /> Atrás
                </Button>
                <Button onClick={handleConfirm} disabled={isSubmitting} className="rounded-xl gap-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold px-6">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> ¡Guardar mi Plan!
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
