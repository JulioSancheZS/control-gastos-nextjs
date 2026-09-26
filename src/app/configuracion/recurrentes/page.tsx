"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDataProvider } from "@/hooks/use-data-provider";
import { TransaccionRecurrente, Proposito, Cuenta } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, Plus, Trash2, Power } from "lucide-react";
import { MainLayout } from "@/components/shared/main-layout";

export default function RecurrentesPage() {
  const router = useRouter();
  const provider = useDataProvider();

  const [loading, setLoading] = useState(true);
  const [recurrentes, setRecurrentes] = useState<TransaccionRecurrente[]>([]);
  const [propositos, setPropositos] = useState<Proposito[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);

  // Form
  const [openModal, setOpenModal] = useState(false);
  const [propositoId, setPropositoId] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [monto, setMonto] = useState("");
  const [diaDelMes, setDiaDelMes] = useState("1");
  const [descripcion, setDescripcion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const recs = await provider.getTransaccionesRecurrentes();
      const props = await provider.getPropositos();
      const ctas = await provider.getCuentas();
      
      setRecurrentes(recs);
      setPropositos(props);
      setCuentas(ctas);

      if (ctas.length > 0) setCuentaId(ctas[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [provider]);

  const handleCreate = async () => {
    if (!propositoId || !cuentaId || !monto || !diaDelMes) return;
    setIsSubmitting(true);
    try {
      await provider.crearTransaccionRecurrente({
        proposito_id: propositoId,
        cuenta_id: cuentaId,
        monto: Number(monto),
        dia_del_mes: Number(diaDelMes),
        descripcion,
        activa: true
      });
      setOpenModal(false);
      setPropositoId("");
      setMonto("");
      setDescripcion("");
      setDiaDelMes("1");
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Error al crear la transacción recurrente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, activaActual: boolean) => {
    try {
      await provider.actualizarTransaccionRecurrente(id, { activa: !activaActual });
      await loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta transacción recurrente?")) return;
    try {
      await provider.eliminarTransaccionRecurrente(id);
      await loadData();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <MainLayout>
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Transacciones Recurrentes</h1>
          <p className="text-slate-500">Automatiza tus pagos fijos mensuales</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" /> Nueva Recurrencia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Automatizar Pago Fijo</DialogTitle>
              <DialogDescription>Configura un gasto para que el sistema te recuerde registrarlo cada mes.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Propósito / Categoría</Label>
                <Select value={propositoId} onValueChange={setPropositoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el propósito" />
                  </SelectTrigger>
                  <SelectContent>
                    {propositos.filter(p => p.activa).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto Estimado</Label>
                  <Input type="number" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Día del mes (1-31)</Label>
                  <Input type="number" min="1" max="31" value={diaDelMes} onChange={e => setDiaDelMes(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción (Opcional)</Label>
                <Input placeholder="Ej. Pago de Internet Claro" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
              </div>
              
              <div className="space-y-2">
                <Label>Cuenta de Cobro por defecto</Label>
                <Select value={cuentaId} onValueChange={setCuentaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {cuentas.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={isSubmitting || !propositoId || !monto} className="w-full">
              Guardar Configuración
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando...</div>
      ) : recurrentes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-slate-300 mb-4" />
            <p className="text-slate-500">No tienes transacciones recurrentes configuradas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recurrentes.map(r => {
            const prop = propositos.find(p => p.id === r.proposito_id);
            const cta = cuentas.find(c => c.id === r.cuenta_id);
            return (
              <Card key={r.id} className={!r.activa ? "opacity-60 bg-slate-50 dark:bg-slate-900/50" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                      <span className="font-bold text-lg">{r.dia_del_mes}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1">{prop?.nombre || 'General'}</h3>
                      <p className="text-xs text-slate-500">{r.descripcion || 'Sin descripción'}</p>
                      <p className="text-xs text-slate-400 mt-1">{cta?.nombre} • C$ {r.monto.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleToggle(r.id, r.activa)}
                      title={r.activa ? "Pausar recurrencia" : "Activar recurrencia"}
                    >
                      <Power className={`h-4 w-4 ${r.activa ? "text-emerald-500" : "text-slate-400"}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </MainLayout>
  );
}
