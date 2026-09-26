"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Check,
  TrendingUp,
  Smartphone,
  Globe,
  Wifi,
  Car,
  Fuel,
  Utensils,
  ShoppingBag,
  Sparkles,
  Wallet,
  AlertCircle,
  Banknote,
  CircleDollarSign,
  BarChart3,
  Info,
  CreditCard,
  Loader2
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { useDataProvider } from "@/hooks/use-data-provider";

const gastoSchema = z.object({
  asignacionId: z.string(),
  monto: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  fechaGasto: z.date(),
  cuentaId: z.string().min(1, "Selecciona una cuenta"),
  descripcion: z.string().optional(),
});
import { MainLayout } from "@/components/shared/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  PlanFinanciero,
  ResumenKPIs,
  Proposito,
  Movimiento,
  Cuenta,
  Asignacion
} from "@/types";

type AsignacionPendiente = Asignacion & {
  proposito: Proposito;
  gastado: number;
  disponible: number;
};

export function PlanificadorDashboard() {
  const router = useRouter();
  const provider = useDataProvider();
  
  const [perfil, setPerfil] = useState<any>(null);
  const [planActivo, setPlanActivo] = useState<PlanFinanciero | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [kpis, setKpis] = useState<ResumenKPIs | null>(null);
  const [asignacionesPendientes, setAsignacionesPendientes] = useState<AsignacionPendiente[]>([]);
  const [propositos, setPropositos] = useState<Proposito[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLocalUser, setIsLocalUser] = useState(false);
  
  const [payingId, setPayingId] = useState<string | null>(null);

  // Modal de gasto
  const [openGasto, setOpenGasto] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(gastoSchema),
    defaultValues: {
      asignacionId: "LIBRE",
      monto: 0,
      fechaGasto: new Date(),
      cuentaId: "",
      descripcion: "",
    },
  });

  useEffect(() => {
    async function load() {
      try {
        const activo = await provider.getPlanActivo();
        if (!activo) {
          router.push("/planificacion");
          return;
        }
        setPlanActivo(activo);
        
        const currentUser = await provider.getUser();
        setIsLocalUser(currentUser?.id === "local-user");

        const dataCuentas = await provider.getCuentas();
        setCuentas(dataCuentas);
        if (dataCuentas.length > 0 && !form.getValues("cuentaId")) {
          form.setValue("cuentaId", dataCuentas[0].id);
        }

        const dataKPIs = await provider.getResumenKPIs(activo.id);
        setKpis(dataKPIs);

        const dataPropositos = await provider.getPropositos();
        setPropositos(dataPropositos);

        const asigs = await provider.getAsignaciones(activo.id);
        const pendientes = await Promise.all(
          asigs.map(async (a) => {
            const disp = await provider.getDisponiblePorAsignacion(a.id);
            const prop = dataPropositos.find(p => p.id === a.proposito_id);
            return {
              ...a,
              proposito: prop!,
              gastado: disp.gastado,
              disponible: disp.disponible
            };
          })
        );
        setAsignacionesPendientes(pendientes.sort((a,b) => b.disponible - a.disponible));

        const dataMovimientos = await provider.getMovimientos(activo.id);
        setMovimientos(dataMovimientos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (e) {
        console.error("Error cargando dashboard", e);
      } finally {
        setLoading(false);
        setPayingId(null);
      }
    }
    load();
  }, [provider, router, refreshTrigger]);

  const getIcono = (nombre: string) => {
    const l = nombre.toLowerCase();
    if (l.includes("usd") || l.includes("ahorro")) return <TrendingUp className="h-4.5 w-4.5" />;
    if (l.includes("miscel")) return <Sparkles className="h-4.5 w-4.5" />;
    if (l.includes("teléfono") || l.includes("celular")) return <Smartphone className="h-4.5 w-4.5" />;
    if (l.includes("internet") || l.includes("cable")) return <Globe className="h-4.5 w-4.5" />;
    if (l.includes("datos")) return <Wifi className="h-4.5 w-4.5" />;
    if (l.includes("carro") || l.includes("auto")) return <Car className="h-4.5 w-4.5" />;
    if (l.includes("gasolina") || l.includes("combustible")) return <Fuel className="h-4.5 w-4.5" />;
    if (l.includes("comida") || l.includes("super")) return <Utensils className="h-4.5 w-4.5" />;
    if (l.includes("libre") || l.includes("personal")) return <ShoppingBag className="h-4.5 w-4.5" />;
    return <CircleDollarSign className="h-4.5 w-4.5" />;
  };

  const onSubmitGasto = async (values: z.infer<typeof gastoSchema>) => {
    if (!planActivo) return;

    try {
      const isLibre = values.asignacionId === "LIBRE";
      const asig = isLibre ? null : asignacionesPendientes.find(a => a.id === values.asignacionId);
      
      const fechaStr = values.fechaGasto.toISOString().split("T")[0];

      await provider.registrarGasto({
        cuenta_id: values.cuentaId,
        monto: values.monto,
        fecha: fechaStr,
        descripcion: values.descripcion || undefined,
        asignacion_id: asig?.id,
        proposito_id: asig?.proposito_id,
        plan_id: planActivo.id
      });
      
      form.reset();
      form.setValue("cuentaId", cuentas.length > 0 ? cuentas[0].id : "");
      setOpenGasto(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      console.error(e);
    }
  };



  const handlePagarRapido = async (asig: AsignacionPendiente) => {
    if (!planActivo || asig.disponible <= 0) return;
    setPayingId(asig.id);
    try {
      await provider.registrarGasto({
        cuenta_id: form.getValues("cuentaId") || cuentas[0]?.id,
        monto: asig.disponible,
        fecha: new Date().toISOString().split("T")[0],
        descripcion: `Pago de ${asig.proposito.nombre}`,
        asignacion_id: asig.id,
        proposito_id: asig.proposito_id,
        plan_id: planActivo.id
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      console.error(e);
      setPayingId(null); // Solo limpiar si falla, si triunfa se limpia en load()
    }
  };

  const handleEliminarMovimiento = async (id: string) => {
    if (!confirm("¿Eliminar esta transacción?")) return;
    try {
      await provider.eliminarMovimiento(id);
      setRefreshTrigger(prev => prev + 1);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Cargando tablero financiero...</p>
        </div>
      </div>
    );
  }

  if (!planActivo || !kpis) return null;

  const hoyStr = new Date().toISOString().split("T")[0];
  const esPlanVencido = planActivo.fecha_fin ? planActivo.fecha_fin < hoyStr : false;

  const sobresCompromisos = asignacionesPendientes.filter(a => a.proposito.tipo_categoria === "COMPROMISO" || (!a.proposito.tipo_categoria && !a.proposito.es_ahorro && a.proposito.patron_esperado === "FIJO"));
  const sobresFondosConsumo = asignacionesPendientes.filter(a => a.proposito.tipo_categoria === "FONDO_CONSUMO" || (!a.proposito.tipo_categoria && !a.proposito.es_ahorro && a.proposito.patron_esperado !== "FIJO"));
  const sobresAhorro = asignacionesPendientes.filter(a => a.proposito.tipo_categoria === "AHORRO" || (!a.proposito.tipo_categoria && a.proposito.es_ahorro));

  return (
    <MainLayout>
      {isLocalUser && (
        <div className="mb-6 p-5 rounded-3xl border border-white/10 bg-gradient-to-r from-blue-600 to-indigo-600 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-500/20 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 backdrop-blur-md">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white tracking-wide">Modo de Prueba Activo</h4>
              <p className="text-sm text-blue-100/90 mt-1 max-w-xl leading-relaxed">
                Estás probando el Planificador Avanzado en tu dispositivo. Crea tu cuenta gratis para desbloquear acceso en la nube y asegurar tus planes de forma permanente.
              </p>
            </div>
          </div>
          <Button
            onClick={() => window.location.href = '/auth/registro'}
            className="w-full md:w-auto h-12 px-6 rounded-xl font-bold bg-white text-indigo-600 hover:bg-gray-100 shrink-0 gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            Crear Cuenta Gratis
          </Button>
        </div>
      )}
      {/* Banner de Quincena/Plan Vencido */}
      {esPlanVencido && (
        <div className="mb-6 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex flex-col md:flex-row items-center justify-between gap-4 text-amber-200 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-300">¡Tu Quincena Actual ha Finalizado!</h4>
              <p className="text-xs text-amber-200/80">
                Este plan terminó el {planActivo.fecha_fin}. Inicia tu nuevo ciclo para transferir automáticamente tus saldos acumulados.
              </p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/planificacion")}
            className="w-full md:w-auto h-10 px-4 rounded-xl font-bold bg-amber-500 text-black hover:bg-amber-400 shrink-0 gap-2"
          >
            Iniciar Nuevo Ciclo
          </Button>
        </div>
      )}

      {/* 1. KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Ingreso Total */}
        <Card className="glass-panel border-border/40 rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" /> Ingreso Plan
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-foreground">
              C$ {kpis.ingreso_total.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">
              {planActivo.nombre}
            </p>
          </CardContent>
        </Card>

        {/* KPI: Total Asignado */}
        <Card className="glass-panel border-border/40 rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" /> Asignado a Sobres
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-indigo-400">
              C$ {kpis.total_asignado.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">
              {kpis.ingreso_total > 0 ? ((kpis.total_asignado / kpis.ingreso_total) * 100).toFixed(0) : 0}% del ingreso tiene propósito
            </p>
          </CardContent>
        </Card>

        {/* KPI: Total Gastado */}
        <Card className="glass-panel border-border/40 rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
              <CircleDollarSign className="h-3.5 w-3.5" /> Gastado
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-amber-400">
              C$ {kpis.total_gastado.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[10px] text-muted-foreground">
              Dinero que realmente salió de tus cuentas
            </p>
          </CardContent>
        </Card>

        {/* KPI: Dinero Disponible */}
        <Card className="glass-panel border-border/40 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase text-primary flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Disponible Global
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-primary">
              C$ {Math.max(0, Math.round(kpis.sin_asignar)).toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground">
              Saldo base para gastos libres
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold">
              C$ {Math.round(kpis.sin_asignar / kpis.dias_restantes).toLocaleString()} libres por día
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        
        {/* LADO IZQUIERDO: Sobres Organizados en 3 Secciones */}
        <div className="space-y-6">
          {/* 1. Compromisos Obligatorios */}
          <Card className="glass-panel border-border/40 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                📌 Compromisos Obligatorios
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Cuotas fijas y deudas que se pagan por completo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sobresCompromisos.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">No hay compromisos en esta quincena.</div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                  {sobresCompromisos.map(RenderSobre)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Fondos de Consumo */}
          <Card className="glass-panel border-amber-500/20 rounded-2xl bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-amber-400 flex items-center gap-2">
                ⛽ Fondos de Consumo Diario
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Dinero apartado que vas consumiendo poco a poco (acumulable).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sobresFondosConsumo.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">No hay fondos de consumo creados.</div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                  {sobresFondosConsumo.map(RenderSobre)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Mis Ahorros */}
          <Card className="glass-panel border-blue-500/20 rounded-2xl bg-blue-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-blue-400 flex items-center gap-2">
                🏦 Mis Ahorros y Reservas
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Dinero protegido a largo plazo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sobresAhorro.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-xs">No hay sobres de ahorro en esta quincena.</div>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                  {sobresAhorro.map(RenderSobre)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* LADO DERECHO: Acciones y Movimientos */}
        <div className="space-y-6">
          <Card className="glass-panel border-border/40 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-amber-500" />
                Registrar Movimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                
                {/* Registrar Gasto */}
                <Dialog open={openGasto} onOpenChange={setOpenGasto}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-white gap-2 shadow-sm">
                      <Plus className="h-5 w-5" /> Registrar Gasto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="glass-panel border-border/40 max-w-sm rounded-2xl bg-card text-foreground">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold">Registrar Gasto</DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground">
                        Elige de dónde saldrá el dinero.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmitGasto)} className="space-y-4 pt-2">
                        
                        <FormField
                          control={form.control}
                          name="asignacionId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>¿De qué asignación/propósito sale?</FormLabel>
                              <FormControl>
                                <select
                                  value={field.value}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    field.onChange(val);
                                    if (val !== "LIBRE") {
                                      const asig = asignacionesPendientes.find(a => a.id === val);
                                      if (asig && (asig.proposito.tipo_categoria === 'COMPROMISO' || (!asig.proposito.tipo_categoria && !asig.proposito.es_ahorro && asig.proposito.patron_esperado === 'FIJO'))) {
                                        if (!form.getValues("monto")) {
                                          form.setValue("monto", asig.disponible);
                                        }
                                      } else if (!form.getValues("monto")) {
                                        form.setValue("monto", 0);
                                      }
                                    }
                                  }}
                                  className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-semibold"
                                >
                                  <option value="LIBRE" className="text-emerald-500 font-bold">Libre (Restar del Disponible Global)</option>
                                  
                                  {sobresCompromisos.length > 0 && (
                                    <optgroup label="📌 Compromisos Obligatorios">
                                      {sobresCompromisos.map((a) => {
                                        const isCero = a.disponible <= 0;
                                        return (
                                          <option key={a.id} value={a.id} disabled={isCero}>
                                            {a.proposito.nombre} (Disp: C$ {a.disponible}){isCero ? " - Agotado" : ""}
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  )}

                                  {sobresFondosConsumo.length > 0 && (
                                    <optgroup label="⛽ Fondos de Consumo Diario">
                                      {sobresFondosConsumo.map((a) => {
                                        const isCero = a.disponible <= 0;
                                        return (
                                          <option key={a.id} value={a.id} disabled={isCero}>
                                            {a.proposito.nombre} (Disp: C$ {a.disponible}){isCero ? " - Agotado" : ""}
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  )}

                                  {sobresAhorro.length > 0 && (
                                    <optgroup label="🏦 Mis Ahorros y Reservas">
                                      {sobresAhorro.map((a) => {
                                        const isCero = a.disponible <= 0;
                                        return (
                                          <option key={a.id} value={a.id} disabled={isCero}>
                                            {a.proposito.nombre} (Disp: C$ {a.disponible}){isCero ? " - Agotado" : ""}
                                          </option>
                                        );
                                      })}
                                    </optgroup>
                                  )}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="monto"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Monto (C$)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  className="h-10 rounded-xl bg-background border-border/60"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fechaGasto"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha del Movimiento</FormLabel>
                              <FormControl>
                                <DatePicker
                                  value={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="cuentaId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>¿De qué cuenta se pagó?</FormLabel>
                              <FormControl>
                                <select
                                  value={field.value}
                                  onChange={field.onChange}
                                  className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500"
                                >
                                  {cuentas.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="descripcion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descripción (Opcional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Ej. Almuerzo, supermercado"
                                  className="h-10 rounded-xl bg-background border-border/60"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <DialogFooter className="pt-2">
                          <Button type="submit" className="w-full h-10 rounded-xl font-bold bg-amber-500 text-white hover:bg-amber-600">
                            Guardar Gasto
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

              </div>
            </CardContent>
          </Card>

          {/* Transacciones recientes */}
          <Card className="glass-panel border-border/40 rounded-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-foreground">
                Movimientos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {movimientos.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs space-y-1.5">
                  <AlertCircle className="h-7 w-7 mx-auto text-muted-foreground/60" />
                  <p>No se han registrado transacciones aún.</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground text-[10px] uppercase font-semibold">
                        <th className="py-2 px-2">Movimiento</th>
                        <th className="py-2 px-2">Cuenta</th>
                        <th className="py-2 px-2 text-right">Monto</th>
                        <th className="py-2 px-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {movimientos.map((mov) => {
                        const cta = cuentas.find(c => c.id === mov.cuenta_id);
                        let nombreProp = "";
                        let color = "#9f9f9f";
                        
                        if (mov.tipo === "INGRESO") {
                          nombreProp = "Ingreso a Plan";
                          color = "#22c55e"; // Emerald
                        } else if (mov.tipo === "TRANSFERENCIA") {
                          nombreProp = "Pago/Transferencia";
                          color = "#6366f1"; // Indigo
                        } else {
                          const asig = asignacionesPendientes.find(a => a.id === mov.asignacion_id);
                          if (asig) {
                            nombreProp = asig.proposito.nombre;
                            color = asig.proposito.color ?? "#9f9f9f";
                          } else {
                            const prop = propositos.find(p => p.id === mov.proposito_id);
                            nombreProp = prop ? prop.nombre : "Gasto Libre";
                            color = prop ? (prop.color ?? color) : "#10b981"; // Emerald green for Libre
                          }
                        }

                        return (
                          <tr key={mov.id} className="hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-2">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                  <span className="font-medium text-[11px]">{nombreProp}</span>
                                </div>
                                <span className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-[150px]">
                                  {mov.descripcion || "Sin descripción"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-[9px] font-semibold text-muted-foreground">
                              {cta?.nombre ?? "—"}
                            </td>
                            <td className={`py-3 px-2 text-right font-bold text-[11px] whitespace-nowrap ${mov.tipo === 'INGRESO' ? 'text-emerald-400' : mov.tipo === 'TRANSFERENCIA' ? 'text-indigo-400' : ''}`}>
                              {mov.tipo === 'INGRESO' ? '+' : mov.tipo === 'TRANSFERENCIA' ? '↔' : '-'} C$ {mov.monto.toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right">
                              {mov.tipo !== "INGRESO" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEliminarMovimiento(mov.id)}
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );

  function RenderSobre(asig: AsignacionPendiente) {
    const totalFondo = asig.monto_asignado + (asig.monto_rollover || 0);
    const porcentaje = totalFondo > 0
      ? Math.round((asig.gastado / totalFondo) * 100)
      : 0;
    const completado = asig.disponible <= 0 && totalFondo > 0;

    return (
      <div
        key={asig.id}
        className={`p-3 rounded-xl border transition-all duration-200 ${
          completado
            ? "bg-muted/10 border-border/20 opacity-60"
            : "bg-card border-border/40 hover:border-border/80"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${asig.proposito.color ?? "#9f9f9f"}15`, color: asig.proposito.color }}
            >
              {getIcono(asig.proposito.nombre)}
            </div>
            <p className="text-sm font-semibold truncate">{asig.proposito.nombre}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <p className="text-sm font-bold text-right">
              {completado ? "C$ 0" : `C$ ${asig.disponible.toLocaleString()}`}
            </p>
            {!completado && !asig.proposito.es_ahorro && (
              <Button
                size="icon"
                variant="outline"
                onClick={() => handlePagarRapido(asig)}
                disabled={payingId === asig.id}
                className="h-7 w-7 rounded-lg border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                title="Pagar todo lo disponible"
              >
                {payingId === asig.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-end mb-1.5">
          <p className="text-[10px] text-muted-foreground">
            {completado ? "Consumido" : `Gastado: C$ ${asig.gastado.toLocaleString()} / C$ ${totalFondo.toLocaleString()}`}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {completado ? "Completado" : (asig.monto_rollover && asig.monto_rollover > 0 ? `Incluye C$ ${asig.monto_rollover.toLocaleString()} rollover` : "Disponible")}
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, porcentaje)}%`,
              backgroundColor: completado ? "#22c55e" : asig.proposito.color ?? "#9f9f9f"
            }}
          />
        </div>
      </div>
    );
  }
}

