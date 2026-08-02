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
import { cn } from "@/lib/utils";

export function TrackerDashboard() {
  const provider = useDataProvider();
  
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [propositos, setPropositos] = useState<Proposito[]>([]);
  
  // KPIs
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);
  const [balanceNeto, setBalanceNeto] = useState(0);

  // Form states
  const [openModal, setOpenModal] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<"INGRESO" | "GASTO" | "AHORRO">("GASTO");
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaMovimiento, setFechaMovimiento] = useState(new Date().toISOString().split("T")[0]);
  const [cuentaId, setCuentaId] = useState("");

  const loadData = async () => {
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
    if (accounts.length > 0 && !cuentaId) setCuentaId(accounts[0].id);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const handleGuardarMovimiento = async () => {
    if (!monto || parseFloat(monto) <= 0 || !descripcion || !cuentaId) {
      alert("Por favor completa los campos requeridos.");
      return;
    }

    try {
      if (tipoMovimiento === "INGRESO") {
        await provider.registrarIngreso({
          cuenta_id: cuentaId,
          monto: parseFloat(monto),
          descripcion,
          fecha: fechaMovimiento,
          fuente: descripcion,
        });
      } else {
        // GASTO o AHORRO
        await provider.registrarGasto({
          cuenta_id: cuentaId,
          monto: parseFloat(monto),
          descripcion,
          fecha: fechaMovimiento,
          proposito_id: tipoMovimiento === "AHORRO" ? "AHORRO_TRACKER" : undefined,
        });
      }
      
      setOpenModal(false);
      setMonto("");
      setDescripcion("");
      setTipoMovimiento("GASTO");
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
            <div className="space-y-4 py-4">
              
              <div className="grid grid-cols-3 gap-2 p-1 bg-muted/30 rounded-lg">
                <button
                  onClick={() => setTipoMovimiento("INGRESO")}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all",
                    tipoMovimiento === "INGRESO" ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  Ingreso
                </button>
                <button
                  onClick={() => setTipoMovimiento("GASTO")}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all",
                    tipoMovimiento === "GASTO" ? "bg-rose-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  Gasto
                </button>
                <button
                  onClick={() => setTipoMovimiento("AHORRO")}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all",
                    tipoMovimiento === "AHORRO" ? "bg-yellow-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  Ahorro
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del Movimiento</label>
                <input
                  type="text"
                  placeholder="Ej: Salario, Alquiler, Servicios"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Monto (C$)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha Movimiento</label>
                  <input
                    type="date"
                    value={fechaMovimiento}
                    onChange={(e) => setFechaMovimiento(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              {cuentas.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cuenta</label>
                  <select
                    value={cuentaId}
                    onChange={(e) => setCuentaId(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {cuentas.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} (C$ {c.saldo_inicial})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Frecuencia (Solo visual según recomendación de Blazor) */}
              <div className="space-y-2 opacity-50 cursor-not-allowed">
                <label className="text-sm font-medium">Frecuencia</label>
                <select disabled className="w-full px-3 py-2 bg-background border border-border/60 rounded-md">
                  <option>Único (No recurrente)</option>
                  <option>Semanal</option>
                  <option>Quincenal</option>
                  <option>Mensual</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">La recurrencia estará disponible pronto.</p>
              </div>

            </div>
            <DialogFooter>
              <button 
                onClick={() => setOpenModal(false)}
                className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardarMovimiento}
                className="px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
              >
                Agregar Movimiento
              </button>
            </DialogFooter>
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
