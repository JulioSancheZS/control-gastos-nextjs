export type TipoCuenta = "EFECTIVO" | "BANCO" | "TARJETA_CREDITO";

export interface Cuenta {
  id: string;
  user_id: string;
  nombre: string;
  tipo: TipoCuenta;
  saldo_inicial: number;
  created_at: string;
}

export type PatronProposito = "FIJO" | "VARIABLE" | "OCASIONAL";
export type TipoCategoriaProposito = "COMPROMISO" | "FONDO_CONSUMO" | "AHORRO";

export interface Proposito {
  id: string;
  user_id: string;
  nombre: string;
  icono?: string;
  color?: string;
  activa: boolean;
  patron_esperado?: PatronProposito;
  es_ahorro?: boolean;
  tipo_categoria?: TipoCategoriaProposito;
  created_at: string;
}

export type TipoCiclo = "SEMANAL" | "QUINCENAL" | "MENSUAL" | "PERSONALIZADO";
export type EstadoPlan = "BORRADOR" | "ACTIVO" | "CERRADO";

export interface PlanFinanciero {
  id: string;
  user_id: string;
  nombre: string;
  estado: EstadoPlan;
  fecha_inicio: string;
  fecha_fin?: string;
  ciclo?: TipoCiclo;
  created_at: string;
}

export interface Asignacion {
  id: string;
  plan_id: string;
  proposito_id: string;
  monto_asignado: number;
  monto_rollover?: number;
  created_at: string;
}

export type TipoMovimiento = "INGRESO" | "GASTO" | "TRANSFERENCIA";

export interface Movimiento {
  id: string;
  user_id: string;
  cuenta_id: string;
  tipo: TipoMovimiento;
  monto: number;
  fecha: string;
  descripcion?: string;
  asignacion_id?: string;
  proposito_id?: string;
  plan_id?: string;
  fuente?: string;
  cuenta_destino_id?: string;
  created_at: string;
}

export type TipoPerfil = "TRACKER" | "PLANIFICADOR" | "AHORRADOR";

export interface PerfilUsuario {
  id: string;
  email?: string;
  nombre?: string;
  tipo_perfil: TipoPerfil;
  dia_corte_1?: number;
  dia_corte_2?: number;
  meta_ahorro_mensual?: number;
  moneda_defecto: string;
  created_at: string;
}

export interface ResumenKPIs {
  ingreso_total: number;
  total_asignado: number;
  total_gastado: number; // Excluye ahorros
  total_ahorrado: number;
  sin_asignar: number;
  dinero_disponible: number;
  dias_restantes: number;
  libre_por_dia: number;
}
export interface ReporteCategoria {
  proposito_id: string;
  nombre: string;
  color: string;
  total: number;
}

export interface ReporteEvolucion {
  mes: string;
  ingresos: number;
  gastos: number;
}
export interface TransaccionRecurrente {
  id: string;
  user_id: string;
  cuenta_id: string;
  proposito_id: string;
  monto: number;
  dia_del_mes: number;
  descripcion?: string;
  activa: boolean;
  ultima_ejecucion?: string;
  created_at: string;
}

export interface RegistroLog {
  id: string;
  user_id: string;
  accion: string;
  detalle?: Record<string, any>;
  created_at: string;
}
