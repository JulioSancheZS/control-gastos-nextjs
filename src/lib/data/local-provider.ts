import { DataProvider, PlanificarDatos } from "./types";
import {
  Cuenta,
  Proposito,
  PlanFinanciero,
  Asignacion,
  Movimiento,
  PerfilUsuario,
  ResumenKPIs
} from "@/types";

export class LocalProvider implements DataProvider {
  private getStore<T>(key: string): T[] {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  }

  private setStore<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private getSingle<T>(key: string): T | null {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  private setSingle<T>(key: string, data: T): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Auth & Perfil
  login(email: string, _pass: string): Promise<{ id: string; email: string; nombre: string }> {
    const user = { id: "local-user", email, nombre: "Julio Demo" };
    this.setSingle("session_user", user);
    return Promise.resolve(user);
  }

  logout(): Promise<void> {
    localStorage.removeItem("session_user");
    return Promise.resolve();
  }

  getUser(): Promise<{ id: string; email: string; nombre: string } | null> {
    return Promise.resolve(this.getSingle("session_user"));
  }

  getPerfil(): Promise<PerfilUsuario | null> {
    return Promise.resolve(this.getSingle("perfil_usuario"));
  }

  crearPerfil(perfil: Omit<PerfilUsuario, "id" | "created_at">): Promise<PerfilUsuario> {
    const nuevo: PerfilUsuario = {
      ...perfil,
      id: `perfil-${crypto.randomUUID()}`,
      created_at: new Date().toISOString()
    };
    this.setSingle("perfil_usuario", nuevo);
    return Promise.resolve(nuevo);
  }

  actualizarPerfil(perfil: PerfilUsuario): Promise<PerfilUsuario> {
    this.setSingle("perfil_usuario", perfil);
    return Promise.resolve(perfil);
  }

  // Cuentas
  getCuentas(): Promise<Cuenta[]> {
    return Promise.resolve(this.getStore<Cuenta>("cuentas"));
  }

  crearCuenta(cuenta: Omit<Cuenta, "id" | "user_id" | "created_at">): Promise<Cuenta> {
    const nueva: Cuenta = {
      ...cuenta,
      id: `cuenta-${crypto.randomUUID()}`,
      user_id: "local",
      created_at: new Date().toISOString()
    };
    const cuentas = this.getStore<Cuenta>("cuentas");
    cuentas.push(nueva);
    this.setStore("cuentas", cuentas);
    return Promise.resolve(nueva);
  }

  async getSaldoCuenta(cuentaId: string): Promise<number> {
    const cuentas = this.getStore<Cuenta>("cuentas");
    const cuenta = cuentas.find(c => c.id === cuentaId);
    if (!cuenta) return 0;

    const movimientos = this.getStore<Movimiento>("movimientos").filter(m => m.cuenta_id === cuentaId);
    let saldo = cuenta.saldo_inicial;

    movimientos.forEach(m => {
      if (m.tipo === "INGRESO") saldo += m.monto;
      else if (m.tipo === "GASTO") saldo -= m.monto;
      // TRANSFERENCIA handled if we know origin/dest, for MVP keep it simple
    });

    return saldo;
  }

  // Propósitos
  getPropositos(): Promise<Proposito[]> {
    return Promise.resolve(this.getStore<Proposito>("propositos"));
  }

  crearProposito(proposito: Omit<Proposito, "id" | "user_id" | "created_at">): Promise<Proposito> {
    const nuevo: Proposito = {
      ...proposito,
      id: `prop-${crypto.randomUUID()}`,
      user_id: "local",
      created_at: new Date().toISOString()
    };
    const propositos = this.getStore<Proposito>("propositos");
    propositos.push(nuevo);
    this.setStore("propositos", propositos);
    return Promise.resolve(nuevo);
  }

  actualizarProposito(id: string, data: Partial<Proposito>): Promise<Proposito> {
    const propositos = this.getStore<Proposito>("propositos");
    const idx = propositos.findIndex(p => p.id === id);
    if (idx === -1) return Promise.reject("Propósito no encontrado");
    
    propositos[idx] = { ...propositos[idx], ...data };
    this.setStore("propositos", propositos);
    return Promise.resolve(propositos[idx]);
  }

  // Planes Financieros
  getPlanActivo(): Promise<PlanFinanciero | null> {
    const planes = this.getStore<PlanFinanciero>("planes");
    const activo = planes.find(p => p.estado === "ACTIVO");
    return Promise.resolve(activo || null);
  }

  getHistoricoPlanes(): Promise<PlanFinanciero[]> {
    return Promise.resolve(this.getStore<PlanFinanciero>("planes"));
  }

  async planificar(datos: PlanificarDatos): Promise<PlanFinanciero> {
    let planId = datos.plan_id_existente;
    let nuevoPlan: PlanFinanciero | undefined;
    const rolloverMap = new Map<string, number>();
    let globalRollover = 0;

    if (!planId) {
      // 0. Calcular rollover del plan activo antes de cerrarlo
      const planesActuales = this.getStore<PlanFinanciero>("planes");
      const planActivoPrevio = planesActuales.find(p => p.estado === "ACTIVO");

      if (planActivoPrevio) {
        // Rollover de sobres
        const asigsPrevia = this.getStore<Asignacion>("asignaciones").filter(a => a.plan_id === planActivoPrevio.id);
        for (const a of asigsPrevia) {
          const { disponible } = await this.getDisponiblePorAsignacion(a.id);
          if (disponible > 0) {
            rolloverMap.set(a.proposito_id, Math.round(disponible * 100) / 100);
          }
        }
        
        // Rollover de dinero sin asignar (Disponible Global)
        const kpisPrevio = await this.getResumenKPIs(planActivoPrevio.id);
        if (kpisPrevio.sin_asignar > 0) {
          globalRollover = Math.round(kpisPrevio.sin_asignar * 100) / 100;
        }
      }

      // 1. Cerrar planes activos
      const planes = planesActuales.map(p => 
        p.estado === "ACTIVO" ? { ...p, estado: "CERRADO" as const } : p
      );

      // 2. Crear nuevo plan
      nuevoPlan = {
        id: `plan-${crypto.randomUUID()}`,
        user_id: "local",
        nombre: datos.nombre,
        estado: "ACTIVO",
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        created_at: new Date().toISOString()
      };
      planes.push(nuevoPlan);
      this.setStore("planes", planes);
      planId = nuevoPlan.id;
    } else {
      // Usar plan existente
      const planes = this.getStore<PlanFinanciero>("planes");
      nuevoPlan = planes.find(p => p.id === planId);
      if (!nuevoPlan) throw new Error("Plan existente no encontrado");
    }

    // 3. Registrar Transacciones
    const fechaIngreso = datos.fecha_ingreso || new Date().toISOString().split("T")[0];

    // 3.1. Registrar Ingreso (Quincena actual)
    await this.registrarIngreso({
      cuenta_id: datos.cuenta_id,
      monto: Math.round(datos.ingreso_recibido * 100) / 100,
      fecha: fechaIngreso,
      fuente: "Ingreso de Planificación",
      descripcion: "Ingreso Quincenal de Planificación",
      plan_id: planId
    });

    // 3.5. Registrar Ingreso por Rollover Global (si aplica)
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

    // 4. Mapear distribucion enviada (dinero nuevo asignado desde el ingreso del plan)
    const distFinalMap = new Map<string, number>();
    for (const d of datos.distribucion) {
      distFinalMap.set(d.proposito_id, Math.round(d.monto * 100) / 100);
    }

    // Asegurar que propósitos que no recibieron dinero nuevo pero tienen rollover también se incluyan
    rolloverMap.forEach((_, propId) => {
      if (!distFinalMap.has(propId)) {
        distFinalMap.set(propId, 0);
      }
    });

    // 5. Crear o Actualizar Asignaciones
    const asignaciones = this.getStore<Asignacion>("asignaciones");
    
    distFinalMap.forEach((monto_asignado, proposito_id) => {
      const montoSobrante = rolloverMap.get(proposito_id) || 0;
      const existenteIdx = asignaciones.findIndex(a => a.plan_id === planId && a.proposito_id === proposito_id);
      
      if (existenteIdx !== -1) {
        asignaciones[existenteIdx].monto_asignado += monto_asignado;
        if (montoSobrante > 0) {
          asignaciones[existenteIdx].monto_rollover = (asignaciones[existenteIdx].monto_rollover || 0) + montoSobrante;
        }
      } else {
        asignaciones.push({
          id: `asig-${crypto.randomUUID()}`,
          plan_id: planId as string,
          proposito_id,
          monto_asignado,
          monto_rollover: montoSobrante,
          created_at: new Date().toISOString()
        });
      }
    });

    this.setStore("asignaciones", asignaciones);

    return nuevoPlan;
  }

  cerrarPlan(planId: string): Promise<void> {
    const planes = this.getStore<PlanFinanciero>("planes");
    const idx = planes.findIndex(p => p.id === planId);
    if (idx !== -1) {
      planes[idx].estado = "CERRADO";
      this.setStore("planes", planes);
    }
    return Promise.resolve();
  }

  // Asignaciones
  getAsignaciones(planId: string): Promise<Asignacion[]> {
    let all = this.getStore<Asignacion>("asignaciones");
    
    // Auto-reparación: agrupar asignaciones duplicadas (por bug anterior)
    const agrupadas = new Map<string, Asignacion>();
    let huboDuplicados = false;
    
    for (const a of all) {
      const key = `${a.plan_id}-${a.proposito_id}`;
      if (agrupadas.has(key)) {
        agrupadas.get(key)!.monto_asignado += a.monto_asignado;
        agrupadas.get(key)!.monto_rollover = (agrupadas.get(key)!.monto_rollover || 0) + (a.monto_rollover || 0);
        huboDuplicados = true;
      } else {
        agrupadas.set(key, { ...a });
      }
    }
    
    if (huboDuplicados) {
      all = Array.from(agrupadas.values());
      this.setStore("asignaciones", all);
    }

    return Promise.resolve(all.filter(a => a.plan_id === planId));
  }

  async getDisponiblePorAsignacion(asignacionId: string): Promise<{
    asignado: number;
    rollover: number;
    gastado: number;
    disponible: number;
  }> {
    const asig = this.getStore<Asignacion>("asignaciones").find(a => a.id === asignacionId);
    if (!asig) return { asignado: 0, rollover: 0, gastado: 0, disponible: 0 };

    const movimientos = this.getStore<Movimiento>("movimientos")
      .filter(m => m.asignacion_id === asignacionId && m.tipo === "GASTO");
    
    const gastado = Math.round(movimientos.reduce((sum, m) => sum + m.monto, 0) * 100) / 100;
    const rollover = asig.monto_rollover || 0;
    const total_fondo = asig.monto_asignado + rollover;

    return {
      asignado: asig.monto_asignado,
      rollover,
      gastado,
      disponible: Math.round((total_fondo - gastado) * 100) / 100
    };
  }

  // Movimientos
  getMovimientos(planId?: string): Promise<Movimiento[]> {
    const movimientos = this.getStore<Movimiento>("movimientos");
    if (planId) {
      // Find all asignaciones for this plan to get their expenses
      const asignaciones = this.getStore<Asignacion>("asignaciones").filter(a => a.plan_id === planId);
      const asigIds = asignaciones.map(a => a.id);
      
      return Promise.resolve(movimientos.filter(m => 
        m.plan_id === planId || // Ingresos of the plan
        (m.asignacion_id && asigIds.includes(m.asignacion_id)) // Gastos of the plan
      ));
    }
    return Promise.resolve(movimientos);
  }

  registrarIngreso(datos: {
    cuenta_id: string;
    monto: number;
    fecha: string;
    fuente?: string;
    descripcion?: string;
    plan_id?: string;
  }): Promise<Movimiento> {
    const nuevo: Movimiento = {
      id: `mov-${crypto.randomUUID()}`,
      user_id: "local",
      cuenta_id: datos.cuenta_id,
      tipo: "INGRESO",
      monto: datos.monto,
      fecha: datos.fecha,
      fuente: datos.fuente,
      descripcion: datos.descripcion,
      plan_id: datos.plan_id,
      created_at: new Date().toISOString()
    };
    const movimientos = this.getStore<Movimiento>("movimientos");
    movimientos.push(nuevo);
    this.setStore("movimientos", movimientos);
    return Promise.resolve(nuevo);
  }

  registrarGasto(datos: {
    cuenta_id: string;
    monto: number;
    fecha: string;
    descripcion?: string;
    asignacion_id?: string;
    proposito_id?: string;
    plan_id?: string; // Para gastos libres que descuentan del Disponible Global del mes
  }): Promise<Movimiento> {
    const nuevo: Movimiento = {
      id: `mov-${crypto.randomUUID()}`,
      user_id: "local",
      cuenta_id: datos.cuenta_id,
      tipo: "GASTO",
      monto: datos.monto,
      fecha: datos.fecha,
      descripcion: datos.descripcion,
      asignacion_id: datos.asignacion_id,
      proposito_id: datos.proposito_id,
      plan_id: datos.plan_id,
      created_at: new Date().toISOString()
    };
    const movimientos = this.getStore<Movimiento>("movimientos");
    movimientos.push(nuevo);
    this.setStore("movimientos", movimientos);
    return Promise.resolve(nuevo);
  }

  registrarTransferencia(datos: {
    cuenta_origen_id: string;
    cuenta_destino_id: string;
    monto: number;
    fecha: string;
    descripcion?: string;
  }): Promise<Movimiento> {
    const nuevo: Movimiento = {
      id: `mov-${crypto.randomUUID()}`,
      user_id: "local",
      cuenta_id: datos.cuenta_origen_id,
      cuenta_destino_id: datos.cuenta_destino_id,
      tipo: "TRANSFERENCIA",
      monto: datos.monto,
      fecha: datos.fecha,
      descripcion: datos.descripcion,
      created_at: new Date().toISOString()
    };
    const movimientos = this.getStore<Movimiento>("movimientos");
    movimientos.push(nuevo);
    this.setStore("movimientos", movimientos);
    return Promise.resolve(nuevo);
  }

  eliminarMovimiento(id: string): Promise<void> {
    const movimientos = this.getStore<Movimiento>("movimientos");
    this.setStore("movimientos", movimientos.filter(m => m.id !== id));
    return Promise.resolve();
  }

  eliminarCuenta(id: string): Promise<void> {
    const movimientos = this.getStore<Movimiento>("movimientos");
    if (movimientos.some(m => m.cuenta_id === id)) {
      throw new Error("No se puede eliminar la cuenta porque tiene movimientos asociados.");
    }
    const cuentas = this.getStore<Cuenta>("cuentas");
    this.setStore("cuentas", cuentas.filter(c => c.id !== id));
    return Promise.resolve();
  }

  eliminarProposito(id: string): Promise<void> {
    const movimientos = this.getStore<Movimiento>("movimientos");
    if (movimientos.some(m => m.proposito_id === id)) {
      throw new Error("No se puede eliminar el propósito porque tiene gastos asociados.");
    }
    const asignaciones = this.getStore<Asignacion>("asignaciones");
    if (asignaciones.some(a => a.proposito_id === id)) {
      throw new Error("No se puede eliminar el propósito porque tiene dinero asignado en un plan.");
    }
    const propositos = this.getStore<Proposito>("propositos");
    this.setStore("propositos", propositos.filter(p => p.id !== id));
    return Promise.resolve();
  }

  // Resumen / KPIs
  async getResumenKPIs(planId: string): Promise<ResumenKPIs> {
    const plan = this.getStore<PlanFinanciero>("planes").find(p => p.id === planId);
    if (!plan) throw new Error("Plan no encontrado");

    const asignaciones = this.getStore<Asignacion>("asignaciones").filter(a => a.plan_id === planId);
    const asigIds = asignaciones.map(a => a.id);
    const movimientos = this.getStore<Movimiento>("movimientos");
    
    const ingresosDelPlan = movimientos.filter(m => m.tipo === "INGRESO" && m.plan_id === planId);
    let ingreso_total = Math.round(ingresosDelPlan.reduce((sum, m) => sum + m.monto, 0) * 100) / 100;

    // El dinero asignado total es SOLAMENTE el nuevo dinero asignado (sin rollover) para que cuadre con el Ingreso Plan
    const total_asignado = Math.round(asignaciones.reduce((sum, a) => sum + a.monto_asignado, 0) * 100) / 100;
    
    const propositos = this.getStore<Proposito>("propositos");
    const asignacionesAhorroIds = asignaciones
      .filter(a => {
        const prop = propositos.find(p => p.id === a.proposito_id);
        return prop?.tipo_categoria === "AHORRO";
      })
      .map(a => a.id);

    // Gastos que salieron de sobres
    const gastosDelPlan = movimientos.filter(m => m.tipo === "GASTO" && m.asignacion_id && asigIds.includes(m.asignacion_id));
    
    // El ahorro total nuevo es solo el dinero NUEVO asignado a los propósitos de ahorro este mes
    const asignacionesAhorro = asignaciones.filter(a => asignacionesAhorroIds.includes(a.id));
    const total_ahorrado = Math.round(asignacionesAhorro.reduce((sum, a) => sum + a.monto_asignado, 0) * 100) / 100;

    // Resto de gastos en sobres
    const gastosSobresReales = gastosDelPlan.filter(m => !m.asignacion_id || !asignacionesAhorroIds.includes(m.asignacion_id));
    const total_gastado_sobres = Math.round(gastosSobresReales.reduce((sum, m) => sum + m.monto, 0) * 100) / 100;

    // Gastos Libres (sin sobre, salieron directo del Disponible Global)
    const gastosLibres = movimientos.filter(m => m.tipo === "GASTO" && !m.asignacion_id && m.plan_id === planId);
    const total_gastado_libre = Math.round(gastosLibres.reduce((sum, m) => sum + m.monto, 0) * 100) / 100;

    const total_gastado = Math.round((total_gastado_sobres + total_gastado_libre) * 100) / 100;

    // El sin_asignar es el dinero flotante del ingreso actual menos lo asignado y lo gastado libre
    const sin_asignar = Math.round((ingreso_total - total_asignado - total_gastado_libre) * 100) / 100;
    
    // El dinero disponible total baja con gastos y ahorros transferidos
    const dinero_disponible = Math.round((ingreso_total - total_gastado - total_ahorrado) * 100) / 100;

    // Calcular días restantes
    let dias_restantes = 1;
    if (plan.fecha_fin) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const fin = new Date(plan.fecha_fin);
      fin.setHours(0, 0, 0, 0);
      
      if (fin.getTime() >= hoy.getTime()) {
        const diffTime = Math.abs(fin.getTime() - hoy.getTime());
        dias_restantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    const libre_por_dia = Math.round((sin_asignar / dias_restantes) * 100) / 100;

    return {
      ingreso_total,
      total_asignado,
      total_gastado,
      total_ahorrado,
      sin_asignar,
      dinero_disponible,
      dias_restantes,
      libre_por_dia
    };
  }
}
