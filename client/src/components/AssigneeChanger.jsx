import { useMemo, useState } from 'react';
import useAnchoredMenu from '../hooks/useAnchoredMenu';

export default function AssigneeChanger({ issueKey, assignee, users, onChanged }) {
  const { triggerRef, open, style, toggle, close } = useAnchoredMenu({ width: 260, estimatedHeight: 260 });
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(null);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.displayName.toLowerCase().includes(q));
  }, [users, query]);

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
      const res = await fetch(`/api/issues/${issueKey}/assignee`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: pending.accountId || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error desconocido');
      }
      onChanged(
        pending.accountId
          ? {
              accountId: pending.accountId,
              displayName: pending.displayName,
              avatarUrl: pending.avatarUrls?.['24x24'],
            }
          : null
      );
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
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-2 py-1 text-left text-slate-600 transition hover:bg-slate-100"
      >
        {assignee ? (
          <>
            <img src={assignee.avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full" />
            {assignee.displayName}
          </>
        ) : (
          <>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px]">?</span>
            Sin asignar
          </>
        )}
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
                  ¿Asignar {issueKey} a <strong>{pending.displayName || 'nadie'}</strong>?
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
                  placeholder="Buscar participante…"
                  className="w-full border-b border-slate-100 px-3 py-2 text-xs outline-none"
                />
                <div className="max-h-56 overflow-y-auto">
                  <button
                    onClick={() => setPending({ accountId: '', displayName: '' })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-400 hover:bg-slate-50"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px]">?</span>
                    Sin asignar
                  </button>
                  {filtered.map((u) => (
                    <button
                      key={u.accountId}
                      onClick={() => setPending(u)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 ${
                        u.accountId === assignee?.accountId ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      <img src={u.avatarUrls?.['24x24']} alt="" className="h-5 w-5 shrink-0 rounded-full bg-slate-200" />
                      <span className="truncate">{u.displayName}</span>
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
