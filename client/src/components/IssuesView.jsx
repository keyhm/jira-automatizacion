import { useEffect, useMemo, useState } from 'react';
import FilterBar from './FilterBar';
import StatusPicker from './StatusPicker';
import TimeEditor from './TimeEditor';
import EpicChanger from './EpicChanger';
import AssigneeChanger from './AssigneeChanger';
import CommentsPanel from './CommentsPanel';
import BulkActionBar from './BulkActionBar';
import useLocalStorageState from '../hooks/useLocalStorageState';

const WIDTH_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'ancho', label: 'Ancho' },
  { value: 'completo', label: 'Completo' },
];

export default function IssuesView({
  epics,
  users,
  sprints,
  sprint,
  selectedSprintId,
  boardWidth,
  setBoardWidth,
}) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [source, setSource] = useLocalStorageState('jira-qa:board:source', 'sprint');
  const [epicKey, setEpicKey] = useLocalStorageState('jira-qa:board:epicKey', '');
  const [assigneeAccountId, setAssigneeAccountId] = useLocalStorageState('jira-qa:board:assigneeAccountId', '');
  const [status, setStatus] = useLocalStorageState('jira-qa:board:status', '');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState(new Set());
  const [movedNotice, setMovedNotice] = useState(null);

  useEffect(() => {
    if (source === 'sprint' && !selectedSprintId) return;
    const url = source === 'backlog' ? '/api/backlog' : `/api/sprint/issues?sprintId=${selectedSprintId}`;

    setLoading(true);
    setError(null);
    setSelected(new Set());
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setIssues(data.issues);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [source, selectedSprintId]);

  const statuses = useMemo(() => [...new Set(issues.map((i) => i.status))], [issues]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((issue) => {
      if (epicKey && issue.epic?.key !== epicKey) return false;
      if (assigneeAccountId && issue.assignee?.accountId !== assigneeAccountId) return false;
      if (status && issue.status !== status) return false;
      if (q && !issue.key.toLowerCase().includes(q) && !issue.summary.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [issues, epicKey, assigneeAccountId, status, search]);

  function updateIssueStatus(key, newStatus) {
    setIssues((prev) => prev.map((i) => (i.key === key ? { ...i, status: newStatus } : i)));
  }

  function updateIssueTime(key, seconds) {
    setIssues((prev) => prev.map((i) => (i.key === key ? { ...i, secondsLogged: seconds } : i)));
  }

  function updateIssueEpic(key, newEpic) {
    setIssues((prev) => prev.map((i) => (i.key === key ? { ...i, epic: newEpic } : i)));
  }

  function updateIssueAssignee(key, newAssignee) {
    setIssues((prev) => prev.map((i) => (i.key === key ? { ...i, assignee: newAssignee } : i)));
  }

  function updateIssueCommentCount(key, count) {
    setIssues((prev) => prev.map((i) => (i.key === key ? { ...i, commentCount: count } : i)));
  }

  function toggleSelected(key) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((i) => i.key))
    );
  }

  function handleBulkStatusApplied(keys, newStatus) {
    setIssues((prev) => prev.map((i) => (keys.includes(i.key) ? { ...i, status: newStatus } : i)));
    setSelected((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });
  }

  function handleBulkMoved(keys, destination) {
    setIssues((prev) => prev.filter((i) => !keys.includes(i.key)));
    setMovedNotice(`${keys.length} issue(s) movido(s) a ${destination}.`);
    setTimeout(() => setMovedNotice(null), 5000);
  }

  const sourceLabel = source === 'backlog' ? 'el backlog' : `el sprint ${sprint?.name || ''}`.trim();

  if (error) {
    return (
      <div className="space-y-4">
        <SourceToggle source={source} onChange={setSource} />
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {movedNotice && (
        <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{movedNotice}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SourceToggle source={source} onChange={setSource} />

        <div className="inline-flex items-center gap-2">
          <span className="text-xs text-slate-400">Ancho</span>
          <div className="inline-flex rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-slate-200">
            {WIDTH_OPTIONS.map((w) => (
              <button
                key={w.value}
                onClick={() => setBoardWidth(w.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  boardWidth === w.value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <BulkActionBar
          selectedKeys={[...selected]}
          sprints={sprints}
          source={source}
          onClear={() => setSelected(new Set())}
          onStatusApplied={handleBulkStatusApplied}
          onMoved={handleBulkMoved}
        />
      )}

      {loading ? (
        <p className="py-10 text-center text-slate-400">Cargando issues de {sourceLabel}…</p>
      ) : (
        <>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por ID o texto (ej: JS-8172)"
          className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm outline-none focus:border-indigo-400"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400"
        >
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <FilterBar
        epics={epics}
        users={users}
        epicKey={epicKey}
        assigneeAccountId={assigneeAccountId}
        onEpicChange={setEpicKey}
        onAssigneeChange={setAssigneeAccountId}
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Proyecto</th>
              <th className="px-4 py-3">Asignado</th>
              <th className="px-4 py-3">Tiempo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Comentarios</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((issue) => (
              <tr key={issue.key} className={`align-top ${selected.has(issue.key) ? 'bg-indigo-50/50' : ''}`}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(issue.key)}
                    onChange={() => toggleSelected(issue.key)}
                    className="rounded border-slate-300"
                  />
                </td>
                <td className="max-w-sm px-4 py-3">
                  <p className="font-medium text-slate-800">{issue.key}</p>
                  <p className="text-slate-500">{issue.summary}</p>
                </td>
                <td className="px-4 py-3">
                  <EpicChanger
                    issueKey={issue.key}
                    epic={issue.epic}
                    epics={epics}
                    onChanged={(newEpic) => updateIssueEpic(issue.key, newEpic)}
                  />
                </td>
                <td className="px-4 py-3">
                  <AssigneeChanger
                    issueKey={issue.key}
                    assignee={issue.assignee}
                    users={users}
                    onChanged={(newAssignee) => updateIssueAssignee(issue.key, newAssignee)}
                  />
                </td>
                <td className="px-4 py-3">
                  <TimeEditor
                    issueKey={issue.key}
                    secondsLogged={issue.secondsLogged}
                    onTotalChanged={(seconds) => updateIssueTime(issue.key, seconds)}
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusPicker
                    issueKey={issue.key}
                    status={issue.status}
                    onChanged={(newStatus) => updateIssueStatus(issue.key, newStatus)}
                  />
                </td>
                <td className="px-4 py-3">
                  <CommentsPanel
                    issueKey={issue.key}
                    commentCount={issue.commentCount}
                    onCountChanged={(count) => updateIssueCommentCount(issue.key, count)}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No hay issues que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  );
}

function SourceToggle({ source, onChange }) {
  const options = [
    { value: 'sprint', label: 'Sprint', emoji: '🏃' },
    { value: 'backlog', label: 'Backlog', emoji: '📚' },
  ];

  return (
    <div className="inline-flex rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-slate-200">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
            source === o.value ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>{o.emoji}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}
