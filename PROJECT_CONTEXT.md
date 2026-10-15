# 📌 Contexto Maestro del Proyecto: Control de Gastos (Zero-Based Budgeting)

Este documento contiene toda la información arquitectónica, decisiones de diseño, modelo de datos y estado actual del proyecto. **Cualquier agente de IA o desarrollador nuevo debe leer este archivo antes de comenzar a trabajar.**

---

## 1. 🎯 Visión y Filosofía del Producto
* **Concepto:** Aplicación de finanzas personales basada en el método **Presupuesto Base Cero (Zero-Based Budgeting / Sistema de Sobres)**, inspirada en filosofías como YNAB, pero adaptada a la realidad económica de **Nicaragua** (bimonetaria: Córdobas C$ / Dólares USD, pagos quincenales/mensuales).
* **Diferenciador Clave:** 
  * A diferencia de aplicaciones contables tradicionales o competidores locales (ej. *RIALES*), que son **reactivos** (solo registran el gasto cuando ya se hizo), esta app es **proactiva**: enseña al usuario a asignar cada córdoba ganado a un "sobre" específico antes de gastarlo.
  * No gastas según lo que tienes en la cuenta de banco, sino según el saldo disponible en cada sobre.

---

## 2. 🛠️ Stack Tecnológico Actual (Web)
* **Framework:** Next.js 16+ (App Router, Turbopack).
* **Lenguaje:** TypeScript (con tipado estricto).
* **Estilos & UI:** Tailwind CSS, componentes basados en Radix / shadcn/ui, Lucide Icons.
* **Backend & Base de Datos:** Supabase (PostgreSQL, Auth con Magic Links/OTP, Row Level Security - RLS).
* **Despliegue:** Vercel conectado a la rama `master` del repositorio de GitHub (`JulioSancheZS/control-gastos-nextjs`).
* **Patrón de Datos:** Arquitectura desacoplada mediante interfaz `DataProvider` (`src/lib/data/types.ts`), implementada en `SupabaseProvider` y `LocalProvider`.

---

## 3. 🗄️ Esquema y Modelo de Base de Datos (Supabase)

Todas las tablas cuentan con **Row Level Security (RLS)** asegurando que ningún usuario pueda leer ni modificar datos de otros.

1. **`perfiles_usuario`**:
   * Datos del usuario, tipo de perfil (`TRACKER`, `PLANIFICADOR`), días de corte quincenal (`dia_corte_1`, `dia_corte_2`), moneda predeterminada (`NIO`).
2. **`cuentas`**:
   * Cuentas financieras reales (`Billetera Efectivo`, `Cuenta Bancaria`), tipo y saldo inicial.
3. **`propositos` (Sobres / Categorías)**:
   * Sobres donde se asigna el dinero.
   * Campos: `nombre`, `icono`, `tipo_categoria` (`COMPROMISO`, `FONDO_CONSUMO`, `AHORRO`), `patron_esperado` (`FIJO`, `VARIABLE`, `OCASIONAL`), `es_ahorro` (boolean), `activa` (boolean para archivar/desactivar sin perder historial).
4. **`planes_financieros`**:
   * Ciclos mensuales/presupuestos (`mes`, `anio`, `monto_total_disponible`).
5. **`asignaciones`**:
   * La unión entre un plan y un propósito: define cuánto dinero se colocó en cada sobre para ese mes.
6. **`movimientos`**:
   * Transacciones reales (`INGRESO`, `GASTO`, `TRANSFERENCIA`). Impactan las cuentas y descuentan saldo del sobre (`proposito_id`).
7. **`transacciones_recurrentes`**:
   * Gastos fijos o suscripciones programadas (servicios, préstamos, alquiler).
8. **`registro_logs`**:
   * Tabla empresarial de auditoría/telemetría (`user_id`, `accion`, `detalle`, `created_at`). Permite rastrear eventos clave (ej. `ONBOARDING_COMPLETADO`, login de nuevos usuarios).

---

## 4. 🧠 Decisiones Clave y Problemas Resueltos

* **Resolución del bug de "Falso Login" en Onboarding:**
  * Al ingresar con Magic Link, Supabase autentica la sesión, pero el perfil no existía aún. La landing page asumía que el usuario no estaba autenticado. Se ajustó `src/app/page.tsx` para redirigir inmediatamente a `/onboarding` cuando `user && !perfil`.
* **Simplificación del Onboarding:**
  * Se eliminó la opción "Ahorrador", dejando únicamente los perfiles **Tracker** (fácil y rápido) y **Planificador** (Base Cero completa).
  * Se implementó **Pre-carga inteligente (Seeding)**: al crear cuenta, el sistema crea automáticamente 2 cuentas base y 6 sobres esenciales para que el usuario no arranque en blanco.
* **Desactivación de Sobres:**
  * En lugar de borrar propósitos (lo que fallaba por restricciones de integridad referencial si ya tenían transacciones), se agregó el campo `activa: boolean` en `configuracion/page.tsx` para ocultarlos de la vista activa.
* **Modo de Prueba Oculto:**
  * Se comentó el botón de prueba offline en la landing page para obligar a los nuevos usuarios a registrarse mediante Supabase y mantener sus datos en la nube.

---

## 5. 📱 Próxima Gran Etapa: Migración a Móvil (React Native)

* **Decisión de Stack:** Se evaluó Android Nativo (Jetpack Compose) vs **React Native (Expo)**.
* **Elección definitiva:** **React Native con Expo**.
  * **Razón:** Permite reutilizar el 60-70% del código existente: las interfaces TypeScript (`src/types/index.ts`), el cliente Supabase y la lógica de cálculo de saldos. Además, da soporte para Android y para iOS con una sola base de código.
* **Estrategia respecto a competidores (ej. RIALES y SMS):**
  * La lectura de SMS es exclusiva de Android (prohibida en iOS) y tiene altas restricciones en Google Play. Nuestra app priorizará una experiencia móvil ágil, con widgets, notificaciones y registro ultrarrápido con biometría (FaceID/Huella).

---

## 6. 🚀 Instrucciones para Iniciar una Nueva Sesión de Chat
Cuando inicies un nuevo chat, indícale al asistente:
> *"Revisa el archivo `PROJECT_CONTEXT.md` para entender el estado de la app y el modelo de datos antes de responder."*
