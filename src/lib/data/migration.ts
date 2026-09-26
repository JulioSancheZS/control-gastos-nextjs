import { LocalProvider } from "./local-provider";
import { supabase } from "../supabase-client";
import { Cuenta, PlanFinanciero, Proposito, Movimiento, Asignacion } from "@/types";

/**
 * Migrates data from LocalStorage to Supabase for a newly registered user.
 */
export async function migrateLocalDataToCloud(userId: string, onProgress?: (msg: string) => void) {
  try {
    const local = new LocalProvider();
    
    // 1. Obtener datos locales
    if (onProgress) onProgress("Leyendo datos locales...");
    const cuentas = await local.getCuentas();
    const propositos = await local.getPropositos();
    const planes = await local.getHistoricoPlanes();
    // Para asignaciones, localProvider.getStore es sincrono, pero podemos leer todo de localStorage directamente.
    // Usamos el acceso directo por si acaso.
    const asignacionesStr = localStorage.getItem('asignaciones');
    const movimientosStr = localStorage.getItem('movimientos');
    const perfilStr = localStorage.getItem('perfil_usuario');
    
    const asignaciones: Asignacion[] = asignacionesStr ? JSON.parse(asignacionesStr) : [];
    const movimientos: Movimiento[] = movimientosStr ? JSON.parse(movimientosStr) : [];
    const perfilLocal = perfilStr ? JSON.parse(perfilStr) : null;

    if (cuentas.length === 0 && planes.length === 0 && movimientos.length === 0 && propositos.length === 0) {
      if (onProgress) onProgress("No hay datos locales para migrar.");
      return true; // Nada que migrar
    }

    if (onProgress) onProgress("Sincronizando perfil...");
    if (perfilLocal && perfilLocal.tipo_perfil) {
      const { error } = await supabase.from('perfiles_usuario')
        .update({ tipo_perfil: perfilLocal.tipo_perfil })
        .eq('id', userId);
      if (error) console.error("Error actualizando perfil (se ignora para no bloquear):", error.message);
    }

    if (onProgress) onProgress("Sincronizando cuentas...");
    if (cuentas.length > 0) {
      const cuentasAInsertar = cuentas.map(c => ({
        id: c.id,
        user_id: userId,
        nombre: c.nombre,
        tipo: c.tipo,
        saldo_inicial: c.saldo_inicial,
        created_at: c.created_at
      }));
      const { error } = await supabase.from('cuentas').insert(cuentasAInsertar);
      if (error) throw new Error(`Error en cuentas: ${error.message}`);
    }

    if (onProgress) onProgress("Sincronizando planes...");
    if (planes.length > 0) {
      const planesAInsertar = planes.map(p => ({
        id: p.id,
        user_id: userId,
        nombre: p.nombre,
        fecha_inicio: p.fecha_inicio,
        fecha_fin: p.fecha_fin,
        ingreso_total: 0,
        estado: p.estado,
        created_at: p.created_at
      }));
      const { error } = await supabase.from('planes_financieros').insert(planesAInsertar);
      if (error) throw new Error(`Error en planes: ${error.message}`);
    }

    if (onProgress) onProgress("Sincronizando propósitos...");
    if (propositos.length > 0) {
      const propAInsertar = propositos.map(p => ({
        id: p.id,
        user_id: userId,
        nombre: p.nombre,
        color: p.color,
        icono: p.icono,
        activa: p.activa,
        patron_esperado: p.patron_esperado,
        es_ahorro: p.es_ahorro,
        tipo_categoria: p.tipo_categoria,
        created_at: p.created_at
      }));
      const { error } = await supabase.from('propositos').insert(propAInsertar);
      if (error) throw new Error(`Error en propositos: ${error.message}`);
    }

    if (onProgress) onProgress("Sincronizando sobres...");
    if (asignaciones.length > 0) {
      const asigAInsertar = asignaciones.map(a => ({
        id: a.id,
        user_id: userId,
        plan_id: a.plan_id,
        proposito_id: a.proposito_id,
        monto_asignado: a.monto_asignado,
        monto_rollover: a.monto_rollover || 0,
        created_at: a.created_at
      }));
      const { error } = await supabase.from('asignaciones').insert(asigAInsertar);
      if (error) throw new Error(`Error en asignaciones: ${error.message}`);
    }

    if (onProgress) onProgress("Sincronizando movimientos...");
    if (movimientos.length > 0) {
      const movsAInsertar = movimientos.map(m => ({
        id: m.id,
        user_id: userId,
        cuenta_id: m.cuenta_id,
        proposito_id: m.proposito_id,
        asignacion_id: m.asignacion_id,
        plan_id: m.plan_id,
        tipo: m.tipo,
        monto: m.monto,
        fecha: m.fecha,
        descripcion: m.descripcion,
        fuente: m.fuente,
        created_at: m.created_at || new Date().toISOString()
      }));
      
      // Batch insert para evitar limites (en Supabase el limite default es muy alto, pero por si acaso partimos en chunks de 500)
      const chunkSize = 500;
      for (let i = 0; i < movsAInsertar.length; i += chunkSize) {
        const chunk = movsAInsertar.slice(i, i + chunkSize);
        const { error } = await supabase.from('movimientos').insert(chunk);
        if (error) throw new Error(`Error en movimientos: ${error.message}`);
      }
    }

    if (onProgress) onProgress("¡Migración completada! Limpiando datos locales...");
    // Borramos los datos locales
    localStorage.removeItem('cuentas');
    localStorage.removeItem('propositos');
    localStorage.removeItem('planes');
    localStorage.removeItem('movimientos');
    localStorage.removeItem('asignaciones');
    localStorage.removeItem('perfil_usuario');
    localStorage.removeItem('session_user');
    // Forzamos flag de migracion hecha por si acaso
    localStorage.setItem('control-gastos-migrated', 'true');

    return true;
  } catch (err: any) {
    console.error("Migración falló:", err);
    throw new Error(err.message || "Error al migrar datos");
  }
}
