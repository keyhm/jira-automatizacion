import { useMemo, useState } from 'react';

const STATE_LABELS = { active: 'Activo', future: 'Futuros', closed: 'Cerrados' };
const STATE_ORDER = ['active', 'future', 'closed'];

export default function SprintPicker({ sprints, loading, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = sprints.find((s) => s.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sprints;
    return sprints.filter((s) => s.name.toLowerCase().includes(q));
  }, [sprints, query]);

  const groups = STATE_ORDER.map((state) => ({
    state,
    items: filtered.filter((s) => s.state === state),
  })).filter((g) => g.items.length > 0);

  if (loading) {
    return <p className="text-sm text-slate-400">Cargando sprints…</p>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm outline-none transition focus:border-indigo-400"
      >
        {selected ? selected.name : 'Elegir sprint…'}
        <span className="text-indigo-300">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 z-20 mt-2 w-72 -translate-x-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar sprint (ej: 98, Sprint 98)…"
              className="w-full border-b border-slate-100 px-4 py-2.5 text-sm outline-none"
            />
            <div className="max-h-72 overflow-y-auto">
              {groups.map((g) => (
                <div key={g.state}>
                  <p className="sticky top-0 bg-slate-50 px-4 py-1 text-xs font-semibold text-slate-400">
                    {STATE_LABELS[g.state]}
                  </p>
                  {g.items.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => {
                        onChange(s.id);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={`block w-full truncate px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                        s.id === value ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              ))}
              {groups.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">Sin resultados.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
