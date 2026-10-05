import { useState } from 'react';
import useAnchoredMenu from '../hooks/useAnchoredMenu';

export default function SummaryEditor({ issueKey, summary, onChanged }) {
  const { triggerRef, open, style, toggle, close } = useAnchoredMenu({ width: 320, estimatedHeight: 160 });
  const [value, setValue] = useState(summary);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  function openEditor() {
    toggle();
    setValue(summary);
    setError(null);
  }

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === summary) {
      close();
      return;
    }

    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/summary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error desconocido');
      }
      onChanged(trimmed);
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      close();
    }
  }

  return (
    <div className="inline-block w-full text-left">
      <button
        ref={triggerRef}
        type="button"
        onClick={openEditor}
        className="-mx-1 block w-full rounded-lg px-1 py-0.5 text-left text-slate-500 transition hover:bg-slate-100"
        title="Clic para cambiar el nombre"
      >
        {summary}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            style={style}
            className="fixed z-20 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl"
          >
            <p className="mb-2 text-xs font-semibold text-slate-500">Nombre de {issueKey}</p>
            {error && <p className="mb-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>}
            <textarea
              autoFocus
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={(e) => e.target.select()}
              className="mb-2 w-full resize-none rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
            />
            <div className="flex gap-2">
              <button
                onClick={close}
                className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={applying || !value.trim()}
                className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {applying ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
