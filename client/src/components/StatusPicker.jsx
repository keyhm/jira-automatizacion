import { useState } from 'react';
import useAnchoredMenu from '../hooks/useAnchoredMenu';

import { statusMeta, statusKey } from '../lib/workflow';

const KANBAN = ['todo', 'doing', 'review', 'blocked', 'done'];

// Muestra los ESTADOS destino (en español, sin repetir y en el orden del tablero).
// El nombre de la transición puede seguir en inglés ("To Do", "In Progress").
function uniqueByTarget(list) {
  const seen = new Set();
  return list
    .filter((t) => (seen.has(t.to) ? false : seen.add(t.to)))
    .sort(
      (a, b) =>
        KANBAN.indexOf(statusKey(a.to, a.toCategory)) - KANBAN.indexOf(statusKey(b.to, b.toCategory))
    );
}

// Desde el sprint 112 hay 5 estados (Por hacer, En progreso, En revisión,
// Bloqueada, Hecha). Tres comparten la categoría "indeterminate" de Jira, así
// que el color se resuelve por nombre y, si no se reconoce, por categoría.
function styleFor(status, statusCategory) {
  return statusMeta(status, statusCategory).badge;
}

export default function StatusPicker({ issueKey, status, statusCategory, onChanged }) {
  const { triggerRef, open, style, toggle, close } = useAnchoredMenu({ width: 256, estimatedHeight: 260 });
  const [transitions, setTransitions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(null);
  const [applying, setApplying] = useState(false);
  const [comment, setComment] = useState('');
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
        setTransitions(Array.isArray(data) ? uniqueByTarget(data) : []);
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
      if (needsComment && comment.trim()) {
        const c = await fetch(`/api/issues/${issueKey}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: comment.trim() }),
        });
        if (!c.ok) throw new Error('No se pudo guardar el comentario; el estado no se cambió.');
      }
      const res = await fetch(`/api/issues/${issueKey}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transitionId: pending.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error desconocido');
      }
      onChanged(pending.to, pending.toCategory);
      close();
      setPending(null);
      setComment('');
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  const pendingKey = pending ? statusKey(pending.to, pending.toCategory) : null;
  const needsComment = ['doing', 'review', 'blocked', 'done'].includes(pendingKey);
  const commentHint = {
    doing: 'Comentario corto de qué vas a hacer hoy.',
    review: 'Qué se entregó, cómo probarlo y @mención de quien debe revisarla (puedes escribirlo en Jira).',
    blocked: 'Qué falta y de quién; avisa con @mención en Jira.',
    done: 'Comentario de solución: qué se hizo y cómo se comprobó.',
  }[pendingKey];

  return (
    <div className="inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition hover:opacity-80 ${styleFor(status, statusCategory)}`}
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
                {needsComment && (
                  <>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      placeholder="Comentario (opcional aquí)"
                      className="mb-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-700 outline-none focus:border-indigo-400"
                    />
                    <p className="mb-2 text-[11px] text-slate-400">{commentHint}</p>
                  </>
                )}
                {error && <p className="mb-2 text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPending(null); setComment(''); }}
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
                  {t.to}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
