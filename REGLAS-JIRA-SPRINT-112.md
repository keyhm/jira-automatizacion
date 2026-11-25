# Reglas de gestión de Jira — vigentes desde el sprint 112

**Vigentes desde:** sprint 112 (24 al 30/11/2026) · **Aplican a:** proyecto JS, todo el equipo de desarrollo y QA · **Se revisan:** en cada planning (lo que no funcione se ajusta; los cambios se anuncian antes de regir).

Fuentes: *Cómo gestionamos el tablero y el avance de las tareas, desde el sprint 112* y *Diapositivas – Cambios en Jira (sprint 112)*, ambos del 24/11/2026.

> Mi rol: QA responsable en Jira de **OPIN** y **Lalexpo**. Lo que dice «el QA del proyecto» en estas reglas, en esos dos proyectos, soy yo.

---

## 1. Para qué

Ver el avance de **cada tarea** mientras pasa el sprint, no enterarse en la daily de que algo no arrancó. Para eso: tablero con estados claros, estimación de horas en cada tarea y comentario de avance cuando la tarea se mueve.

## 2. Tablero Kanban (5 columnas)

| # | Columna | Qué significa | Quién la mueve y cuándo |
|---|---|---|---|
| 1 | **Por hacer** | Asignada y planificada, aún no arranca | Nace aquí |
| 2 | **En progreso** | Alguien trabaja en ella **hoy** | Su dueño, el día que la empieza, con comentario de qué va a hacer |
| 3 | **En revisión** | El dev entregó y espera a quien debe revisarla o probarla (QA del proyecto u otra persona). Le toca a quien revisa | Su dueño, al terminar su parte: comentario de qué entregó, cómo probarlo y **@mención** a quien revisa. Luego la mueve quien revisa |
| 4 | **Bloqueada** | No avanza por algo externo (acceso, respuesta, otra tarea). Está del lado de quien debe desbloquearla | Su dueño, apenas se bloquea: comentario de **qué falta y de quién** (@mención) |
| 5 | **Hecha** | Terminada y verificada | Su dueño, con **comentario de solución** (qué se hizo y cómo se comprobó) |

**De quién es cada columna:** Por hacer y En progreso → del dev asignado. En revisión → de quien debe revisarla (@mención): la pasa a Hecha o la devuelve a En progreso con comentario de qué falló. Bloqueada → de quien debe desbloquearla; el QA del proyecto le da seguimiento en la daily. Hecha → de nadie.

**Reglas del tablero**

- Una tarea asignada está en «Por hacer» hasta que se empieza. Quedarse ahí no es problema; lo es que pase la fecha en que debía arrancar.
- **Una sola tarea en «En progreso» por persona:** la que se trabaja en este momento. Si cambia de tarea, la anterior pasa a En revisión, Bloqueada o Por hacer, y lo dice en un comentario.
- «Bloqueada» no es sala de espera: quien la bloquea avisa en el grupo del proyecto a quién necesita (@mención).
- «Hecha» sin comentario de solución no cuenta.
- **Nada pasa al backlog sin autorización de Alexander** (en la planning o en una daily).

## 3. Estimación y avance

- Cada tarea del sprint lleva una **estimación original en horas**, que se pone al planear (es el tiempo que cabe en el plan de trabajo, no una promesa). Formato: `4h`, `1d` (= 8 horas), `1d 4h`, `30m`.
- **La estimación sale del plan de trabajo que propone QA.** El responsable de que cada tarea tenga estimación es **el líder o el QA asignado a cada proyecto**, no el dev. La persona que desarrolla la revisa el mismo día: si el tiempo no le alcanza, lo dice y se concilia (QA + dev) antes de dar la tarea por planeada.
- **Registro de horas:** a diario, en la tarea en que se trabajó, con la fecha del día. Una tarea sin horas se ve como si no hubiera avanzado.
- **Los cambios de estimación (original o restante) no son a discreción: se concilian.** Se deja un comentario en la tarea con @mención al QA del proyecto (y se avisa a Alexander) explicando qué cambió y cuánto se cree que falta. El tiempo restante no se cambia por cuenta propia: Jira solo descuenta lo registrado y no sabe si la tarea realmente avanza.
- Si la estimación estaba mal no es un error: es información para planear mejor, y se ajusta por este mismo camino.
- **El progreso de cada proyecto lo llevan los QA**, con base en lo que cada dev registra (estado, comentarios y horas). Si no se registra avance, en la planning la tarea se ve como incumplida o no avanzada.
- Lo que se mira: cuánto va transcurrido del sprint, cuánto se ha registrado y cuántas tareas están realmente en movimiento. **No se usa para comparar personas.**

## 4. Qué hace cada uno cada día

- **Al empezar el día:** pasa a En progreso la tarea que arranca y deja un comentario corto con lo que va a hacer.
- **Durante el día:** registra las horas de lo trabajado.
- **Antes de la daily:** comentario de avance en cada tarea en que trabaja (qué se hizo, qué sigue, qué lo frena).
- **Al terminar:** En revisión o Hecha, con comentario de solución.
- **Si se bloquea:** Bloqueada y @mención a quien necesita, en ese momento.

## 5. Bug o cambio de prioridades

El plan cubre la capacidad de la semana; si entra algo, **algo tiene que salir**:

- La tarea que se reemplaza baja al backlog con comentario: **por qué sale, cuándo se retoma y nueva fecha estimada**.
- Lo que no hace parte del plan del sprint no entra al sprint: va al backlog y se retoma en el siguiente, dando prioridad a seguridad.
- Nada baja al backlog sin autorización de Alexander (planning, daily o chat del equipo con @mención). Quien la baja deja el comentario en ese momento.

**Dependencias entre tareas:** se enlazan con «Blocks» (*Link work item*); las dos con dueño y fecha; el enlace no mueve estados solo (si la que espera ya empezó y se frenó, pasa a Bloqueada con comentario y @mención); quien termina la que bloquea avisa con @mención al dueño de la que esperaba.

## 6. Lo que Jira corrige solo (revisión cada 15 minutos)

Cada cambio deja un comentario en la tarea. Lo mejor es crearla completa.

| Situación | Qué hace Jira |
|---|---|
| Sin responsable por más de 24 h | La asigna a quien la creó |
| Perdió a su responsable | Vuelve al último que la tuvo (de inmediato si estaba En progreso; a las 24 h si estaba Por hacer) |
| Sin épica | Por palabras clave del título (Lalexpo, TWL…) o la épica base de su responsable. Nunca cambia una épica existente |
| Sin fecha en el sprint activo | Lunes de cierre del sprint |
| Sin fecha en el backlog | Hoy + 45 días |
| Subtareas | No reciben fecha propia: siguen a su tarea |

## 7. Seis filtros guardados en Jira («Filters» → «JS ·»)

| Filtro | Para qué |
|---|---|
| JS · 1. Mi sprint | Lo mío en el sprint activo, por estado y fecha. **Mirarlo cada mañana** |
| JS · 2. Mi backlog | Lo mío en el backlog (sin sprint) |
| JS · 3. Sprint activo, todo el equipo | Todas las tareas del sprint, por responsable |
| JS · 4. En revisión | Lo entregado que espera a quien debe revisarlo |
| JS · 5. Bloqueadas | Lo que no avanza, con comentario de qué falta y de quién |
| JS · 6. Sin estimación | Tareas del sprint sin estimación original. **Es del líder/QA de cada proyecto: debe quedar vacío** |

---

## Mi rutina como QA de OPIN y Lalexpo (propuesta de trabajo, no regla oficial)

**En la planning (o antes de dar el sprint por planeado)**
1. Filtro JS · 6 (o *Panel QA → Sin estimación*): estimar todo lo de OPIN y Lalexpo con el plan de trabajo. Debe quedar vacío.
2. Conciliar con el dev el mismo día cualquier estimación que no le alcance.
3. Confirmar que nada baje al backlog sin autorización de Alexander.

**Cada día**
1. Mañana: JS · 4 (*En revisión*) → revisar lo entregado de mis proyectos y pasar a Hecha o devolver a En progreso con comentario de qué falló.
2. Antes de la daily: JS · 5 (*Bloqueadas*) → confirmar que cada una tiene qué falta + @mención; llevar los bloqueos a la daily.
3. Mirar el *Panel QA → Ritmo del sprint* y las alertas (sin horas, sin comentario, vencidas).
4. En la daily: enfocarse en En progreso, Bloqueadas y lo que debió arrancar y no lo hizo.

**Al cierre del sprint**
- Revisar el avance de OPIN y Lalexpo con lo registrado por los devs (estado, comentarios, horas) y llevar a la planning lo que quedó incumplido o no avanzado.

**Mis propias tareas:** mismas reglas (una sola En progreso, horas a diario, comentario de solución al cerrar; las horas las registro yo).

## Cómo lo apoya la aplicación local (jira-automation-qa)

- **Panel QA:** OPIN / Lalexpo / ambos — tiles (sin estimación, en revisión, bloqueadas, alertas), ritmo del sprint, quién tiene qué por estado y listas accionables.
- **Filtros JS:** réplica de los seis filtros (1 a 6) dentro de la app.
- **Tablero:** colores por estado (5 estados), columna de estimación (horas registradas / original / restante) y alertas por tarea.
- **Crear tarea:** campo de estimación original.
- **Alertas de cumplimiento** (en Panel QA, Filtros y Tablero): sin estimación, En progreso sin horas, más de una En progreso por persona, En revisión / Bloqueada / Hecha sin comentario, Por hacer que ya debió arrancar, vencidas, horas por encima de la estimación, sin responsable, sin épica. El conteo de comentarios no distingue su contenido: detecta que *no hay ninguno*, no que el comentario sea bueno.
