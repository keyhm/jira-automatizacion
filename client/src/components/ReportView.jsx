import { useEffect, useState } from 'react';
import FilterBar from './FilterBar';
import useLocalStorageState from '../hooks/useLocalStorageState';

const STATUS_COLORS = {
  'To Do': 'bg-slate-400',
  'In Progress': 'bg-amber-400',
  Done: 'bg-emerald-500',
};

function StatTile({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-center shadow-sm">
      <p className={`text-3xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function BreakdownBars({ title, entries, total, colorFor }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="space-y-3">
        {entries.map(([label, count]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>{label}</span>
              <span>{count}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${colorFor(label)}`}
                style={{ width: `${total ? (count / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-slate-400">Sin datos.</p>}
      </div>
    </div>
  );
}

function HoursTable({ title, entries }) {
  const maxHours = Math.max(...entries.map(([, v]) => v.secondsLogged), 1) / 3600;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
      <div className="space-y-3">
        {entries.map(([label, v]) => {
          const hours = Math.round((v.secondsLogged / 3600) * 100) / 100;
          return (
            <div key={label}>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>{label} · {v.issues} issue{v.issues === 1 ? '' : 's'}</span>
                <span>{hours}h</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${(hours / maxHours) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
        {entries.length === 0 && <p className="text-sm text-slate-400">Sin datos.</p>}
      </div>
    </div>
  );
}

export default function ReportView({ epics, users, selectedSprintId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [epicKey, setEpicKey] = useLocalStorageState('jira-qa:report:epicKey', '');
  const [assigneeAccountId, setAssigneeAccountId] = useLocalStorageState('jira-qa:report:assigneeAccountId', '');

  useEffect(() => {
    if (!selectedSprintId) return;
    const params = new URLSearchParams({ sprintId: selectedSprintId });
    if (epicKey) params.set('epicKey', epicKey);
    if (assigneeAccountId) params.set('assigneeAccountId', assigneeAccountId);

    setLoading(true);
    fetch(`/api/report/sprint?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReport(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedSprintId, epicKey, assigneeAccountId]);

  const typeColors = ['bg-indigo-400', 'bg-purple-400', 'bg-pink-400', 'bg-sky-400'];

  return (
    <div className="space-y-6">
      <FilterBar
        epics={epics}
        users={users}
        epicKey={epicKey}
        assigneeAccountId={assigneeAccountId}
        onEpicChange={setEpicKey}
        onAssigneeChange={setAssigneeAccountId}
      />

      {loading && <p className="py-10 text-center text-slate-400">Generando reporte del sprint…</p>}
      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">{error}</p>
      )}

      {report && !loading && !error && (
        <>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {report.sprint.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatTile label="Issues totales" value={report.totalIssues} accent="text-slate-800" />
            <StatTile label="% completado" value={`${report.percentComplete}%`} accent="text-emerald-600" />
            <StatTile label="Completadas" value={report.completedIssues} accent="text-emerald-600" />
            <StatTile label="Horas registradas" value={report.totalHoursLogged} accent="text-indigo-600" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
            <div className="mb-2 flex justify-between text-sm text-slate-600">
              <span>Progreso del sprint</span>
              <span>{report.percentComplete}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                style={{ width: `${report.percentComplete}%` }}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <BreakdownBars
              title="Por estado"
              entries={Object.entries(report.byStatus)}
              total={report.totalIssues}
              colorFor={(label) => STATUS_COLORS[label] || 'bg-slate-400'}
            />
            <BreakdownBars
              title="Por tipo"
              entries={Object.entries(report.byType)}
              total={report.totalIssues}
              colorFor={(label) => typeColors[Object.keys(report.byType).indexOf(label) % typeColors.length]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <HoursTable
              title="Horas por proyecto (Epic)"
              entries={Object.entries(report.byEpic).sort((a, b) => b[1].secondsLogged - a[1].secondsLogged)}
            />
            <HoursTable
              title="Horas por persona"
              entries={Object.entries(report.byAssignee).sort((a, b) => b[1].secondsLogged - a[1].secondsLogged)}
            />
          </div>
        </>
      )}
    </div>
  );
}
