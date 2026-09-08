export default function FilterBar({ epics, users, epicKey, assigneeAccountId, onEpicChange, onAssigneeChange }) {
  const hasFilters = epicKey || assigneeAccountId;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <span className="text-sm font-medium text-slate-500">Filtrar por</span>

      <select
        value={epicKey}
        onChange={(e) => onEpicChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400"
      >
        <option value="">Todos los proyectos</option>
        {epics.map((e) => (
          <option key={e.key} value={e.key}>{e.summary}</option>
        ))}
      </select>

      <select
        value={assigneeAccountId}
        onChange={(e) => onAssigneeChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400"
      >
        <option value="">Todos los usuarios</option>
        {users.map((u) => (
          <option key={u.accountId} value={u.accountId}>{u.displayName}</option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={() => {
            onEpicChange('');
            onAssigneeChange('');
          }}
          className="ml-auto text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
