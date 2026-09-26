# Control de Gastos - Personal Finance App 💰

Una aplicación web integral de finanzas personales diseñada bajo la estricta filosofía de **Presupuesto Base Cero (Zero-Based Budgeting)**. Permite a los usuarios tener un control absoluto de su dinero, asignando cada centavo a propósitos específicos (sobres) antes de gastarlo.

## 🚀 Funcionalidades Principales

- **Presupuesto Base Cero (Asistente Quincenal/Mensual):** Flujo paso a paso para repartir los ingresos en sobres hasta llegar a cero.
- **Gestión de Sobres:**
  - *Compromisos:* Servicios recurrentes y obligaciones fijas.
  - *Fondos de Consumo:* Gastos variables del día a día (Súper, Gasolina, etc.).
  - *Ahorros:* Dinero protegido a largo plazo con barras de progreso de metas.
- **Transacciones Recurrentes:** Sistema automatizado de intercepción en el Dashboard que alerta y permite procesar cobros automáticos pendientes con un clic.
- **Reportes Visuales:** Gráficas interactivas con el desglose de ingresos y egresos, e histórico semestral.
- **Multi-Usuario Seguro:** Sistema de autenticación con aislamiento total de base de datos a nivel de filas (RLS).
- **Onboarding Inteligente:** Al crear un perfil, se pre-cargan cuentas y sobres por defecto para facilitar el arranque.

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS.
- **UI Components:** shadcn/ui, Radix UI, Recharts, Lucide Icons.
- **Backend & Base de Datos:** Supabase (BaaS), PostgreSQL, Row Level Security (RLS).
- **Hosting:** Vercel.

## ⚙️ Instalación y Configuración Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/nombre-del-repo.git
   cd nombre-del-repo
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Variables de Entorno**
   Crea un archivo llamado `.env.local` en la raíz del proyecto basándote en el archivo de ejemplo:
   ```bash
   cp .env.example .env.local
   ```
   Rellena `.env.local` con tus llaves reales de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
   ```
   *(Nota: Jamás debes commitear tus llaves reales. El archivo `.env.local` ya está excluido en el `.gitignore`)*.

4. **Arrancar en Entorno de Desarrollo**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📝 Base de Datos (Supabase)

Para replicar el esquema de base de datos necesario, puedes utilizar el editor SQL de tu panel de Supabase. Deberás crear tablas como:
- `perfiles_usuario`
- `cuentas`
- `propositos`
- `planes_financieros`
- `asignaciones`
- `movimientos`
- `transacciones_recurrentes`

Asegúrate de habilitar **Row Level Security (RLS)** en todas ellas para garantizar que cada usuario vea únicamente su propia información.
