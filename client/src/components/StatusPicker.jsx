import { useState } from 'react';
import useAnchoredMenu from '../hooks/useAnchoredMenu';

const STATUS_STYLES = {
  'To Do': 'bg-slate-100 text-slate-600',
  'In Progress': 'bg-amber-100 text-amber-700',
  Done: 'bg-emerald-100 text-emerald-700',
};

function styleFor(status) {
  return STATUS_STYLES[status] || 'bg-slate-100 text-slate-600';
}

export default function StatusPicker({ issueKey, status, onChanged }) {
  const { triggerRef, open, style, toggle, close } = useAnchoredMenu({ width: 192, estimatedHeight: 180 });
  const [transitions, setTransitions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  async function openPicker() {
    const wasOpen = open;
    toggle();
    setError(null);
    if (!wasOpen && !transitions) {
      setLoading(true);
      try {
        const res = await fetch(`/api/issues/${issueKey}/transitions`);
        const data = await res.json();
        setTransitions(Array.isArray(data) ? data : []);
      } catch {
        setTransitions([]);
      } finally {
        setLoading(false);
      }
    }
  }

  async function confirm() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionId: pending.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error desconocido');
      }
      onChanged(pending.to);
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
        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition hover:opacity-80 ${styleFor(status)}`}
      >
        {status}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            style={style}
            className="fixed z-20 rounded-xl border border-slate-200 bg-white p-2 text-left shadow-xl"
          >
            {pending ? (
              <div className="p-1 text-xs">
                <p className="mb-2 text-slate-600">¿Cambiar a <strong>{pending.to}</strong>?</p>
                {error && <p className="mb-2 text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => setPending(null)}
                    className="flex-1 rounded-lg border border-slate-200 py-1 text-slate-500 hover:bg-slate-50"
                  >
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
            ) : loading ? (
              <p className="px-2 py-1 text-xs text-slate-400">Cargando…</p>
            ) : (
              transitions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPending(t)}
                  disabled={t.to === status}
                  className="block w-full rounded-lg px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:cursor-default disabled:text-slate-300"
                >
                  {t.name}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
