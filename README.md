# jira-automation-qa

Proyecto local para automatizar Jira Cloud vía su API REST: creación de tareas en sprints y reportes/porcentajes de avance.

## Requisitos
- Node.js instalado en tu máquina (v18 o superior recomendado)
- Un token de Jira **con scopes** — ver la lista completa más abajo en "Scopes del token requeridos"

## Instalación

```bash
npm install
```

## Configuración

1. Copia `.env.example` a `.env` (en la raíz) y `client/.env.example` a `client/.env`:
   ```bash
   cp .env.example .env
   cp client/.env.example client/.env
   ```
2. Abre `.env` y completa:
   - `JIRA_DOMAIN` → dominio de Jira del equipo (ej: `tu-empresa.atlassian.net`; pídeselo a quien administre el proyecto)
   - `JIRA_PROJECT_KEY` → key del proyecto (ej: `PROJ`; pídesela también)
   - `JIRA_BOARD_ID` → ID del board Agile del proyecto
   - `JIRA_EMAIL` → **tu propio** correo de Atlassian
   - `JIRA_API_TOKEN` → **tu propio** token, con todos los scopes de la lista de abajo
3. Abre `client/.env` y pon el mismo `JIRA_DOMAIN` en `VITE_JIRA_DOMAIN`.

**Nunca subas ningún `.env` a git.** Ya están en `.gitignore` (raíz y `client/`).

## Probar la conexión

```bash
npm run test-connection
```

Si todo está bien configurado, deberías ver algo como:

```
✅ Conexión exitosa
Autenticado como: Tu Nombre (tu-correo@dominio.com)
```

Si ves un error 401/403, revisa que el token no haya expirado y que tenga los scopes read:jira-work y write:jira-work.

## Aplicativo web (crear tareas con interfaz visual)

Hay un selector de sprint en la parte superior (agrupado en Activo / Futuros / Cerrados) que aplica a las tres pantallas — por defecto se abre en el sprint activo, pero puedes cambiar a cualquier sprint pasado (para validar tareas que no se cerraron, o ver reportes históricos) o futuro:
- **Crear tarea**: formulario para crear tareas en el sprint seleccionado — tipo, **estado inicial** (Por hacer / En progreso / Hecha), resumen, descripción **con editor de texto enriquecido** (negrita, cursiva, subrayado, tachado, colores, títulos, listas, código y enlaces), proyecto asociado (Epic), participante asignado y tiempo invertido (se registra como worklog). Si eliges un estado distinto al inicial de Jira, la tarea se crea y de inmediato se mueve a ese estado. Incluye un paso de confirmación antes de crear el issue de verdad, y avisa si el sprint elegido no es el activo.
- **Tablero**: tabla con todos los issues del sprint seleccionado, filtrable por proyecto (Epic), usuario asignado, estado y por texto/ID (ej: "JS-8172"). Cada issue permite cambiar su estado (To Do / In Progress / Done, o los que tenga tu workflow), su **proyecto asociado (Epic)**, su **responsable asignado**, su **fecha de vencimiento** (se ve en rojo si ya venció y la tarea no está Done), ver/sumar/editar/eliminar el tiempo registrado (worklogs), y **ver/agregar/eliminar comentarios con formato enriquecido e imágenes adjuntas** (se reflejan directo en Jira) — todo con confirmación antes de aplicar, haciendo clic directo sobre la celda correspondiente. Con checkboxes puedes seleccionar varios issues y aplicarles **acciones masivas**: cambiar el estado de todos a la vez (solo ofrece estados que todos los seleccionados puedan alcanzar), moverlos juntos a otro sprint, o mandarlos al backlog. Arriba hay un interruptor **Sprint / Backlog** para alternar entre las tareas del sprint seleccionado y el backlog del board (los Epics se omiten del backlog porque en este proyecto funcionan como contenedores, no como tareas), y un control de **ancho** (Normal / Ancho / Completo) para evitar el scroll horizontal.
- **Reporte**: dashboard del sprint seleccionado — % completado, issues por estado y por tipo, horas registradas totales, por proyecto (Epic) y por persona. Los mismos filtros de proyecto/usuario del Tablero aplican aquí, para ver por ejemplo las horas de una persona en un proyecto específico, en cualquier sprint.

La pestaña activa, el sprint seleccionado y los filtros de Tablero/Reporte se recuerdan entre sesiones (guardados en tu navegador) — al reabrir la app, retoma donde la dejaste.

**Forma más fácil — doble clic en `Iniciar-App.bat`:**
Instala las dependencias solo si faltan, levanta server + frontend juntos y abre tu navegador automáticamente en `http://localhost:5173`. Para cerrar la app, cierra la ventana de terminal que se abre (o Ctrl+C ahí).

Tip: crea un acceso directo de `Iniciar-App.bat` en tu escritorio (clic derecho → Enviar a → Escritorio) para abrirla con un solo doble clic.

**Forma manual (por terminal):**
```bash
npm install
cd client
npm install
cd ..
npm run app
```

Esto abre:
- API en `http://localhost:4000`
- Interfaz visual en `http://localhost:5173` ← abre esta en tu navegador

También puedes correrlos por separado con `npm run server` y `npm run client`.

### Nota sobre imágenes

Jira **no permite incrustar imágenes dentro del texto** a través de su API pública: el formato ADF exige un UUID de Media Services que la API REST no expone (el id numérico del adjunto se rechaza con `ATTACHMENT_VALIDATION_ERROR`). Lo que sí funciona y es lo que hace la app:

- La imagen se **sube como adjunto del issue** (aparece en la sección de adjuntos en Jira).
- En el texto del comentario queda un **enlace** a esa imagen, que dentro de Jira abre el archivo.
- Dentro de esta app la imagen sí se ve embebida (el servidor la sirve autenticada mediante `/api/attachments/:id/content`).

Por eso el editor de la pantalla "Crear tarea" no ofrece subir imágenes: el issue todavía no existe y no hay dónde adjuntarlas. Se agregan después desde los comentarios en el Tablero.

## Scopes del token requeridos

Cada persona genera su **propio token** en [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) con estos scopes (los scopes no se pueden agregar después de creado el token — inclúyelos todos desde el principio):

- `read:jira-work`
- `write:jira-work`
- `read:jira-user`
- `read:issue-details:jira`
- `read:board-scope:jira-software`
- `read:sprint:jira-software`
- `write:sprint:jira-software`
- `read:issue:jira-software`
- `read:epic:jira-software`
- `write:issue-worklog:jira`
- `write:board-scope:jira-software` → mover issues de un sprint al backlog (la dirección backlog → sprint funciona sin este scope)

Todos están confirmados funcionando (crear tareas, asignar sprint/epic/participante, registrar tiempo, cambiar estado, mover de sprint, acciones masivas). Si en el futuro una llamada nueva falla con 401/403, el error del aplicativo indica qué revisar.

## Compartir el proyecto con un compañero

El proyecto vive en un repositorio de GitHub, así que compartirlo es clonarlo — nada de enviar carpetas ni `.zip` por correo. Nada de lo que configure cada quien afecta al otro: cada uno corre su propia copia en su propia máquina, con su propio token. Lo único que comparten es Jira mismo (igual que ya lo comparten hoy usando la web de Jira).

1. Asegúrate de que la persona tenga acceso al repositorio (colaborador si es privado; si es público no hace falta nada).
2. Que clone el proyecto:
   ```bash
   git clone https://github.com/keyhm/jira-automatizacion.git
   cd jira-automatizacion
   ```
3. Sigue los pasos de "Instalación" y "Configuración" de arriba con sus propios datos:
   - `JIRA_DOMAIN`, `JIRA_PROJECT_KEY`, `JIRA_BOARD_ID` → **los mismos que los tuyos** (es el mismo equipo/proyecto de Jira).
   - `JIRA_EMAIL` → su propio correo de Atlassian.
   - `JIRA_API_TOKEN` → un token **generado por él/ella**, con los mismos scopes de la lista de arriba.
4. Abre `Iniciar-App.bat` — instala las dependencias la primera vez y arranca la app.

### Actualizaciones automáticas

Como el proyecto se clonó con git (no se copió como `.zip`), **`Iniciar-App.bat` revisa y trae automáticamente los cambios nuevos cada vez que se abre** — no hace falta que nadie sepa usar git ni corra comandos manuales:
- Si hay cambios nuevos en el repositorio, los descarga antes de arrancar.
- Si esos cambios agregaron alguna dependencia nueva, la instala sola.
- Si no hay conexión a internet, o si esa persona modificó archivos localmente sin guardarlos como commit, simplemente arranca con la versión que ya tenía, sin romper nada.

Esto es "automático" en el sentido de que no requiere acción manual — pero solo revisa cuando se abre la app, no en segundo plano todo el tiempo. Si alguien tiene la app abierta hace horas y tú publicas un cambio, lo recibe la próxima vez que la cierre y la vuelva a abrir.
