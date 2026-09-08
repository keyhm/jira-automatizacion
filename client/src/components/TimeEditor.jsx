import { useState } from 'react';
import useAnchoredMenu from '../hooks/useAnchoredMenu';

function toHours(seconds) {
  return Math.round((seconds / 3600) * 100) / 100;
}

export default function TimeEditor({ issueKey, secondsLogged, onTotalChanged }) {
  const { triggerRef, open, style, toggle, close } = useAnchoredMenu({ width: 260, estimatedHeight: 280 });
  const [worklogs, setWorklogs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [newHours, setNewHours] = useState('');
  const [newMinutes, setNewMinutes] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editHours, setEditHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function loadWorklogs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/worklogs`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setWorklogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openEditor() {
    const wasOpen = open;
    toggle();
    if (!wasOpen) loadWorklogs();
  }

  function recomputeTotal(list) {
    const total = list.reduce((sum, w) => sum + w.timeSpentSeconds, 0);
    onTotalChanged(total);
  }

  async function handleAdd() {
    const h = parseFloat(newHours) || 0;
    const m = parseFloat(newMinutes) || 0;
    const seconds = Math.round(h * 3600 + m * 60);
    if (seconds <= 0) return;

    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/worklogs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSpentSeconds: seconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = [...worklogs, data];
      setWorklogs(updated);
      recomputeTotal(updated);
      setNewHours('');
      setNewMinutes('');
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  function startEdit(w) {
    setEditingId(w.id);
    setEditHours(String(toHours(w.timeSpentSeconds)));
  }

  async function saveEdit(worklogId) {
    const h = parseFloat(editHours) || 0;
    const seconds = Math.round(h * 3600);
    if (seconds <= 0) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/worklogs/${worklogId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSpentSeconds: seconds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = worklogs.map((w) => (w.id === worklogId ? data : w));
      setWorklogs(updated);
      recomputeTotal(updated);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(worklogId) {
    setDeletingId(worklogId);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/worklogs/${worklogId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const updated = worklogs.filter((w) => w.id !== worklogId);
      setWorklogs(updated);
      recomputeTotal(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        onClick={openEditor}
        className="whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
      >
        {secondsLogged ? `${toHours(secondsLogged)}h` : '+ tiempo'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            style={style}
            className="fixed z-20 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl"
          >
            <p className="mb-2 text-xs font-semibold text-slate-500">Tiempo registrado en {issueKey}</p>

            {error && <p className="mb-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>}

            {loading ? (
              <p className="px-1 py-2 text-xs text-slate-400">Cargando…</p>
            ) : (
              <div className="mb-3 space-y-1.5">
                {worklogs?.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-700">{w.author}</p>
                      <p className="text-slate-400">{new Date(w.started).toLocaleDateString()}</p>
                    </div>
                    {editingId === w.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          autoFocus
                          value={editHours}
                          onChange={(e) => setEditHours(e.target.value)}
                          className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right"
                        />
                        <button onClick={() => saveEdit(w.id)} disabled={saving} className="text-emerald-600 hover:text-emerald-700">✓</button>
                        <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(w)} className="font-medium text-slate-700 hover:text-indigo-600">
                          {toHours(w.timeSpentSeconds)}h
                        </button>
                        <button
                          onClick={() => handleDelete(w.id)}
                          disabled={deletingId === w.id}
                          className="text-red-400 hover:text-red-600"
                        >
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {worklogs?.length === 0 && <p className="px-1 text-xs text-slate-400">Sin tiempo registrado.</p>}
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
              <input
                type="number"
                min="0"
                step="0.25"
                placeholder="h"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs"
              />
              <input
                type="number"
                min="0"
                max="59"
                step="5"
                placeholder="min"
                value={newMinutes}
                onChange={(e) => setNewMinutes(e.target.value)}
                className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-xs"
              />
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex-1 rounded-lg bg-indigo-600 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {adding ? '...' : 'Sumar tiempo'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
