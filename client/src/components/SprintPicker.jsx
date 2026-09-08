const STATE_LABELS = { active: 'Activo', future: 'Futuros', closed: 'Cerrados' };
const STATE_ORDER = ['active', 'future', 'closed'];

export default function SprintPicker({ sprints, loading, value, onChange }) {
  if (loading) {
    return <p className="text-sm text-slate-400">Cargando sprints…</p>;
  }

  const groups = STATE_ORDER.map((state) => ({
    state,
    items: sprints.filter((s) => s.state === state),
  })).filter((g) => g.items.length > 0);

  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm outline-none focus:border-indigo-400"
    >
      {groups.map((g) => (
        <optgroup key={g.state} label={STATE_LABELS[g.state]}>
          {g.items.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
