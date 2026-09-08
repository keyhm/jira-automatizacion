import { useMemo, useState } from 'react';

export default function EpicPicker({ epics, loading, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = epics.find((e) => e.key === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return epics;
    return epics.filter((e) => e.summary.toLowerCase().includes(q));
  }, [epics, query]);

  if (loading) {
    return <p className="text-sm text-slate-400">Cargando proyectos (epics)…</p>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
      >
        <span className={selected ? 'font-medium' : 'text-slate-400'}>
          {selected ? selected.summary : 'Sin proyecto asociado'}
        </span>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proyecto/epic…"
            className="w-full border-b border-slate-100 px-4 py-2.5 text-sm outline-none"
          />
          <div className="max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
                setQuery('');
              }}
              className="block w-full px-4 py-2 text-left text-sm text-slate-400 hover:bg-slate-50"
            >
              Sin proyecto asociado
            </button>
            {filtered.map((e) => (
              <button
                type="button"
                key={e.key}
                onClick={() => {
                  onChange(e.key);
                  setOpen(false);
                  setQuery('');
                }}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                  e.key === value ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-700'
                }`}
              >
                <span>{e.summary}</span>
                <span className="text-xs text-slate-400">{e.status}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-slate-400">Sin resultados.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
