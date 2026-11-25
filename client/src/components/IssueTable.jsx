import StatusPicker from './StatusPicker';
import EstimateEditor from './EstimateEditor';
import { ALERT_META, jiraIssueUrl, statusKey } from '../lib/workflow';

const LEVEL_STYLES = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-500',
};

export function LinksList({ links }) {
  if (!links || links.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
      {links.map((l) => (
        <li key={`${l.direction}-${l.key}`}>
          {l.direction === 'blocks' ? 'Bloquea a' : 'Bloqueada por'}{' '}
          <a href={jiraIssueUrl(l.key)} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">{l.key}</a>
          {' · '}{l.status || '—'}{' · '}{l.assignee || 'sin responsable'}
        </li>
      ))}
    </ul>
  );
}

export function AlertChips({ codes = [] }) {
  if (codes.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {codes.map((code) => {
        const meta = ALERT_META[code];
        return (
          <span
            key={code}
            title={meta.hint}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${LEVEL_STYLES[meta.level]}`}
          >
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Tabla de solo lectura de tareas, con estado y estimación editables.
 * onPatch(key, cambios) actualiza la tarea en memoria.
 */
export default function IssueTable({ issues, alertsByKey = {}, onPatch, showAssignee = true, emptyText }) {
  const today = todayIso();

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-4 py-3">Tarea</th>
            <th className="px-4 py-3">Proyecto</th>
            {showAssignee && <th className="px-4 py-3">Responsable</th>}
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Vence</th>
            <th className="px-4 py-3">Estimación</th>
            <th className="px-4 py-3 text-center">💬</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {issues.map((issue) => {
            const isDone = statusKey(issue.status, issue.statusCategory) === 'done';
            const overdue = issue.dueDate && issue.dueDate < today && !isDone;
            return (
              <tr key={issue.key} className="align-top">
                <td className="max-w-sm px-4 py-3">
                  <a
                    href={jiraIssueUrl(issue.key)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {issue.key} ↗
                  </a>
                  <p className="text-slate-700">{issue.summary}</p>
                  <AlertChips codes={alertsByKey[issue.key]} />
                  <LinksList links={issue.links} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{issue.epic?.summary || '—'}</td>
                {showAssignee && (
                  <td className="px-4 py-3 text-xs text-slate-600">{issue.assignee?.displayName || 'Sin asignar'}</td>
                )}
                <td className="px-4 py-3">
                  <StatusPicker
                    issueKey={issue.key}
                    status={issue.status}
                    statusCategory={issue.statusCategory}
                    onChanged={(status, statusCategory) => onPatch(issue.key, { status, statusCategory })}
                  />
                </td>
                <td className={`px-4 py-3 text-xs ${overdue ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                  {issue.dueDate || '—'}
                </td>
                <td className="px-4 py-3">
                  <EstimateEditor
                    issueKey={issue.key}
                    originalSeconds={issue.originalSeconds}
                    remainingSeconds={issue.remainingSeconds}
                    secondsLogged={issue.secondsLogged}
                    isDone={isDone}
                    onChanged={(values) => onPatch(issue.key, values)}
                  />
                </td>
                <td className="px-4 py-3 text-center text-xs text-slate-500">{issue.commentCount || 0}</td>
              </tr>
            );
          })}
          {issues.length === 0 && (
            <tr>
              <td colSpan={showAssignee ? 7 : 6} className="px-4 py-8 text-center text-slate-400">
                {emptyText || 'No hay tareas.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
