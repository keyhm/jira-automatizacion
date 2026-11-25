import { useMemo, useState } from 'react';
import IssueTable from './IssueTable';
import QaProjectsEditor from './QaProjectsEditor';
import useSprintIssues from '../hooks/useSprintIssues';
import useLocalStorageState from '../hooks/useLocalStorageState';
import {
  ALERT_META,
  STATUS_META,
  STATUS_ORDER,
  computeAlerts,
  fmtHours,
  jiraIssueUrl,
  matchesProject,
  sprintElapsedPct,
  statusKey,
  summarize,
} from '../lib/workflow';

function Tile({ label, value, accent = 'text-slate-800', sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-center shadow-sm">
      <p className={`text-3xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function PaceBar({ label, pct, color, detail }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>{pct === null ? 'sin datos' : `${pct}%`}{detail ? ` · ${detail}` : ''}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct ?? 0}%` }} />
      </div>
    </div>
  );
}

function Section({ title, subtitle, count, tone = 'slate', children }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    red: 'bg-red-100 text-red-700',
    violet: 'bg-violet-100 text-violet-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${count ? tones[tone] : tones.slate}`}>{count}</span>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

export default function QAPanelView({ sprint, selectedSprintId, epics, qaProjects, setQaProjects }) {
  const { issues, loading, error, patchIssue } = useSprintIssues(selectedSprintId, 'sprint');
  const [projectId, setProjectId] = useLocalStorageState('jira-qa:qa:project', 'todos');
  const [editingProjects, setEditingProjects] = useState(false);

  // Si el proyecto guardado ya no está en «Mis proyectos», se vuelve a «Todos».
  const activeId = qaProjects.some((p) => p.id === projectId) ? projectId : 'todos';
  const noProjects = qaProjects.length === 0;

  const scoped = useMemo(() => {
    const projects = activeId === 'todos' ? qaProjects : qaProjects.filter((p) => p.id === activeId);
    return issues.filter((i) => projects.some((p) => matchesProject(i, p)));
  }, [issues, activeId, qaProjects]);

  const alertsByKey = useMemo(() => computeAlerts(scoped), [scoped]);
  const summary = useMemo(() => summarize(scoped), [scoped]);
  const elapsed = sprintElapsedPct(sprint);

  const withoutEstimate = scoped.filter((i) => !i.originalSeconds && statusKey(i.status, i.statusCategory) !== 'done');
  const inReview = scoped.filter((i) => statusKey(i.status, i.statusCategory) === 'review');
  const blocked = scoped.filter((i) => statusKey(i.status, i.statusCategory) === 'blocked');

  const alertGroups = useMemo(() => {
    const groups = {};
    Object.entries(alertsByKey).forEach(([key, codes]) => {
      codes.forEach((code) => {
        if (!groups[code]) groups[code] = [];
        groups[code].push(scoped.find((i) => i.key === key));
      });
    });
    const order = { high: 0, medium: 1, low: 2 };
    return Object.entries(groups).sort(
      (a, b) => order[ALERT_META[a[0]].level] - order[ALERT_META[b[0]].level] || b[1].length - a[1].length
    );
  }, [alertsByKey, scoped]);
  const totalAlerts = Object.values(alertsByKey).reduce((n, codes) => n + codes.length, 0);

  // Por persona: solo conteos por estado (sin ranking ni comparaciones entre personas).
  const people = useMemo(() => {
    const map = {};
    scoped.forEach((i) => {
      const name = i.assignee?.displayName || 'Sin asignar';
      if (!map[name]) map[name] = { name, todo: 0, doing: 0, review: 0, blocked: 0, done: 0, logged: 0, estimated: 0 };
      map[name][statusKey(i.status, i.statusCategory)] += 1;
      map[name].logged += i.secondsLogged || 0;
      map[name].estimated += i.originalSeconds || 0;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [scoped]);

  const paceHint =
    elapsed !== null && summary.pctHours !== null && summary.pctHours + 15 < elapsed
      ? 'El registro de horas va por debajo del tiempo transcurrido: revisa en la daily quién no ha registrado.'
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!noProjects && (
            <div className="inline-flex flex-wrap rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-slate-200">
              {[
                ...(qaProjects.length > 1 ? [{ id: 'todos', label: 'Todos' }] : []),
                ...qaProjects.map((p) => ({ id: p.id, label: p.label })),
              ].map((o) => (
                <button
                  key={o.id}
                  onClick={() => setProjectId(o.id)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    (qaProjects.length > 1 ? activeId : qaProjects[0].id) === o.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setEditingProjects((v) => !v)}
            className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            ⚙ Mis proyectos
          </button>
        </div>
        <span className="text-xs text-slate-400">{sprint?.name}</span>
      </div>

      {(editingProjects || noProjects) && (
        <>
          {noProjects && (
            <p className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              Elige los proyectos de los que eres QA para ver su panel. Solo tú lo ves así: se guarda en tu navegador.
            </p>
          )}
          <QaProjectsEditor epics={epics} projects={qaProjects} onChange={setQaProjects} />
        </>
      )}

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">{error}</p>}
      {!noProjects && loading && <p className="py-10 text-center text-slate-400">Cargando tareas del sprint…</p>}

      {!noProjects && !loading && !error && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Tile label="Tareas del sprint" value={summary.total} sub={`${summary.byKey.done} hechas`} />
            <Tile
              label="Sin estimación"
              value={withoutEstimate.length}
              accent={withoutEstimate.length ? 'text-red-600' : 'text-emerald-600'}
              sub="te toca como QA"
            />
            <Tile label="En revisión" value={inReview.length} accent="text-violet-600" sub="a tu cargo" />
            <Tile label="Bloqueadas" value={blocked.length} accent={blocked.length ? 'text-orange-600' : 'text-emerald-600'} sub="seguimiento en daily" />
            <Tile label="Alertas" value={totalAlerts} accent={totalAlerts ? 'text-amber-600' : 'text-emerald-600'} sub="de cumplimiento" />
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700">Ritmo del sprint</h3>
            <PaceBar label="Tiempo transcurrido del sprint" pct={elapsed} color="bg-slate-400" />
            <PaceBar
              label="Horas registradas vs estimadas"
              pct={summary.pctHours}
              color="bg-indigo-500"
              detail={`${fmtHours(summary.logged)} de ${fmtHours(summary.estimated)} · restan ${fmtHours(summary.remaining)}`}
            />
            <PaceBar label="Tareas hechas" pct={summary.pctDone} color="bg-emerald-500" detail={`${summary.byKey.done} de ${summary.total}`} />
            <p className="text-sm text-slate-500">
              <strong className="text-slate-700">{summary.moving}</strong> de {summary.open} tareas abiertas están realmente en movimiento
              (En progreso o con horas registradas).
            </p>
            {paceHint && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{paceHint}</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Quién tiene qué (tareas por estado)</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Persona</th>
                    {STATUS_ORDER.map((k) => (
                      <th key={k} className="px-2 py-2 text-center">{STATUS_META[k].label}</th>
                    ))}
                    <th className="px-2 py-2 text-right">Horas / estimadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {people.map((p) => (
                    <tr key={p.name}>
                      <td className="py-2 pr-4 font-medium text-slate-700">{p.name}</td>
                      {STATUS_ORDER.map((k) => (
                        <td key={k} className="px-2 py-2 text-center">
                          {p[k] ? (
                            <span className={`inline-block min-w-[1.5rem] rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[k].badge}`}>{p[k]}</span>
                          ) : (
                            <span className="text-slate-300">·</span>
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right text-xs text-slate-500">
                        {fmtHours(p.logged)} / {fmtHours(p.estimated)}
                      </td>
                    </tr>
                  ))}
                  {people.length === 0 && (
                    <tr><td colSpan={7} className="py-6 text-center text-slate-400">Sin tareas para este proyecto en el sprint.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Es para saber en qué está cada quien, no para comparar personas.
            </p>
          </div>

          <Section
            title="Sin estimación"
            count={withoutEstimate.length}
            tone="red"
            subtitle="Todas las tareas del sprint deben tener estimación original (plan de trabajo de QA)"
          >
            <IssueTable
              issues={withoutEstimate}
              alertsByKey={alertsByKey}
              onPatch={patchIssue}
              emptyText="Todo estimado. 👌"
            />
          </Section>

          <Section title="En revisión" count={inReview.length} tone="violet" subtitle="Entregadas por el dev: revisa y pasa a Hecha, o devuelve a En progreso con comentario de qué falló">
            <IssueTable issues={inReview} alertsByKey={alertsByKey} onPatch={patchIssue} emptyText="Nada esperando revisión." />
          </Section>

          <Section title="Bloqueadas" count={blocked.length} tone="orange" subtitle="Cada una debe tener comentario con qué falta y de quién (@mención)">
            <IssueTable issues={blocked} alertsByKey={alertsByKey} onPatch={patchIssue} emptyText="Sin bloqueos." />
          </Section>

          <Section title="Alertas de cumplimiento" count={totalAlerts} tone="red" subtitle="Calculadas con estado, horas, comentarios y fechas">
            {alertGroups.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-6 text-center text-sm text-slate-400">
                Sin alertas. 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {alertGroups.map(([code, list]) => (
                  <details key={code} className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm" open={ALERT_META[code].level === 'high'}>
                    <summary className="cursor-pointer text-sm font-medium text-slate-700">
                      {ALERT_META[code].label} <span className="text-slate-400">({list.length})</span>
                      <span className="ml-2 text-xs font-normal text-slate-400">{ALERT_META[code].hint}</span>
                    </summary>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {list.map((i) => (
                        <li key={i.key} className="flex flex-wrap items-baseline gap-2">
                          <a href={jiraIssueUrl(i.key)} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:text-indigo-700">
                            {i.key} ↗
                          </a>
                          <span className="text-slate-700">{i.summary}</span>
                          <span className="text-xs text-slate-400">· {i.assignee?.displayName || 'Sin asignar'}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
