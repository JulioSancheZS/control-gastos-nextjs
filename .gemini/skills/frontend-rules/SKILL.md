---
name: frontend-rules
description: Define las reglas de estilo, librerías estándar y mejores prácticas de Frontend (React/Next.js) para este proyecto. Activa esta skill cada vez que crees componentes de UI, páginas o refactorices el frontend.
---

# Reglas de Frontend - Control de Gastos

Estas son las reglas estrictas para el desarrollo del Frontend en este proyecto. Siempre debes seguirlas cuando escribas código de interfaz de usuario.

## 1. Stack Tecnológico Principal
- **Framework:** Next.js (App Router).
- **Estilos:** Clases utilitarias (`className`) y variables CSS en `globals.css` (Diseño Glassmorphism y Dark Mode preferido).
- **Componentes Base:** Usamos **shadcn/ui**. Si necesitas un componente nuevo, agrégalo manualmente o usa el CLI de shadcn.
- **Iconos:** Usamos `lucide-react`.

## 2. Formularios y Validación
- **Librería de Formularios:** Usa **SIEMPRE** `React Hook Form` (`useForm`).
- **Validación:** Usa **Zod** (`z.object`) con mensajes de error en **Español**.
- **Regla Estricta:** Nunca uses inputs nativos con estados manuales (`useState`) para formularios complejos; envuélvelos siempre en los componentes `<Form>`, `<FormField>`, `<FormControl>`, etc. proporcionados por shadcn/ui.
- **Tipado estricto:** Asegúrate de manejar los montos numéricos correctamente. Si usas `z.coerce.number()`, define `useForm<any>` si el tipado choca, o formatea correctamente los inputs.

## 3. Experiencia de Usuario (UX) y Estética
- **Idioma:** Toda la interfaz, incluidos calendarios (como el `DatePicker` con `date-fns/locale/es`), textos de validación y placeholders, debe estar **estrictamente en Español**.
- **Aesthetics (Wow Factor):** 
  - Usa colores vibrantes para destacar métricas financieras (ej. Emerald para Ingresos, Rose para Gastos, Amber para Ahorros).
  - Incluye efectos de Glassmorphism (paneles con `backdrop-blur`, fondos semitransparentes).
  - Añade animaciones sutiles (ej. `animate-in fade-in zoom-in-95`).
- **Feedback Visual:** Los errores de validación de formularios siempre deben mostrarse en texto color rojo (`text-destructive`) debajo del input.

## 4. Estructura de Componentes
- **Separación de responsabilidades:** Mantén las lógicas de carga de datos en el `Provider` (`useDataProvider`) y deja los componentes puramente para la UI.
- Si un componente supera las 300 líneas, considera fuertemente separarlo en sub-componentes lógicos dentro de la misma carpeta.
