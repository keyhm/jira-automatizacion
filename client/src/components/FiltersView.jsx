import { useMemo } from 'react';
import IssueTable from './IssueTable';
import useSprintIssues from '../hooks/useSprintIssues';
import useLocalStorageState from '../hooks/useLocalStorageState';
import { STATUS_ORDER, computeAlerts, matchesAnyProject, statusKey } from '../lib/workflow';

// Réplica de los seis filtros guardados de Jira «JS · 1» a «JS · 6».
const FILTERS = [
  { id: 1, label: 'Mi sprint', help: 'Lo tuyo en el sprint seleccionado, por estado y fecha. Para mirar cada mañana.', source: 'sprint' },
  { id: 2, label: 'Mi backlog', help: 'Lo tuyo que está en el backlog (sin sprint).', source: 'backlog' },
  { id: 3, label: 'Sprint, todo el equipo', help: 'Todas las tareas del sprint seleccionado, agrupadas por responsable.', source: 'sprint' },
  { id: 4, label: 'En revisión', help: 'Lo que ya entregó el dev y espera a quien debe revisarla.', source: 'sprint' },
  { id: 5, label: 'Bloqueadas', help: 'Lo que no puede avanzar por algo externo, con comentario de qué falta y de quién.', source: 'sprint' },
  { id: 6, label: 'Sin estimación', help: 'Tareas abiertas del sprint sin estimación original. Es del líder o QA de cada proyecto: debe quedar vacío.', source: 'sprint' },
];

function byStatusThenDate(a, b) {
  const sa = STATUS_ORDER.indexOf(statusKey(a.status, a.statusCategory));
  const sb = STATUS_ORDER.indexOf(statusKey(b.status, b.statusCategory));
  if (sa !== sb) return sa - sb;
  return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
}

export default function FiltersView({ sprint, selectedSprintId, me, qaProjects }) {
  const [filterId, setFilterId] = useLocalStorageState('jira-qa:filters:id', 1);
  const [onlyQa, setOnlyQa] = useLocalStorageState('jira-qa:filters:onlyQa', false);

  const filter = FILTERS.find((f) => f.id === filterId) || FILTERS[0];
  const { issues, loading, error, patchIssue } = useSprintIssues(selectedSprintId, filter.source);

  const rows = useMemo(() => {
    let list = issues;
    if ([1, 2].includes(filter.id)) {
      list = list.filter((i) => me && i.assignee?.accountId === me.accountId);
    } else if (onlyQa) {
      list = list.filter((i) => matchesAnyProject(i, qaProjects));
    }
    if (filter.id === 4) list = list.filter((i) => statusKey(i.status, i.statusCategory) === 'review');
    if (filter.id === 5) list = list.filter((i) => statusKey(i.status, i.statusCategory) === 'blocked');
    if (filter.id === 6) {
      list = list.filter((i) => !i.originalSeconds && statusKey(i.status, i.statusCategory) !== 'done');
    }
    if (filter.id === 3) {
      return [...list].sort(
        (a, b) =>
          (a.assignee?.displayName || '~').localeCompare(b.assignee?.displayName || '~') || byStatusThenDate(a, b)
      );
    }
    return [...list].sort(byStatusThenDate);
  }, [issues, filter.id, me, onlyQa, qaProjects]);

  const alertsByKey = useMemo(() => computeAlerts(rows), [rows]);

  // Filtro 3: separar por responsable con un encabezado por persona.
  const groups = useMemo(() => {
    if (filter.id !== 3) return null;
    const map = new Map();
    rows.forEach((i) => {
      const name = i.assignee?.displayName || 'Sin asignar';
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(i);
    });
    return [...map.entries()];
  }, [rows, filter.id]);

  const showsSprintWarning = filter.source === 'sprint' && sprint && sprint.state !== 'active';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterId(f.id)}
            className={`rounded-full border-2 px-4 py-1.5 text-sm font-medium transition ${
              filter.id === f.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white/70 text-slate-500 hover:border-slate-300'
            }`}
          >
            JS · {f.id}. {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{filter.help}</p>
        {![1, 2].includes(filter.id) && (
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={onlyQa}
              onChange={(e) => setOnlyQa(e.target.checked)}
              className="rounded border-slate-300"
            />
            Solo mis proyectos
            {qaProjects.length === 0 && <span className="text-xs text-slate-400">(elígelos en Panel QA → Mis proyectos)</span>}
          </label>
        )}
      </div>

      {showsSprintWarning && (
        <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Estás viendo el sprint «{sprint.name}», que no es el activo. En Jira estos filtros siempre miran el sprint activo.
        </p>
      )}
      {filter.id === 2 && !me && <p className="text-sm text-slate-400">Identificando tu usuario…</p>}
      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">{error}</p>}
      {loading && <p className="py-10 text-center text-slate-400">Cargando…</p>}

      {!loading && !error && (
        <>
          <p className="text-xs text-slate-400">{rows.length} tarea{rows.length === 1 ? '' : 's'}</p>
          {groups ? (
            <div className="space-y-6">
              {groups.map(([name, list]) => (
                <div key={name} className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    {name} <span className="font-normal text-slate-400">· {list.length}</span>
                  </h3>
                  <IssueTable issues={list} alertsByKey={alertsByKey} onPatch={patchIssue} showAssignee={false} />
                </div>
              ))}
              {groups.length === 0 && (
                <IssueTable issues={[]} onPatch={patchIssue} emptyText="No hay tareas en este sprint." />
              )}
            </div>
          ) : (
            <IssueTable
              issues={rows}
              alertsByKey={alertsByKey}
              onPatch={patchIssue}
              emptyText={filter.id === 6 ? 'Todo estimado. 👌' : 'No hay tareas con este filtro.'}
            />
          )}
        </>
      )}
    </div>
  );
}
