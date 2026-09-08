import { useMemo, useState } from 'react';
import useAnchoredMenu from '../hooks/useAnchoredMenu';

export default function EpicChanger({ issueKey, epic, epics, onChanged }) {
  const { triggerRef, open, style, toggle, close } = useAnchoredMenu({ width: 260, estimatedHeight: 260 });
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return epics;
    return epics.filter((e) => e.summary.toLowerCase().includes(q));
  }, [epics, query]);

  function openPicker() {
    toggle();
    setQuery('');
    setPending(null);
    setError(null);
  }

  async function confirm() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/epic`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epicKey: pending.key || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error desconocido');
      }
      onChanged(pending.key ? { key: pending.key, summary: pending.summary } : null);
      close();
      setPending(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className="whitespace-nowrap rounded-lg px-2 py-1 text-left text-slate-600 transition hover:bg-slate-100"
      >
        {epic?.summary || '— sin proyecto'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            style={style}
            className="fixed z-20 max-h-72 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl"
          >
            {pending ? (
              <div className="p-3 text-xs">
                <p className="mb-2 text-slate-600">
                  ¿Mover {issueKey} a <strong>{pending.summary || 'sin proyecto'}</strong>?
                </p>
                {error && <p className="mb-2 rounded-lg bg-red-50 px-2 py-1 text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setPending(null)} className="flex-1 rounded-lg border border-slate-200 py-1 text-slate-500 hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button
                    onClick={confirm}
                    disabled={applying}
                    className="flex-1 rounded-lg bg-indigo-600 py-1 text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {applying ? '...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar proyecto/epic…"
                  className="w-full border-b border-slate-100 px-3 py-2 text-xs outline-none"
                />
                <div className="max-h-56 overflow-y-auto">
                  <button
                    onClick={() => setPending({ key: '', summary: '' })}
                    className="block w-full px-3 py-2 text-left text-xs text-slate-400 hover:bg-slate-50"
                  >
                    Sin proyecto asociado
                  </button>
                  {filtered.map((e) => (
                    <button
                      key={e.key}
                      onClick={() => setPending(e)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                        e.key === epic?.key ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{e.summary}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">Sin resultados.</p>}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
