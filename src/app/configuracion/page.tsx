"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Calendar, Info, WalletCards, FolderOpen, Plus, Trash2, Edit } from "lucide-react";
import { useDataProvider } from "@/hooks/use-data-provider";
import { MainLayout } from "@/components/shared/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { PerfilUsuario, Cuenta, Proposito, TipoCuenta, TipoCategoriaProposito, PatronProposito } from "@/types";
import { cn } from "@/lib/utils";

const DIAS_DEL_MES = Array.from({ length: 30 }, (_, i) => i + 1);

export default function ConfiguracionPage() {
  const provider = useDataProvider();
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "cuentas" | "propositos">("general");

  // General State
  const [d1, setD1] = useState(10);
  const [d2, setD2] = useState(25);
  const [metaAhorro, setMetaAhorro] = useState(8000);
  const [guardado, setGuardado] = useState(false);

  // Cuentas State
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [openCuenta, setOpenCuenta] = useState(false);
  const [nuevaCuenta, setNuevaCuenta] = useState({ nombre: "", tipo: "EFECTIVO" as TipoCuenta, saldo_inicial: 0 });

  // Propositos State
  const [propositos, setPropositos] = useState<Proposito[]>([]);
  const [openProposito, setOpenProposito] = useState(false);
  const [editingProposito, setEditingProposito] = useState<string | null>(null);
  const [nuevoProposito, setNuevoProposito] = useState({ 
    nombre: "", 
    icono: "📦",
    es_ahorro: false,
    tipo_categoria: "FONDO_CONSUMO" as TipoCategoriaProposito,
    patron_esperado: "VARIABLE" as PatronProposito
  });

  const loadData = async () => {
    try {
      const saved = await provider.getPerfil();
      if (saved) {
        setPerfil(saved);
        setD1(saved.dia_corte_1 ?? 10);
        setD2(saved.dia_corte_2 ?? 25);
        setMetaAhorro(saved.meta_ahorro_mensual ?? 8000);
      }
      setCuentas(await provider.getCuentas());
      setPropositos(await provider.getPropositos());
    } catch (e) {
      console.error("Error cargando configuración", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [provider]);

  // --- HANDLERS GENERAL ---
  const handleGuardarGeneral = async () => {
    if (d1 === d2 || !perfil) return;
    try {
      const actualizado: PerfilUsuario = { ...perfil, dia_corte_1: d1, dia_corte_2: d2, meta_ahorro_mensual: metaAhorro };
      await provider.actualizarPerfil(actualizado);
      setPerfil(actualizado);
      setGuardado(true);
      setTimeout(() => setGuardado(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // --- HANDLERS CUENTAS ---
  const handleGuardarCuenta = async () => {
    try {
      await provider.crearCuenta({
        nombre: nuevaCuenta.nombre,
        tipo: nuevaCuenta.tipo,
        saldo_inicial: nuevaCuenta.saldo_inicial
      });
      setOpenCuenta(false);
      setNuevaCuenta({ nombre: "", tipo: "EFECTIVO", saldo_inicial: 0 });
      setCuentas(await provider.getCuentas());
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleEliminarCuenta = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta cuenta?")) return;
    try {
      await provider.eliminarCuenta(id);
      setCuentas(await provider.getCuentas());
    } catch (e: any) {
      alert(e.message);
    }
  };

  // --- HANDLERS PROPOSITOS ---
  const handleAbrirProposito = (p?: Proposito) => {
    if (p) {
      setEditingProposito(p.id);
      setNuevoProposito({
        nombre: p.nombre,
        icono: p.icono || "📦",
        es_ahorro: p.es_ahorro || false,
        tipo_categoria: p.tipo_categoria || "FONDO_CONSUMO",
        patron_esperado: p.patron_esperado || "VARIABLE"
      });
    } else {
      setEditingProposito(null);
      setNuevoProposito({
        nombre: "",
        icono: "📦",
        es_ahorro: false,
        tipo_categoria: "FONDO_CONSUMO",
        patron_esperado: "VARIABLE"
      });
    }
    setOpenProposito(true);
  };

  const handleGuardarProposito = async () => {
    try {
      if (editingProposito) {
        await provider.actualizarProposito(editingProposito, {
          nombre: nuevoProposito.nombre,
          icono: nuevoProposito.icono,
          es_ahorro: nuevoProposito.es_ahorro,
          tipo_categoria: nuevoProposito.tipo_categoria,
          patron_esperado: nuevoProposito.patron_esperado
        });
      } else {
        await provider.crearProposito({
          nombre: nuevoProposito.nombre,
          icono: nuevoProposito.icono,
          es_ahorro: nuevoProposito.es_ahorro,
          tipo_categoria: nuevoProposito.tipo_categoria,
          patron_esperado: nuevoProposito.patron_esperado,
          activa: true
        });
      }
      setOpenProposito(false);
      setPropositos(await provider.getPropositos());
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleEliminarProposito = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este propósito/sobre?")) return;
    try {
      await provider.eliminarProposito(id);
      setPropositos(await provider.getPropositos());
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-500" />
            Configuración
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra tus preferencias, cuentas y categorías.
          </p>
        </div>

        {/* Tabs Menu */}
        <div className="flex space-x-1 p-1 bg-muted/30 rounded-xl overflow-x-auto">
          <button 
            onClick={() => setActiveTab("general")}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all", activeTab === "general" ? "bg-white dark:bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
          >
            <Settings className="h-4 w-4" /> General
          </button>
          <button 
            onClick={() => setActiveTab("cuentas")}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all", activeTab === "cuentas" ? "bg-white dark:bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
          >
            <WalletCards className="h-4 w-4" /> Cuentas
          </button>
          <button 
            onClick={() => setActiveTab("propositos")}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all", activeTab === "propositos" ? "bg-white dark:bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}
          >
            <FolderOpen className="h-4 w-4" /> Sobres
          </button>
          <a 
            href="/configuracion/recurrentes"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm transition-all text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Calendar className="h-4 w-4" /> Recurrentes
          </a>
        </div>

        {/* Tab Content: General */}
        {activeTab === "general" && (
          <Card className="glass-panel border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                Ciclo Quincenal
              </CardTitle>
              <CardDescription>
                Define los días en los que usualmente recibes tus ingresos principales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-2">
                  <Label>Primera Quincena (Día)</Label>
                  <select 
                    value={d1} 
                    onChange={e => setD1(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {DIAS_DEL_MES.map(d => (
                      <option key={`d1-${d}`} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Segunda Quincena (Día)</Label>
                  <select 
                    value={d2} 
                    onChange={e => setD2(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {DIAS_DEL_MES.map(d => (
                      <option key={`d2-${d}`} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {d1 === d2 && (
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-md flex items-start gap-2 text-sm">
                  <Info className="h-5 w-5 shrink-0" />
                  <p>Los días de corte no pueden ser el mismo día.</p>
                </div>
              )}

              <Button 
                onClick={handleGuardarGeneral} 
                disabled={d1 === d2} 
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
              >
                {guardado ? <span className="flex items-center gap-2"><Save className="h-4 w-4" /> ¡Guardado!</span> : "Guardar Cambios"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Tab Content: Cuentas */}
        {activeTab === "cuentas" && (
          <Card className="glass-panel border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mis Cuentas</CardTitle>
                <CardDescription>Cuentas bancarias, billeteras o efectivo.</CardDescription>
              </div>
              <Dialog open={openCuenta} onOpenChange={setOpenCuenta}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white"><Plus className="mr-2 h-4 w-4"/> Nueva Cuenta</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva Cuenta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nombre de la Cuenta</Label>
                      <Input value={nuevaCuenta.nombre} onChange={e => setNuevaCuenta({...nuevaCuenta, nombre: e.target.value})} placeholder="Ej. Tarjeta BAC" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <select 
                        value={nuevaCuenta.tipo} 
                        onChange={e => setNuevaCuenta({...nuevaCuenta, tipo: e.target.value as TipoCuenta})}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="EFECTIVO">Efectivo / Billetera</option>
                        <option value="BANCO">Cuenta Bancaria</option>
                        <option value="TARJETA_CREDITO">Tarjeta de Crédito</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Saldo Inicial</Label>
                      <Input type="number" value={nuevaCuenta.saldo_inicial} onChange={e => setNuevaCuenta({...nuevaCuenta, saldo_inicial: Number(e.target.value)})} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleGuardarCuenta} className="bg-emerald-600 hover:bg-emerald-700 text-white">Guardar Cuenta</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cuentas.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50 hover:bg-accent transition-colors">
                    <div className="flex flex-col">
                      <span className="font-semibold">{c.nombre}</span>
                      <span className="text-xs text-muted-foreground">{c.tipo}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEliminarCuenta(c.id)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab Content: Propositos */}
        {activeTab === "propositos" && (
          <Card className="glass-panel border-border/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mis Propósitos (Sobres)</CardTitle>
                <CardDescription>Categorías de gastos, ahorros y metas.</CardDescription>
              </div>
              <Button onClick={() => handleAbrirProposito()} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="mr-2 h-4 w-4"/> Nuevo Propósito</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {propositos.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/50 hover:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.icono}</span>
                      <div className="flex flex-col">
                        <span className="font-semibold flex items-center gap-2">
                          {p.nombre}
                          {p.es_ahorro && <span className="bg-emerald-500/20 text-emerald-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Ahorro</span>}
                        </span>
                        <span className="text-xs text-muted-foreground">{p.tipo_categoria} • {p.patron_esperado}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleAbrirProposito(p)}>
                        <Edit className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEliminarProposito(p.id)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={openProposito} onOpenChange={setOpenProposito}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProposito ? "Editar Propósito" : "Nuevo Propósito"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-[3rem_1fr] gap-3">
                <div className="space-y-2">
                  <Label>Icono</Label>
                  <Input value={nuevoProposito.icono} onChange={e => setNuevoProposito({...nuevoProposito, icono: e.target.value})} className="text-center text-xl p-0" />
                </div>
                <div className="space-y-2">
                  <Label>Nombre del Propósito</Label>
                  <Input value={nuevoProposito.nombre} onChange={e => setNuevoProposito({...nuevoProposito, nombre: e.target.value})} placeholder="Ej. Supermercado" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Categoría</Label>
                <select 
                  value={nuevoProposito.tipo_categoria} 
                  onChange={e => setNuevoProposito({...nuevoProposito, tipo_categoria: e.target.value as TipoCategoriaProposito})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="COMPROMISO">Compromiso / Deuda (Prioridad Alta)</option>
                  <option value="FONDO_CONSUMO">Fondo de Consumo Diario (Variable)</option>
                  <option value="AHORRO">Fondo de Ahorro / Inversión</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Patrón Esperado</Label>
                <select 
                  value={nuevoProposito.patron_esperado} 
                  onChange={e => setNuevoProposito({...nuevoProposito, patron_esperado: e.target.value as PatronProposito})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="FIJO">Fijo (Monto exacto mensual)</option>
                  <option value="VARIABLE">Variable (Cambia cada mes)</option>
                  <option value="OCASIONAL">Ocasional (Pocas veces al año)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                <input 
                  type="checkbox" 
                  id="es_ahorro" 
                  checked={nuevoProposito.es_ahorro} 
                  onChange={e => setNuevoProposito({...nuevoProposito, es_ahorro: e.target.checked})}
                  className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <div className="flex flex-col">
                  <Label htmlFor="es_ahorro" className="font-bold text-sm cursor-pointer">¿Es un fondo de ahorro?</Label>
                  <span className="text-xs text-muted-foreground">El dinero asignado o trasladado aquí se reportará como "Ahorrado" en tu historial, no como gastado.</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGuardarProposito} className="bg-blue-600 hover:bg-blue-700 text-white">
                {editingProposito ? "Actualizar Propósito" : "Crear Propósito"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </MainLayout>
  );
}
