import {
  Cuenta,
  Proposito,
  PlanFinanciero,
  Asignacion,
  Movimiento,
  PerfilUsuario
} from "@/types";

export const PERFIL_DEFAULT: PerfilUsuario = {
  id: "perfil-default",
  tipo_perfil: "PLANIFICADOR",
  dia_corte_1: 10,
  dia_corte_2: 25,
  meta_ahorro_mensual: 8000,
  moneda_defecto: "NIO",
  created_at: new Date().toISOString()
};

export const CUENTAS_DEFAULT: Cuenta[] = [
  {
    id: "cta-efectivo",
    user_id: "local",
    nombre: "Billetera Efectivo",
    tipo: "EFECTIVO",
    saldo_inicial: 0,
    created_at: new Date().toISOString()
  },
  {
    id: "cta-banco",
    user_id: "local",
    nombre: "Cuenta Bancaria",
    tipo: "BANCO",
    saldo_inicial: 0,
    created_at: new Date().toISOString()
  }
];

export const PROPOSITOS_DEFAULT: Proposito[] = [
  {
    id: "prop-ahorro-usd",
    user_id: "local",
    nombre: "Ahorro USD",
    icono: "TrendingUp",
    color: "#8b5cf6",
    patronEsperado: "FIJO",
    es_ahorro: true,
    tipo_categoria: "AHORRO",
    activa: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "prop-fondo-miscelaneo",
    user_id: "local",
    nombre: "Fondo Misceláneo",
    icono: "Sparkles",
    color: "#a78bfa",
    patronEsperado: "FIJO",
    tipo_categoria: "FONDO_CONSUMO",
    activa: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "prop-telefono",
    user_id: "local",
    nombre: "Fondo Teléfono",
    icono: "Smartphone",
    color: "#3b82f6",
    patronEsperado: "FIJO",
    tipo_categoria: "COMPROMISO",
    activa: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "prop-internet",
    user_id: "local",
    nombre: "Fondo Internet",
    icono: "Globe",
    color: "#2563eb",
    patronEsperado: "FIJO",
    tipo_categoria: "COMPROMISO",
    activa: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "prop-datos",
    user_id: "local",
    nombre: "Datos Móviles",
    icono: "Wifi",
    color: "#60a5fa",
    patronEsperado: "FIJO",
    tipo_categoria: "FONDO_CONSUMO",
    activa: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "prop-carro",
    user_id: "local",
    nombre: "Carro",
    icono: "Car",
    color: "#f59e0b",
    patronEsperado: "FIJO",
    tipo_categoria: "COMPROMISO",
    activa: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "prop-gasolina",
    user_id: "local",
    nombre: "Gasolina",
    icono: "Fuel",
    color: "#d97706",
    patronEsperado: "VARIABLE",
    tipo_categoria: "FONDO_CONSUMO",
    activa: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "prop-comida",
    user_id: "local",
    nombre: "Comida",
    icono: "Utensils",
    color: "#f97316",
    patronEsperado: "VARIABLE",
    tipo_categoria: "FONDO_CONSUMO",
    activa: true,
    created_at: new Date().toISOString(),
  }
];

export const PLAN_INICIAL: PlanFinanciero = {
  id: "plan-actual-demo",
  user_id: "local",
  nombre: "Quincena 10 (Demo)",
  estado: "ACTIVO",
  fecha_inicio: "2026-07-10",
  fecha_fin: "2026-07-24",
  ciclo: "QUINCENAL",
  created_at: new Date().toISOString()
};

export const ASIGNACIONES_INICIALES: Asignacion[] = [
  { id: "asig-1", plan_id: "plan-actual-demo", proposito_id: "prop-ahorro-usd", monto_asignado: 4500, created_at: new Date().toISOString() },
  { id: "asig-2", plan_id: "plan-actual-demo", proposito_id: "prop-fondo-miscelaneo", monto_asignado: 500, created_at: new Date().toISOString() },
  { id: "asig-3", plan_id: "plan-actual-demo", proposito_id: "prop-telefono", monto_asignado: 717, created_at: new Date().toISOString() },
  { id: "asig-4", plan_id: "plan-actual-demo", proposito_id: "prop-internet", monto_asignado: 732.22, created_at: new Date().toISOString() },
  { id: "asig-5", plan_id: "plan-actual-demo", proposito_id: "prop-datos", monto_asignado: 180, created_at: new Date().toISOString() },
  { id: "asig-6", plan_id: "plan-actual-demo", proposito_id: "prop-carro", monto_asignado: 4800, created_at: new Date().toISOString() },
  { id: "asig-7", plan_id: "plan-actual-demo", proposito_id: "prop-gasolina", monto_asignado: 1500, created_at: new Date().toISOString() },
  { id: "asig-8", plan_id: "plan-actual-demo", proposito_id: "prop-comida", monto_asignado: 3000, created_at: new Date().toISOString() }
];

export const MOVIMIENTOS_INICIALES: Movimiento[] = [
  {
    id: "mov-ingreso-salario",
    user_id: "local",
    cuenta_id: "cta-banco",
    tipo: "INGRESO",
    monto: 17790.61,
    fecha: "2026-07-10",
    descripcion: "Salario Quincena 10",
    plan_id: "plan-actual-demo",
    fuente: "Salario",
    created_at: new Date().toISOString()
  },
  {
    id: "mov-gasto-carro",
    user_id: "local",
    cuenta_id: "cta-banco",
    tipo: "GASTO",
    monto: 4800,
    fecha: "2026-07-10",
    descripcion: "Cuota mensual del carro",
    asignacion_id: "asig-6",
    proposito_id: "prop-carro",
    created_at: new Date().toISOString()
  },
  {
    id: "mov-gasto-gasolina",
    user_id: "local",
    cuenta_id: "cta-efectivo",
    tipo: "GASTO",
    monto: 1500,
    fecha: "2026-07-10",
    descripcion: "Gasolina",
    asignacion_id: "asig-7",
    proposito_id: "prop-gasolina",
    created_at: new Date().toISOString()
  },
  {
    id: "mov-gasto-comida",
    user_id: "local",
    cuenta_id: "cta-efectivo",
    tipo: "GASTO",
    monto: 1250,
    fecha: "2026-07-12",
    descripcion: "Supermercado",
    asignacion_id: "asig-8",
    proposito_id: "prop-comida",
    created_at: new Date().toISOString()
  }
];

export function inicializarDatos(): void {
  if (typeof window === "undefined") return;

  // We only initialize Propositos if they don't exist, so they are available for Onboarding.
  if (!localStorage.getItem("propositos")) {
    localStorage.setItem("propositos", JSON.stringify(PROPOSITOS_DEFAULT));
  }

  /* 
  // Disable automatic seeding of profile and plans to test Onboarding
  if (!localStorage.getItem("perfil_usuario")) {
    localStorage.setItem("perfil_usuario", JSON.stringify(PERFIL_DEFAULT));
  }

  if (!localStorage.getItem("cuentas")) {
    localStorage.setItem("cuentas", JSON.stringify(CUENTAS_DEFAULT));
  }

  if (!localStorage.getItem("planes")) {
    localStorage.setItem("planes", JSON.stringify([PLAN_INICIAL]));
  }

  if (!localStorage.getItem("asignaciones")) {
    localStorage.setItem("asignaciones", JSON.stringify(ASIGNACIONES_INICIALES));
  }

  if (!localStorage.getItem("movimientos")) {
    localStorage.setItem("movimientos", JSON.stringify(MOVIMIENTOS_INICIALES));
  }
  */

  // Clear old legacy keys to avoid confusion during development
  localStorage.removeItem("categorias");
  localStorage.removeItem("periodos");
  localStorage.removeItem("config_quincenas");
  localStorage.removeItem("ingresos");
  localStorage.removeItem("asignaciones_nuevas");
}
