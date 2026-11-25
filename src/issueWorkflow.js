const { getClient } = require('./jiraClient');

function throwApiError(error, action) {
  if (error.response && [401, 403].includes(error.response.status)) {
    throw new Error(
      `${action} falló (${error.response.status}). Revisa el scope write:issue:jira o write:jira-work.`
    );
  }
  const details = error.response?.data ? ` ${JSON.stringify(error.response.data)}` : '';
  throw new Error(`${action} falló.${details}`);
}

async function getTransitions(issueKey) {
  const client = await getClient();
  try {
    const { data } = await client.get(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`);
    // "to" es el nombre del estado tal como esté configurado en el workflow de
    // cada quien (puede estar en español, inglés, o ser un nombre a medida);
    // "toCategory" es new/indeterminate/done, siempre igual sin importar el
    // idioma — es lo que hay que usar para comparar estados entre workflows.
    return data.transitions.map((t) => ({
      id: t.id,
      name: t.name,
      to: t.to.name,
      toCategory: t.to.statusCategory?.key,
    }));
  } catch (error) {
    throwApiError(error, `La consulta de transiciones de ${issueKey}`);
  }
}

async function transitionIssue(issueKey, transitionId) {
  const client = await getClient();
  try {
    await client.post(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
      transition: { id: transitionId },
    });
  } catch (error) {
    throwApiError(error, `El cambio de estado de ${issueKey}`);
  }
}

// Orden del tablero (izquierda a derecha) para mostrar los estados siempre igual.
const KANBAN_ORDER = ['por hacer', 'en progreso', 'en revision', 'bloqueada', 'hecha'];

function kanbanRank(statusName) {
  const i = KANBAN_ORDER.indexOf(normName(statusName));
  return i === -1 ? KANBAN_ORDER.length : i;
}

// Devuelve los ESTADOS destino (no los nombres de transición) comunes a todas
// las tareas. Los nombres de transición pueden seguir en inglés ("To Do",
// "In Progress") aunque el estado ya esté en español.
async function getCommonTransitions(issueKeys) {
  const perIssue = await Promise.all(
    issueKeys.map(async (key) => ({ key, transitions: await getTransitions(key) }))
  );
  const nameSets = perIssue.map((p) => new Set(p.transitions.map((t) => t.to)));
  return [...nameSets[0]]
    .filter((name) => nameSets.every((set) => set.has(name)))
    .sort((a, b) => kanbanRank(a) - kanbanRank(b));
}

async function bulkTransition(issueKeys, targetStatusName) {
  const results = [];
  for (const key of issueKeys) {
    try {
      const transitions = await getTransitions(key);
      const match =
        transitions.find((t) => t.to === targetStatusName) ||
        transitions.find((t) => t.name === targetStatusName);
      if (!match) throw new Error(`No hay transición a "${targetStatusName}" disponible para ${key}.`);
      await transitionIssue(key, match.id);
      results.push({ key, ok: true });
    } catch (error) {
      results.push({ key, ok: false, error: error.message });
    }
  }
  return results;
}

/**
 * Elige la transición para una categoría de Jira (new/indeterminate/done).
 * Desde el sprint 112 hay tres estados "indeterminate" (En progreso, En revisión,
 * Bloqueada): para esa categoría se prefiere "En progreso" y solo si no existe
 * se cae al primero de la categoría. Así una tarea nueva nunca queda en
 * "Bloqueada" o "En revisión" por accidente.
 */
function pickTransitionForCategory(transitions, category) {
  const matches = transitions.filter((t) => t.toCategory === category);
  if (category !== 'indeterminate') return matches[0];
  const inProgress = matches.find((t) => /progres/i.test(t.to));
  return inProgress || matches[0];
}

const STATUS_NAMES = {
  todo: ['por hacer', 'to do'],
  doing: ['en progreso', 'in progress'],
  review: ['en revision', 'in review'],
  blocked: ['bloqueada', 'bloqueado', 'blocked'],
  done: ['hecha', 'hecho', 'done'],
};
const STATUS_FALLBACK_CATEGORY = { todo: 'new', doing: 'indeterminate', done: 'done' };

function normName(text) {
  return (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Elige la transición para un estado inicial pedido al crear una tarea.
 * `status` es una clave de estado (todo, doing, review, blocked, done) y se
 * resuelve por el NOMBRE del estado destino; si el nombre no existe en el
 * workflow se cae a la categoría (solo para todo/doing/done). También acepta
 * las categorías antiguas (new, indeterminate, done).
 */
function pickTransitionForStatus(transitions, status) {
  const names = STATUS_NAMES[status];
  if (!names) return pickTransitionForCategory(transitions, status);
  const byName = transitions.find((t) => names.includes(normName(t.to)));
  if (byName) return byName;
  const category = STATUS_FALLBACK_CATEGORY[status];
  return category ? pickTransitionForCategory(transitions, category) : undefined;
}

module.exports = {
  getTransitions,
  transitionIssue,
  getCommonTransitions,
  bulkTransition,
  pickTransitionForCategory,
  pickTransitionForStatus,
};
