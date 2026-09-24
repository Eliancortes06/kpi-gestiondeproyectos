# Project Pulse

Quiero desarrollar una aplicación web moderna, intuitiva y altamente visual que reemplace completamente el archivo de Excel que actualmente utilizo para hacer seguimiento a los indicadores de cumplimiento y causas de retraso de mis proyectos.

Actualmente la información se registra manualmente en un Excel donde cada columna representa un mes y cada fila corresponde a un motivo de retraso (Definiciones del cliente, Componentes faltantes, Chassis, Mano de obra, Tanques, Diseño, BOM, Ensamble + Subensamble, Logística, etc.). A partir de esta información se generan gráficas de tendencias mensuales.

Quiero que esta aplicación elimine completamente la necesidad de utilizar Excel. En su lugar, los usuarios deberán ingresar la información directamente desde la aplicación mediante formularios intuitivos y el sistema deberá actualizar automáticamente todos los indicadores, gráficos y análisis en tiempo real.

No quiero una aplicación sencilla; quiero una plataforma empresarial con un diseño premium, moderno y elegante, inspirada en herramientas como Microsoft Fabric, Power BI, Monday.com, Linear, ClickUp y Notion. La experiencia debe transmitir profesionalismo, limpieza visual y facilidad de uso.

El diseño debe utilizar exclusivamente la siguiente identidad visual:

• Azul principal: #1F3F5E (color predominante de la aplicación)

• Rojo institucional: #79161D (utilizar únicamente para alertas o indicadores críticos)

• Gris claro: #C6C6C6

• Gris oscuro: #575657

• Negro: #1D1D1B

El diseño debe incluir tarjetas modernas con esquinas redondeadas, sombras suaves, mucho espacio en blanco, iconografía moderna, tipografía limpia, animaciones sutiles, transiciones fluidas y ser completamente responsive.

La página principal debe ser un Dashboard Ejecutivo.

En la parte superior quiero tarjetas KPI que muestren:

• Proyectos entregados a tiempo

• Componentes faltantes

• Chassis

• Mano de obra

• Tanques

• Diseño

• BOM

• Definiciones del cliente

• Logística

• Ensamble + Subensamble

Cada tarjeta debe mostrar:

- Valor actual

- Comparación con el mes anterior

- Variación porcentual

- Flecha de tendencia

- Mini gráfico (Sparkline)

- Color dinámico según el comportamiento del indicador

Debajo de las tarjetas debe existir un tablero completamente interactivo donde cada indicador tenga su propia gráfica.

Las gráficas deben ser modernas, animadas e interactivas, permitiendo:

- Hover con información detallada

- Zoom

- Filtros dinámicos

- Exportar como imagen

- Exportar como PDF

Utilizar diferentes tipos de visualización según el contexto:

- Gráficas de línea

- Gráficas de área

- Barras

- Barras apiladas

- Heatmaps

- Comparativos entre años

- Tendencias históricas

- Evolución mensual

Agregar un panel de filtros global en la parte superior con:

- Año

- Mes

- Rango de fechas

- Motivo

- Proyecto (preparado para futuras versiones)

También incluir botones rápidos:

- Últimos 6 meses

- Últimos 12 meses

- Año actual

- Histórico completo

Todos los gráficos deberán actualizarse automáticamente al cambiar cualquier filtro.

Crear un módulo llamado "Gestión de Indicadores".

Aquí el usuario podrá registrar la información mediante un formulario moderno.

Campos:

- Año

- Mes

- Motivo

- Porcentaje

- Observaciones

Botones:

- Guardar

- Editar

- Eliminar

- Cancelar

Agregar validaciones:

- No permitir porcentajes superiores al 100%.

- No permitir porcentajes negativos.

- No permitir duplicar un mismo motivo para el mismo mes y año.

- Mostrar mensajes de validación claros y amigables.

Crear inicialmente los siguientes motivos:

- Definiciones del cliente

- Componentes faltantes

- OK

- Chassis

- Mano de obra

- Tanque

- Diseño

- BOM

- Ensamble + Subensamble

- Logística

Además, permitir que un administrador pueda crear nuevos motivos sin modificar el código.

Agregar una tabla histórica moderna donde se puedan consultar todos los registros.

La tabla debe incluir:

- Búsqueda

- Ordenamiento por columnas

- Filtros

- Paginación

- Exportar a Excel

- Exportar a CSV

Crear una sección llamada "Insights Inteligentes".

Esta sección debe analizar automáticamente la información y mostrar conclusiones como:

- Principal motivo de retraso.

- Motivo con mayor crecimiento.

- Motivo con mayor disminución.

- Promedio histórico por motivo.

- Comparación con el año anterior.

- Evolución mensual.

- Ranking de causas.

Integrar Inteligencia Artificial para generar comentarios automáticos como:

"Los componentes faltantes disminuyeron un 18% respecto al mes anterior."

"La mano de obra presenta una tendencia creciente durante los últimos tres meses."

"Las definiciones del cliente se mantienen estables durante el último semestre."

Agregar un módulo de reportes que permita descargar:

- Excel

- PDF

- CSV

Crear dos perfiles de usuario:

Administrador:

- Crear registros.

- Editar registros.

- Eliminar registros.

- Administrar usuarios.

- Administrar motivos.

- Exportar reportes.

Consulta:

- Solo visualizar información.

Utilizar Supabase como base de datos.

Crear las siguientes tablas:

Usuarios

- id

- nombre

- correo

- rol

Motivos

- id

- nombre

- color

- estado

Indicadores Mensuales

- id

- año

- mes

- motivo

- porcentaje

- observaciones

- fecha_creacion

- fecha_actualizacion

Desarrollar la aplicación utilizando:

- React

- TypeScript

- Tailwind CSS

- Shadcn UI

- Recharts

- Supabase

- PostgreSQL

- Supabase Auth

Agregar una excelente experiencia de usuario con:

- Skeleton Loaders

- Animaciones suaves

- Toast Notifications

- Estados vacíos ilustrados

- Modo oscuro preparado

- Diseño responsive

- Excelente rendimiento

Diseñar toda la arquitectura para que en futuras versiones sea posible agregar:

- Registro por proyecto.

- Registro por cliente.

- Registro por tipo de equipo.

- Dashboard por proyecto.

- Dashboard por cliente.

- Dashboard por país.

- Predicción de tendencias mediante IA.

- Alertas automáticas cuando un indicador supere un umbral.

- Envío programado de reportes por correo.

- Integración con Excel Online, Smartsheet y Power BI.

Finalmente, quiero que el resultado no sea simplemente un dashboard, sino una plataforma empresarial de análisis de indicadores con una experiencia de usuario de primer nivel. El diseño debe transmitir innovación, profesionalismo y facilidad de uso, con una navegación intuitiva, gráficos modernos, información clara y una interfaz que sorprenda visualmente desde el primer momento.

En la imagen que te di, se encuentra actualmente la data que tenemos registrada.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kpi-gestiondeproyectos.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/824fadba-4a3a-45e1-849e-0c7c4d67264d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
