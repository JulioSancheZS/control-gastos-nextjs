"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/shared/main-layout";
import { useDataProvider } from "@/hooks/use-data-provider";
import { Movimiento, Cuenta, Proposito } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Plus, ArrowDownCircle, ArrowUpCircle, Wallet, ArrowLeftRight } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

const movimientoSchema = z.object({
  tipoMovimiento: z.enum(["INGRESO", "GASTO", "AHORRO"]),
  descripcion: z.string().min(2, "La descripción es muy corta"),
  monto: z.coerce.number().min(0.01, "El monto debe ser mayor a 0"),
  fechaMovimiento: z.date(),
  cuentaId: z.string().min(1, "Selecciona una cuenta"),
});

export function TrackerDashboard() {
  const provider = useDataProvider();
  
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [propositos, setPropositos] = useState<Proposito[]>([]);
  
  // KPIs
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);
  const [balanceNeto, setBalanceNeto] = useState(0);
  const [isLocalUser, setIsLocalUser] = useState(false);

  const [openModal, setOpenModal] = useState(false);

  const form = useForm<any>({
    resolver: zodResolver(movimientoSchema),
    defaultValues: {
      tipoMovimiento: "GASTO",
      descripcion: "",
      monto: 0,
      fechaMovimiento: new Date(),
      cuentaId: "",
    },
  });

  const loadData = async () => {
    // Check local user for banner rendering
    const u = await provider.getUser();
    setIsLocalUser(u?.id === "local-user");

    // In Tracker mode, we get ALL movements for the current month
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const allMovimientos = await provider.getMovimientos();
    
    // Filter movements of current month
    const monthMovimientos = allMovimientos.filter(m => {
      const date = new Date(m.fecha);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    setMovimientos(monthMovimientos);
    
    let ingresos = 0;
    let gastos = 0;
    
    monthMovimientos.forEach(m => {
      if (m.tipo === "INGRESO") ingresos += m.monto;
      if (m.tipo === "GASTO") gastos += m.monto;
    });

    setTotalIngresos(ingresos);
    setTotalGastos(gastos);
    setBalanceNeto(ingresos - gastos);

    const accounts = await provider.getCuentas();
    setCuentas(accounts);
    if (accounts.length > 0 && !form.getValues("cuentaId")) {
      form.setValue("cuentaId", accounts[0].id);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const onSubmitMovimiento = async (values: z.infer<typeof movimientoSchema>) => {
    try {
      const fechaStr = values.fechaMovimiento.toISOString().split("T")[0];
      if (values.tipoMovimiento === "INGRESO") {
        await provider.registrarIngreso({
          cuenta_id: values.cuentaId,
          monto: values.monto,
          descripcion: values.descripcion,
          fecha: fechaStr,
          fuente: values.descripcion,
        });
      } else {
        await provider.registrarGasto({
          cuenta_id: values.cuentaId,
          monto: values.monto,
          descripcion: values.descripcion,
          fecha: fechaStr,
          proposito_id: values.tipoMovimiento === "AHORRO" ? "AHORRO_TRACKER" : undefined,
        });
      }
      
      setOpenModal(false);
      form.reset();
      loadData();
    } catch (e) {
      console.error(e);
      alert("Error guardando el movimiento.");
    }
  };

  // Datos para gráfico de dona (Ingreso vs Gasto vs Ahorro)
  const totalDonaIngresos = movimientos.filter(m => m.tipo === "INGRESO").reduce((sum, m) => sum + m.monto, 0);
  const totalDonaAhorros = movimientos.filter(m => m.tipo === "GASTO" && m.proposito_id === "AHORRO_TRACKER").reduce((sum, m) => sum + m.monto, 0);
  const totalDonaGastos = movimientos.filter(m => m.tipo === "GASTO" && m.proposito_id !== "AHORRO_TRACKER").reduce((sum, m) => sum + m.monto, 0);

  const dataDona = [
    { name: "Ingresos", value: totalDonaIngresos, color: "#10b981" }, // Emerald (Green)
    { name: "Gastos", value: totalDonaGastos, color: "#f43f5e" },     // Rose (Red)
    { name: "Ahorro", value: totalDonaAhorros, color: "#eab308" }     // Yellow
  ].filter(d => d.value > 0);

  // Datos para gráfico de barras (Día a día del mes actual)
  const movimientosPorDia = movimientos.reduce((acc, m) => {
    const dia = m.fecha.split("-")[2]; // YYYY-MM-DD -> DD
    if (!acc[dia]) acc[dia] = { dia, ingresos: 0, gastos: 0 };
    if (m.tipo === "INGRESO") acc[dia].ingresos += m.monto;
    if (m.tipo === "GASTO") acc[dia].gastos += m.monto;
    return acc;
  }, {} as Record<string, { dia: string, ingresos: number, gastos: number }>);
  
  const dataBarras = Object.values(movimientosPorDia).sort((a, b) => parseInt(a.dia) - parseInt(b.dia));

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Lead Magnet Banner (Tracker Local) */}
        {isLocalUser && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 border border-white/10 rounded-3xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-500/20">
            <div className="flex-1">
              <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                <span className="text-indigo-200">✨</span> Sube de nivel tus finanzas
              </h3>
              <p className="text-blue-100/90 text-sm mt-1 leading-relaxed">
                Actualmente estás en el modo de demostración. <strong>Crea una cuenta gratuita</strong> para respaldar tu información en la nube y desbloquear el poderoso <strong>Planificador Financiero</strong>.
              </p>
            </div>
            <Button onClick={() => window.location.href = '/auth/registro'} className="whitespace-nowrap h-12 px-6 bg-white hover:bg-gray-100 text-indigo-600 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all w-full md:w-auto">
              Crear Cuenta Gratis
            </Button>
          </div>
        )}

        {/* Encabezado y Acción Principal */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Resumen financiero de {new Date().toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          
          <Dialog open={openModal} onOpenChange={setOpenModal}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all">
                <Plus className="mr-2 h-5 w-5" />
                Nuevo Movimiento
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card/95 backdrop-blur-xl border-border/40">
            <DialogHeader>
              <DialogTitle className="text-xl">Nuevo Movimiento Rápido</DialogTitle>
              <DialogDescription>
                Agrega un ingreso, gasto o ahorro a tu presupuesto.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitMovimiento)} className="space-y-4 py-4">
                
                <FormField
                  control={form.control}
                  name="tipoMovimiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-3 gap-2 p-1 bg-muted/30 rounded-lg">
                          <button
                            type="button"
                            onClick={() => field.onChange("INGRESO")}
                            className={cn(
                              "px-4 py-2 rounded-md text-sm font-medium transition-all",
                              field.value === "INGRESO" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            Ingreso
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange("GASTO")}
                            className={cn(
                              "px-4 py-2 rounded-md text-sm font-medium transition-all",
                              field.value === "GASTO" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            Gasto
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange("AHORRO")}
                            className={cn(
                              "px-4 py-2 rounded-md text-sm font-medium transition-all",
                              field.value === "AHORRO" ? "bg-yellow-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            Ahorro
                          </button>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="descripcion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Movimiento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Salario, Alquiler, Servicios"
                          className="bg-background border-border/60"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
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
                            className="bg-background border-border/60"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fechaMovimiento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha Movimiento</FormLabel>
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
                </div>

                {cuentas.length > 0 && (
                  <FormField
                    control={form.control}
                    name="cuentaId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cuenta</FormLabel>
                        <FormControl>
                          <select
                            value={field.value}
                            onChange={field.onChange}
                            className="w-full h-10 px-3 bg-background border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                          >
                            <option value="">Selecciona una cuenta</option>
                            {cuentas.map(c => (
                              <option key={c.id} value={c.id}>{c.nombre} (C$ {c.saldo_inicial})</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="space-y-2 opacity-50 cursor-not-allowed">
                  <Label>Frecuencia</Label>
                  <select disabled className="w-full px-3 py-2 bg-background border border-border/60 rounded-md text-sm">
                    <option>Único (No recurrente)</option>
                    <option>Semanal</option>
                    <option>Quincenal</option>
                    <option>Mensual</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">La recurrencia estará disponible pronto.</p>
                </div>

                <DialogFooter className="mt-6">
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => setOpenModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primary text-primary-foreground shadow hover:bg-primary/90"
                  >
                    Agregar Movimiento
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
          </Dialog>
        </div>

        {/* Tarjetas de KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-panel border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-emerald-500" /> Total Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">C$ {totalIngresos.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card className="glass-panel border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4 text-rose-500" /> Total Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">C$ {totalGastos.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card className={`glass-panel border-border/40 ${balanceNeto >= 0 ? 'ring-1 ring-emerald-500/30' : 'ring-1 ring-rose-500/30'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className={`h-4 w-4 ${balanceNeto >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} /> Balance Neto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balanceNeto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                C$ {balanceNeto.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-panel border-border/40">
            <CardHeader>
              <CardTitle>Flujo del Mes</CardTitle>
              <CardDescription>Ingresos vs Gastos diarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {dataBarras.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataBarras} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="dia" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        formatter={(value: any) => [`C$ ${Number(value).toFixed(2)}`, '']}
                        labelFormatter={(label) => `Día ${label}`}
                      />
                      <Bar dataKey="ingresos" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={20} />
                      <Bar dataKey="gastos" fill="#f43f5e" radius={[2, 2, 0, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No hay datos suficientes
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel border-border/40">
            <CardHeader>
              <CardTitle>Movimientos por Tipo</CardTitle>
              <CardDescription>Distribución de este mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {dataDona.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dataDona} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {dataDona.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                        formatter={(value: any) => [`C$ ${Number(value).toFixed(2)}`, '']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Registra un gasto con categoría para ver el gráfico
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de Movimientos (Simplificada) */}
        <Card className="glass-panel border-border/40">
          <CardHeader>
            <CardTitle>Lista de Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            {movimientos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-20" />
                No hay movimientos este mes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Fecha</th>
                      <th className="px-4 py-3">Descripción</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 text-right rounded-tr-lg">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 10).map((mov) => {
                      const categoria = propositos.find(p => p.id === mov.proposito_id)?.nombre || "-";
                      return (
                        <tr key={mov.id} className="border-b border-border/40 hover:bg-muted/20">
                          <td className="px-4 py-3">{mov.fecha}</td>
                          <td className="px-4 py-3 font-medium">{mov.descripcion || mov.fuente}</td>
                          <td className="px-4 py-3 text-muted-foreground">{categoria}</td>
                          <td className={`px-4 py-3 text-right font-bold ${mov.tipo === 'INGRESO' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {mov.tipo === 'INGRESO' ? '+' : '-'} C$ {mov.monto.toLocaleString()}
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
    </MainLayout>
  );
}
