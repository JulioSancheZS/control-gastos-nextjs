import { DataProvider, PlanificarDatos } from "./types";
import { Cuenta, Movimiento, PerfilUsuario, PlanFinanciero, Proposito, Asignacion, ResumenKPIs } from "@/types";
import { supabase } from "../supabase-client";

export class SupabaseProvider implements DataProvider {
  // --- Auth & Perfil ---
  async login(email: string, pass: string): Promise<{ id: string; email: string; nombre: string }> {
    // Para simplificar, en demo podemos usar signUp si no existe, o signIn
    // Asumiremos un signIn básico por contraseña
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Error de login");
    return { id: data.user.id, email: data.user.email!, nombre: data.user.user_metadata?.nombre || 'Usuario' };
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async getUser(): Promise<{ id: string; email: string; nombre: string } | null> {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    return { id: data.user.id, email: data.user.email!, nombre: data.user.user_metadata?.nombre || 'Usuario' };
  }

  async getPerfil(): Promise<PerfilUsuario | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;
    
    const { data: perfil, error } = await supabase
      .from('perfiles_usuario')
      .select('*')
      .eq('id', user.user.id)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.error(error);
      return null;
    }
    
    return perfil as PerfilUsuario | null;
  }

  async crearPerfil(perfil: Omit<PerfilUsuario, "id" | "created_at">): Promise<PerfilUsuario> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("No hay usuario autenticado");
    
    const newPerfil = {
      id: user.user.id,
      email: user.user.email,
      nombre: perfil.nombre || user.user.user_metadata?.nombre,
      tipo_perfil: perfil.tipo_perfil
    };
    
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .insert(newPerfil)
      .select()
      .single();
      
    if (error) throw new Error(error.message);

    // --- ONBOARDING: Pre-carga Inteligente ---
    // Crear cuentas por defecto
    await supabase.from('cuentas').insert([
      { user_id: user.user.id, nombre: 'Cuenta Principal', tipo: 'BANCO', saldo_inicial: 0 },
      { user_id: user.user.id, nombre: 'Billetera Efectivo', tipo: 'EFECTIVO', saldo_inicial: 0 }
    ]);

    // Crear propósitos por defecto
    await supabase.from('propositos').insert([
      { user_id: user.user.id, nombre: 'Ahorro General', icono: '📈', color: '#10b981', es_ahorro: true, tipo_categoria: 'AHORRO', patron_esperado: 'FIJO', activa: true },
      { user_id: user.user.id, nombre: 'Internet / Celular', icono: '📱', color: '#3b82f6', es_ahorro: false, tipo_categoria: 'COMPROMISO', patron_esperado: 'FIJO', activa: true },
      { user_id: user.user.id, nombre: 'Luz y Agua', icono: '💡', color: '#eab308', es_ahorro: false, tipo_categoria: 'COMPROMISO', patron_esperado: 'VARIABLE', activa: true },
      { user_id: user.user.id, nombre: 'Supermercado', icono: '🛒', color: '#f97316', es_ahorro: false, tipo_categoria: 'FONDO_CONSUMO', patron_esperado: 'VARIABLE', activa: true },
      { user_id: user.user.id, nombre: 'Gasolina', icono: '🚗', color: '#ef4444', es_ahorro: false, tipo_categoria: 'FONDO_CONSUMO', patron_esperado: 'VARIABLE', activa: true },
      { user_id: user.user.id, nombre: 'Gastos Personales', icono: '🎉', color: '#8b5cf6', es_ahorro: false, tipo_categoria: 'FONDO_CONSUMO', patron_esperado: 'VARIABLE', activa: true }
    ]);

    return data as PerfilUsuario;
  }

  async actualizarPerfil(perfil: PerfilUsuario): Promise<PerfilUsuario> {
    const { data, error } = await supabase
      .from('perfiles_usuario')
      .update({ nombre: perfil.nombre, tipo_perfil: perfil.tipo_perfil })
      .eq('id', perfil.id)
      .select()
      .single();
      
    if (error) throw new Error(error.message);
    return data as PerfilUsuario;
  }

  // --- Cuentas ---
  async getCuentas(): Promise<Cuenta[]> {
    const { data, error } = await supabase.from('cuentas').select('*');
    if (error) throw new Error(error.message);
    return data as Cuenta[];
  }

  async crearCuenta(cuenta: Omit<Cuenta, "id" | "user_id" | "created_at">): Promise<Cuenta> {
    const user = await this.getUser();
    if (!user) throw new Error("No user");
    
    const { data, error } = await supabase
      .from('cuentas')
      .insert({ ...cuenta, user_id: user.id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Cuenta;
  }

  async getSaldoCuenta(cuentaId: string): Promise<number> {
    // Calculado al vuelo para precisión absoluta
    const { data: cuenta } = await supabase.from('cuentas').select('saldo_inicial').eq('id', cuentaId).single();
    const { data: movimientos } = await supabase.from('movimientos').select('*').eq('cuenta_id', cuentaId);
    
    let saldo = Number(cuenta?.saldo_inicial || 0);
    if (movimientos) {
      movimientos.forEach(m => {
        if (m.tipo === 'INGRESO') saldo += Number(m.monto);
        else if (m.tipo === 'GASTO' || m.tipo === 'AHORRO') saldo -= Number(m.monto);
      });
    }
    return saldo;
  }

  // --- Propósitos ---
  async getPropositos(): Promise<Proposito[]> {
    const { data, error } = await supabase.from('propositos').select('*');
    if (error) throw new Error(error.message);
    return data as Proposito[];
  }

  async crearProposito(proposito: Omit<Proposito, "id" | "user_id" | "created_at">): Promise<Proposito> {
    const user = await this.getUser();
    if (!user) throw new Error("No user");
    
    const { data, error } = await supabase
      .from('propositos')
      .insert({ ...proposito, user_id: user.id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Proposito;
  }

  async actualizarProposito(id: string, propData: Partial<Proposito>): Promise<Proposito> {
    const { data, error } = await supabase
      .from('propositos')
      .update(propData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Proposito;
  }

  // --- Planes Financieros ---
  async getPlanActivo(): Promise<PlanFinanciero | null> {
    const { data, error } = await supabase
      .from('planes_financieros')
      .select('*')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data ? (data as PlanFinanciero) : null;
  }

  async getHistoricoPlanes(): Promise<PlanFinanciero[]> {
    const { data, error } = await supabase.from('planes_financieros').select('*').order('fecha_inicio', { ascending: false });
    if (error) throw new Error(error.message);
    return data as PlanFinanciero[];
  }

  async planificar(datos: PlanificarDatos): Promise<PlanFinanciero> {
    const user = await this.getUser();
    if (!user) throw new Error("No user");
    
    let planId = datos.plan_id_existente;
    let nuevoPlan: PlanFinanciero | undefined;
    const rolloverMap = new Map<string, number>();
    let globalRollover = 0;

    if (!planId) {
      // 0. Calcular rollover del plan activo antes de cerrarlo
      const planActivoPrevio = await this.getPlanActivo();
      if (planActivoPrevio) {
        const { data: sobres } = await supabase.from('vw_estado_sobres').select('*').eq('plan_id', planActivoPrevio.id);
        if (sobres) {
          for (const s of sobres) {
            if (s.disponible > 0) {
              rolloverMap.set(s.proposito_id, Math.round(Number(s.disponible) * 100) / 100);
            }
          }
        }
        
        const kpisPrevio = await this.getResumenKPIs(planActivoPrevio.id);
        if (kpisPrevio.sin_asignar > 0) {
          globalRollover = Math.round(kpisPrevio.sin_asignar * 100) / 100;
        }

        // 1. Cerrar planes activos
        await this.cerrarPlan(planActivoPrevio.id);
      }

      // 2. Crear nuevo plan
      const { data: pid, error } = await supabase.rpc('sp_crear_plan_anual', {
        p_user_id: user.id,
        p_nombre: datos.nombre,
        p_fecha_inicio: datos.fecha_inicio,
        p_fecha_fin: datos.fecha_fin,
        p_ingreso_total: datos.ingreso_recibido
      });
      if (error) throw new Error(error.message);
      planId = pid;
      
      const { data: np } = await supabase.from('planes_financieros').select('*').eq('id', planId).single();
      nuevoPlan = np as PlanFinanciero;
    } else {
      const { data: np } = await supabase.from('planes_financieros').select('*').eq('id', planId).single();
      if (!np) throw new Error("Plan existente no encontrado");
      nuevoPlan = np as PlanFinanciero;
    }

    // 3. Registrar Transacciones (Quincena y Rollover Global)
    const fechaIngreso = datos.fecha_ingreso || new Date().toISOString().split("T")[0];

    if (datos.ingreso_recibido > 0) {
       await this.registrarIngreso({
         cuenta_id: datos.cuenta_id,
         monto: Math.round(datos.ingreso_recibido * 100) / 100,
         fecha: fechaIngreso,
         fuente: "Ingreso de Planificación",
         descripcion: "Ingreso Quincenal de Planificación",
         plan_id: planId
       });
    }

    if (globalRollover > 0) {
      await this.registrarIngreso({
        cuenta_id: datos.cuenta_id,
        monto: Math.round(globalRollover * 100) / 100,
        fecha: fechaIngreso,
        fuente: "Rollover mes anterior (Sin Asignar)",
        descripcion: "Sobrante global de mes anterior",
        plan_id: planId
      });
    }

    // 4. Mapear distribucion enviada
    const distFinalMap = new Map<string, number>();
    for (const d of datos.distribucion) {
      distFinalMap.set(d.proposito_id, Math.round(d.monto * 100) / 100);
    }
    rolloverMap.forEach((_, propId) => {
      if (!distFinalMap.has(propId)) {
        distFinalMap.set(propId, 0);
      }
    });

    // 5. Crear o Actualizar Asignaciones
    const { data: asignacionesExistentes } = await supabase.from('asignaciones').select('*').eq('plan_id', planId);
    
    for (const [proposito_id, monto_asignado] of Array.from(distFinalMap.entries())) {
      const montoSobrante = rolloverMap.get(proposito_id) || 0;
      const existente = asignacionesExistentes?.find((a: any) => a.proposito_id === proposito_id);
      
      if (existente) {
        await supabase.from('asignaciones').update({
          monto_asignado: Number(existente.monto_asignado) + monto_asignado,
          monto_rollover: Number(existente.monto_rollover) + montoSobrante
        }).eq('id', existente.id);
      } else {
        await supabase.from('asignaciones').insert({
          user_id: user.id,
          plan_id: planId,
          proposito_id,
          monto_asignado,
          monto_rollover: montoSobrante
        });
      }
    }

    return nuevoPlan!;
  }

  async cerrarPlan(planId: string): Promise<void> {
     await supabase.from('planes_financieros').update({ estado: 'CERRADO' }).eq('id', planId);
  }

  // --- Asignaciones ---
  async getAsignaciones(planId: string): Promise<Asignacion[]> {
    const { data, error } = await supabase.from('asignaciones').select('*').eq('plan_id', planId);
    if (error) throw new Error(error.message);
    return data as Asignacion[];
  }

  async getDisponiblePorAsignacion(asignacionId: string): Promise<{ asignado: number; gastado: number; disponible: number; }> {
    const { data, error } = await supabase
      .from('vw_estado_sobres')
      .select('monto_asignado, monto_rollover, gastado, disponible')
      .eq('asignacion_id', asignacionId)
      .single();
      
    if (error || !data) return { asignado: 0, gastado: 0, disponible: 0 };
    
    return { 
      asignado: Number(data.monto_asignado) + Number(data.monto_rollover), 
      gastado: Number(data.gastado), 
      disponible: Number(data.disponible) 
    };
  }

  async eliminarCuenta(id: string): Promise<void> {
    const { data: movs } = await supabase.from('movimientos').select('id').eq('cuenta_id', id).limit(1);
    if (movs && movs.length > 0) throw new Error("No se puede eliminar la cuenta porque tiene movimientos asociados.");
    
    const { error } = await supabase.from('cuentas').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async eliminarProposito(id: string): Promise<void> {
    const { data: movs } = await supabase.from('movimientos').select('id').eq('proposito_id', id).limit(1);
    if (movs && movs.length > 0) throw new Error("No se puede eliminar el propósito porque tiene gastos asociados.");
    
    const { data: asigs } = await supabase.from('asignaciones').select('id').eq('proposito_id', id).limit(1);
    if (asigs && asigs.length > 0) throw new Error("No se puede eliminar el propósito porque tiene dinero asignado en un plan.");
    
    const { error } = await supabase.from('propositos').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // --- Movimientos ---
  async getMovimientos(planId?: string): Promise<Movimiento[]> {
    let query = supabase.from('movimientos').select('*').order('fecha', { ascending: false });
    if (planId) {
      query = query.eq('plan_id', planId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as Movimiento[];
  }

  async registrarIngreso(datos: any): Promise<Movimiento> {
    const user = await this.getUser();
    if (!user) throw new Error("No user");
    const { data, error } = await supabase
      .from('movimientos')
      .insert({ ...datos, user_id: user.id, tipo: 'INGRESO' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Movimiento;
  }

  async registrarGasto(datos: any): Promise<Movimiento> {
     const user = await this.getUser();
    if (!user) throw new Error("No user");
    const { data, error } = await supabase
      .from('movimientos')
      .insert({ ...datos, user_id: user.id, tipo: 'GASTO' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Movimiento;
  }

  async registrarTransferencia(datos: any): Promise<Movimiento> {
    throw new Error("No implementado");
  }

  async eliminarMovimiento(id: string): Promise<void> {
    await supabase.from('movimientos').delete().eq('id', id);
  }

  // --- Resumen ---
  async getResumenKPIs(planId: string): Promise<ResumenKPIs> {
    const defaultKPIs: ResumenKPIs = {
      ingreso_total: 0,
      total_asignado: 0,
      total_gastado: 0,
      total_ahorrado: 0,
      sin_asignar: 0,
      dinero_disponible: 0,
      dias_restantes: 0,
      libre_por_dia: 0
    };

    // Obtenemos el perfil para saber si es TRACKER o PLANIFICADOR
    const perfil = await this.getPerfil();
    if (!perfil) return defaultKPIs;

    if (perfil.tipo_perfil === 'TRACKER') {
      const { data: viewData, error } = await supabase.from('vw_dashboard_tracker').select('*').single();
      if (error || !viewData) return defaultKPIs;
      
      const ingresos = Number(viewData.total_ingresos || 0);
      const gastos = Number(viewData.total_gastos || 0);
      const ahorros = Number(viewData.total_ahorros || 0);
      
      return {
        ...defaultKPIs,
        ingreso_total: ingresos,
        total_gastado: gastos,
        total_ahorrado: ahorros,
        sin_asignar: ingresos - gastos - ahorros,
        dinero_disponible: ingresos - gastos
      };
    } else {
      // PLANIFICADOR Logic
      const { data: plan } = await supabase.from('planes_financieros').select('*').eq('id', planId).single();
      if (!plan) return defaultKPIs;

      const { data: sobres } = await supabase.from('vw_estado_sobres').select('*').eq('plan_id', planId);
      const { data: propositos } = await supabase.from('propositos').select('*');

      // Ingresos del plan
      const { data: ingresos } = await supabase.from('movimientos').select('monto').eq('plan_id', planId).eq('tipo', 'INGRESO');
      let totalIngreso = ingresos?.reduce((sum, i) => sum + Number(i.monto), 0) || 0;

      let totalAsignado = 0;
      let totalGastado = 0;
      let totalAhorrado = 0;

      if (sobres && propositos) {
        for (const s of sobres) {
          const prop = propositos.find(p => p.id === s.proposito_id);
          const asignado = Number(s.monto_asignado);
          totalAsignado += asignado;
          
          if (prop?.es_ahorro || prop?.tipo_categoria === 'AHORRO') {
            totalAhorrado += asignado; // El ahorro nuevo es solo lo asignado este mes
          } else {
            totalGastado += Number(s.gastado);
          }
        }
      }

      const { data: otrosGastos } = await supabase.from('movimientos').select('monto')
        .eq('plan_id', planId).eq('tipo', 'GASTO').is('asignacion_id', null);
      
      const gastadoLibre = otrosGastos?.reduce((sum, g) => sum + Number(g.monto), 0) || 0;
      totalGastado += gastadoLibre;

      const hoy = new Date();
      const fin = plan.fecha_fin ? new Date(plan.fecha_fin) : new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      const diasRestantes = Math.max(0, Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)));
      const sinAsignar = totalIngreso - totalAsignado - gastadoLibre;
      
      return {
        ingreso_total: totalIngreso,
        total_asignado: totalAsignado,
        total_gastado: totalGastado,
        total_ahorrado: totalAhorrado,
        sin_asignar: Math.max(0, sinAsignar),
        dinero_disponible: totalIngreso - totalGastado - totalAhorrado,
        dias_restantes: diasRestantes,
        libre_por_dia: diasRestantes > 0 ? (Math.max(0, sinAsignar) / diasRestantes) : Math.max(0, sinAsignar)
      };
    }
  }

  // --- Reportes y Estadísticas ---
  async getReporteCategorias(mesesAtras: number = 0): Promise<import("../../types").ReporteCategoria[]> {
    const user = await this.getUser();
    if (!user) return [];

    let query = supabase.from('movimientos').select('monto, proposito_id').eq('tipo', 'GASTO');
    
    if (mesesAtras > 0) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - mesesAtras);
      query = query.gte('fecha', fecha.toISOString().split('T')[0]);
    }

    const { data: movs, error: movsError } = await query;
    if (movsError || !movs) return [];

    const { data: props } = await supabase.from('propositos').select('id, nombre, color, es_ahorro');
    
    const agrupado: Record<string, number> = {};
    movs.forEach(m => {
      // Excluir ahorros de los gastos circulares si es necesario, pero como la tabla prop tiene es_ahorro, lo filtramos después
      const pid = m.proposito_id || 'general';
      agrupado[pid] = (agrupado[pid] || 0) + Number(m.monto);
    });

    const resultado: import("../../types").ReporteCategoria[] = [];
    Object.keys(agrupado).forEach(pid => {
      const prop = props?.find(p => p.id === pid);
      if (prop && !prop.es_ahorro) {
        resultado.push({
          proposito_id: pid,
          nombre: prop.nombre,
          color: prop.color || '#3b82f6',
          total: agrupado[pid]
        });
      } else if (pid === 'general') {
        resultado.push({
          proposito_id: pid,
          nombre: 'Otros Gastos',
          color: '#94a3b8',
          total: agrupado[pid]
        });
      }
    });

    return resultado.sort((a, b) => b.total - a.total);
  }

  async getReporteEvolucion(meses: number = 6): Promise<import("../../types").ReporteEvolucion[]> {
    const user = await this.getUser();
    if (!user) return [];

    const fecha = new Date();
    fecha.setMonth(fecha.getMonth() - meses);
    const fechaStr = fecha.toISOString().split('T')[0];

    const { data: movs, error } = await supabase
      .from('movimientos')
      .select('monto, tipo, fecha, proposito_id')
      .gte('fecha', fechaStr);

    if (error || !movs) return [];

    const { data: props } = await supabase.from('propositos').select('id, es_ahorro');
    const ahorroIds = new Set(props?.filter(p => p.es_ahorro).map(p => p.id));

    const agrupado: Record<string, { ingresos: number; gastos: number }> = {};

    movs.forEach(m => {
      const dateObj = new Date(m.fecha);
      const mesKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      
      if (!agrupado[mesKey]) {
        agrupado[mesKey] = { ingresos: 0, gastos: 0 };
      }

      if (m.tipo === 'INGRESO') {
        agrupado[mesKey].ingresos += Number(m.monto);
      } else if (m.tipo === 'GASTO') {
        // No contar transferencias a ahorro como gasto
        if (!ahorroIds.has(m.proposito_id)) {
          agrupado[mesKey].gastos += Number(m.monto);
        }
      }
    });

    // Ordenar cronológicamente y formatear el mes
    const nombresMes = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const resultado = Object.keys(agrupado).sort().map(key => {
      const [y, m] = key.split('-');
      return {
        mes: `${nombresMes[parseInt(m) - 1]} ${y}`,
        ingresos: agrupado[key].ingresos,
        gastos: agrupado[key].gastos
      };
    });

    return resultado;
  }

  // --- Transacciones Recurrentes ---
  async getTransaccionesRecurrentes(): Promise<import("../../types").TransaccionRecurrente[]> {
    const { data, error } = await supabase.from('transacciones_recurrentes').select('*').order('dia_del_mes', { ascending: true });
    if (error) throw new Error(error.message);
    return data as import("../../types").TransaccionRecurrente[];
  }

  async crearTransaccionRecurrente(datos: Omit<import("../../types").TransaccionRecurrente, 'id' | 'user_id' | 'created_at'>): Promise<import("../../types").TransaccionRecurrente> {
    const user = await this.getUser();
    if (!user) throw new Error("No user");
    const { data, error } = await supabase.from('transacciones_recurrentes').insert({ ...datos, user_id: user.id }).select().single();
    if (error) throw new Error(error.message);
    return data as import("../../types").TransaccionRecurrente;
  }

  async actualizarTransaccionRecurrente(id: string, datos: Partial<import("../../types").TransaccionRecurrente>): Promise<import("../../types").TransaccionRecurrente> {
    const { data, error } = await supabase.from('transacciones_recurrentes').update(datos).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data as import("../../types").TransaccionRecurrente;
  }

  async eliminarTransaccionRecurrente(id: string): Promise<void> {
    const { error } = await supabase.from('transacciones_recurrentes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async registrarEjecucionRecurrente(id: string, fecha: string): Promise<void> {
    const { error } = await supabase.from('transacciones_recurrentes').update({ ultima_ejecucion: fecha }).eq('id', id);
    if (error) throw new Error(error.message);
  }
}
