import {
  Cuenta,
  Proposito,
  PlanFinanciero,
  Asignacion,
  Movimiento,
  PerfilUsuario,
  ResumenKPIs,
  TransaccionRecurrente,
  ReporteCategoria,
  ReporteEvolucion
} from "@/types";

export interface PlanificarDatos {
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_ingreso?: string; // Fecha en la que se recibió el ingreso
  ingreso_recibido: number;
  cuenta_id: string; // A qué cuenta va el ingreso
  distribucion: { proposito_id: string; monto: number }[];
  plan_id_existente?: string; // Si se provee, no crea un plan nuevo, inyecta aquí.
}

export interface DataProvider {
  // Auth & Perfil
  login(email: string, pass: string): Promise<{ id: string; email: string; nombre: string }>;
  logout(): Promise<void>;
  getUser(): Promise<{ id: string; email: string; nombre: string } | null>;
  getPerfil(): Promise<PerfilUsuario | null>;
  crearPerfil(perfil: Omit<PerfilUsuario, "id" | "created_at">): Promise<PerfilUsuario>;
  actualizarPerfil(perfil: PerfilUsuario): Promise<PerfilUsuario>;

  // Cuentas
  getCuentas(): Promise<Cuenta[]>;
  crearCuenta(cuenta: Omit<Cuenta, "id" | "user_id" | "created_at">): Promise<Cuenta>;
  getSaldoCuenta(cuentaId: string): Promise<number>;
  eliminarCuenta(id: string): Promise<void>;

  // Propósitos
  getPropositos(): Promise<Proposito[]>;
  crearProposito(proposito: Omit<Proposito, "id" | "user_id" | "created_at">): Promise<Proposito>;
  actualizarProposito(id: string, data: Partial<Proposito>): Promise<Proposito>;
  eliminarProposito(id: string): Promise<void>;

  // Planes Financieros
  getPlanActivo(): Promise<PlanFinanciero | null>;
  getHistoricoPlanes(): Promise<PlanFinanciero[]>;
  planificar(datos: PlanificarDatos): Promise<PlanFinanciero>;
  cerrarPlan(planId: string): Promise<void>;

  // Asignaciones
  getAsignaciones(planId: string): Promise<Asignacion[]>;
  getDisponiblePorAsignacion(asignacionId: string): Promise<{
    asignado: number;
    gastado: number;
    disponible: number;
  }>;

  // Movimientos (Ingresos, Gastos, Transferencias)
  getMovimientos(planId?: string): Promise<Movimiento[]>;
  registrarIngreso(datos: {
    cuenta_id: string;
    monto: number;
    fecha: string;
    fuente?: string;
    descripcion?: string;
    plan_id?: string;
  }): Promise<Movimiento>;
  registrarGasto(datos: {
    cuenta_id: string;
    monto: number;
    fecha: string;
    descripcion?: string;
    asignacion_id?: string;
    proposito_id?: string;
    plan_id?: string;
  }): Promise<Movimiento>;
  registrarTransferencia(datos: {
    cuenta_origen_id: string;
    cuenta_destino_id: string;
    monto: number;
    fecha: string;
    descripcion?: string;
  }): Promise<Movimiento>;
  eliminarMovimiento(id: string): Promise<void>;

  // Resumen / KPIs
  getResumenKPIs(planId: string): Promise<ResumenKPIs>;

  // Transacciones Recurrentes
  getTransaccionesRecurrentes(): Promise<TransaccionRecurrente[]>;
  crearTransaccionRecurrente(data: Omit<TransaccionRecurrente, "id" | "user_id" | "created_at">): Promise<TransaccionRecurrente>;
  actualizarTransaccionRecurrente(id: string, data: Partial<TransaccionRecurrente>): Promise<TransaccionRecurrente>;
  eliminarTransaccionRecurrente(id: string): Promise<void>;
  registrarEjecucionRecurrente(id: string, fecha: string): Promise<void>;

  // Reportes
  getReporteCategorias(mesesAtras?: number): Promise<ReporteCategoria[]>;
  getReporteEvolucion(meses?: number): Promise<ReporteEvolucion[]>;

  // Logs
  guardarLog(accion: string, detalle?: Record<string, any>): Promise<void>;
}
