// Reglas de gestión de Jira vigentes desde el sprint 112 (24/11/2026).
// Detalle completo en REGLAS-JIRA-SPRINT-112.md (raíz del proyecto).

function norm(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// ───────── Estados (5 columnas) ─────────

export const STATUS_ORDER = ['doing', 'review', 'blocked', 'todo', 'done'];

export const STATUS_META = {
  todo: { label: 'Por hacer', badge: 'bg-slate-100 text-slate-600', bar: 'bg-slate-400' },
  doing: { label: 'En progreso', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500' },
  review: { label: 'En revisión', badge: 'bg-violet-100 text-violet-700', bar: 'bg-violet-500' },
  blocked: { label: 'Bloqueada', badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500' },
  done: { label: 'Hecha', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
};

/**
 * Clave interna del estado. Se resuelve por nombre (en español o inglés) porque
 * "En progreso", "En revisión" y "Bloqueada" comparten la categoría de Jira
 * "indeterminate"; si el nombre no se reconoce, se cae a la categoría.
 */
export function statusKey(name, category) {
  const n = norm(name);
  if (['por hacer', 'to do', 'todo'].includes(n)) return 'todo';
  if (['en progreso', 'in progress'].includes(n)) return 'doing';
  if (['en revision', 'in review', 'review'].includes(n)) return 'review';
  if (['bloqueada', 'bloqueado', 'blocked'].includes(n)) return 'blocked';
  if (['hecha', 'hecho', 'done'].includes(n)) return 'done';
  if (category === 'done') return 'done';
  if (category === 'indeterminate') return 'doing';
  return 'todo';
}

export function statusMeta(issueOrName, category) {
  const key =
    typeof issueOrName === 'object'
      ? statusKey(issueOrName.status, issueOrName.statusCategory)
      : statusKey(issueOrName, category);
  return { key, ...STATUS_META[key] };
}

// ───────── Horas ─────────

export function fmtHours(seconds) {
  const h = (seconds || 0) / 3600;
  return `${Math.round(h * 100) / 100}h`;
}

// Formato Jira: 4h · 1d 4h · 30m (1d = 8h)
export const ESTIMATE_FORMAT = /^(\d+[wdhm]\s*)+$/i;

// ───────── Proyectos a cargo de cada QA ─────────
// Cada persona elige los suyos en la app («Mis proyectos») y se guardan solo en
// su navegador. Un proyecto es { id, label, epicKey, keywords }:
//  - epicKey: épica de Jira (la tarea pertenece si cuelga de esa épica)
//  - keywords: palabras del título o de la épica, para tareas sin épica
//    (igual que la corrección automática de Jira)

export function matchesProject(issue, project) {
  if (project.epicKey && issue.epic?.key === project.epicKey) return true;
  const keywords = (project.keywords || []).filter(Boolean);
  if (keywords.length === 0) return false;
  const haystack = norm(`${issue.epic?.summary || ''} ${issue.summary || ''}`);
  return keywords.some((k) => haystack.includes(norm(k)));
}

export function matchesAnyProject(issue, projects) {
  return projects.some((p) => matchesProject(issue, p));
}

// ───────── Alertas de cumplimiento ─────────

export const ALERT_META = {
  sin_estimacion: { label: 'Sin estimación original', level: 'high', hint: 'Es del líder o QA del proyecto: ponla con el plan de trabajo.' },
  progreso_sin_horas: { label: 'En progreso sin horas registradas', level: 'medium', hint: 'Sin horas se ve como si no hubiera avanzado.' },
  varias_en_progreso: { label: 'Más de una tarea En progreso', level: 'medium', hint: 'Solo una En progreso por persona: la que trabaja ahora.' },
  revision_sin_comentario: { label: 'En revisión sin comentario', level: 'medium', hint: 'Falta qué se entregó, cómo probarlo y @mención a quien revisa.' },
  bloqueada_sin_comentario: { label: 'Bloqueada sin comentario', level: 'high', hint: 'Falta qué falta y de quién (@mención).' },
  hecha_sin_comentario: { label: 'Hecha sin comentario de solución', level: 'high', hint: 'Sin comentario de solución no cuenta como hecha.' },
  por_hacer_vencida: { label: 'Por hacer y ya debió arrancar', level: 'medium', hint: 'Llegó su fecha y sigue en Por hacer.' },
  vencida: { label: 'Vencida sin terminar', level: 'medium', hint: 'Pasó la fecha y no está Hecha.' },
  horas_exceden: { label: 'Horas superan la estimación', level: 'medium', hint: 'No cambies la estimación solo: concilia con el QA con comentario.' },
  sin_responsable: { label: 'Sin responsable', level: 'low', hint: 'Jira la asigna sola al creador pasadas 24 h.' },
  sin_epica: { label: 'Sin épica', level: 'low', hint: 'Jira la corrige sola por palabras clave.' },
  sin_fecha: { label: 'Sin fecha', level: 'low', hint: 'Jira le pone el lunes del cierre del sprint (o hoy + 45 días en backlog). Las subtareas siguen a su tarea.' },
  enlace_sin_dueno: { label: 'Enlace «Blocks» con tarea sin responsable o sin fecha', level: 'medium', hint: 'Las dos tareas enlazadas necesitan dueño y fecha.' },
  bloqueo_resuelto: { label: 'Bloqueada, pero lo que la frenaba ya terminó', level: 'medium', hint: 'Quien terminó la otra avisa con @mención; revisa si ya puede seguir.' },
  espera_sin_bloqueo: { label: 'Su dependencia sigue abierta y no está Bloqueada', level: 'low', hint: 'Si ya empezó y se frenó por esa dependencia, pasa a Bloqueada con comentario y @mención.' },
};

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Devuelve { [issueKey]: [codigoAlerta, ...] }.
 * Nota: el conteo de comentarios no distingue su contenido; sirve para detectar
 * el caso más claro (ninguno), no para validar que el comentario sea bueno.
 */
export function computeAlerts(issues) {
  const today = todayIso();
  const doingByAssignee = {};
  issues.forEach((i) => {
    if (statusKey(i.status, i.statusCategory) === 'doing') {
      const id = i.assignee?.accountId || 'none';
      doingByAssignee[id] = (doingByAssignee[id] || 0) + 1;
    }
  });

  const result = {};
  issues.forEach((i) => {
    const key = statusKey(i.status, i.statusCategory);
    const alerts = [];
    const open = key !== 'done';

    if (open && !i.originalSeconds) alerts.push('sin_estimacion');
    if (key === 'doing' && !i.secondsLogged) alerts.push('progreso_sin_horas');
    if (key === 'doing' && doingByAssignee[i.assignee?.accountId || 'none'] > 1) alerts.push('varias_en_progreso');
    if (key === 'review' && !i.commentCount) alerts.push('revision_sin_comentario');
    if (key === 'blocked' && !i.commentCount) alerts.push('bloqueada_sin_comentario');
    if (key === 'done' && !i.commentCount) alerts.push('hecha_sin_comentario');
    if (key === 'todo' && i.dueDate && i.dueDate <= today) alerts.push('por_hacer_vencida');
    if (open && key !== 'todo' && i.dueDate && i.dueDate < today) alerts.push('vencida');
    if (open && i.originalSeconds && i.secondsLogged > i.originalSeconds) alerts.push('horas_exceden');
    if (open && !i.assignee) alerts.push('sin_responsable');
    if (open && !i.epic) alerts.push('sin_epica');
    if (open && !i.subtask && !i.dueDate) alerts.push('sin_fecha');

    const links = i.links || [];
    const blockers = links.filter((l) => l.direction === 'blockedBy');
    if (open && links.some((l) => !l.assignee)) alerts.push('enlace_sin_dueno');
    if (open && key === 'blocked' && blockers.length > 0 && blockers.every((l) => l.statusCategory === 'done')) {
      alerts.push('bloqueo_resuelto');
    }
    if (open && key === 'doing' && blockers.some((l) => l.statusCategory !== 'done')) alerts.push('espera_sin_bloqueo');

    if (alerts.length) result[i.key] = alerts;
  });
  return result;
}

// ───────── Ritmo del sprint ─────────

/** % del sprint transcurrido según sus fechas (0–100). */
export function sprintElapsedPct(sprint) {
  if (!sprint?.startDate || !sprint?.endDate) return null;
  const start = new Date(sprint.startDate).getTime();
  const end = new Date(sprint.endDate).getTime();
  if (!(end > start)) return null;
  return Math.max(0, Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100)));
}

export function summarize(issues) {
  const byKey = { todo: 0, doing: 0, review: 0, blocked: 0, done: 0 };
  let estimated = 0;
  let logged = 0;
  let remaining = 0;
  let moving = 0;
  issues.forEach((i) => {
    const key = statusKey(i.status, i.statusCategory);
    byKey[key] += 1;
    estimated += i.originalSeconds || 0;
    logged += i.secondsLogged || 0;
    remaining += i.remainingSeconds || 0;
    if (key !== 'done' && (key === 'doing' || i.secondsLogged > 0)) moving += 1;
  });
  const total = issues.length;
  return {
    total,
    byKey,
    estimated,
    logged,
    remaining,
    moving,
    open: total - byKey.done,
    pctDone: total ? Math.round((byKey.done / total) * 100) : 0,
    pctHours: estimated ? Math.min(100, Math.round((logged / estimated) * 100)) : null,
  };
}

export function jiraIssueUrl(key) {
  return `https://${import.meta.env.VITE_JIRA_DOMAIN || ''}/browse/${key}`;
}
