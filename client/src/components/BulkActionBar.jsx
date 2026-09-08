import { useState } from 'react';

export default function BulkActionBar({ selectedKeys, sprints, source, onClear, onStatusApplied, onMoved }) {
  const [mode, setMode] = useState(null); // null | 'status' | 'sprint' | 'backlog'
  const [statusOptions, setStatusOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingSprintId, setPendingSprintId] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [failures, setFailures] = useState(null);

  const count = selectedKeys.length;

  async function openStatusMode() {
    setMode('status');
    setError(null);
    setFailures(null);
    setLoadingOptions(true);
    try {
      const res = await fetch('/api/issues/bulk/common-transitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKeys: selectedKeys }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatusOptions(data);
    } catch (err) {
      setError(err.message);
      setStatusOptions([]);
    } finally {
      setLoadingOptions(false);
    }
  }

  function openSprintMode() {
    setMode('sprint');
    setError(null);
    setFailures(null);
    setPendingSprintId('');
  }

  function reset() {
    setMode(null);
    setPendingStatus(null);
    setStatusOptions(null);
    setError(null);
    setFailures(null);
  }

  async function confirmStatus() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch('/api/issues/bulk/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKeys: selectedKeys, statusName: pendingStatus }),
      });
      const results = await res.json();
      if (!res.ok) throw new Error(results.error);
      const succeeded = results.filter((r) => r.ok).map((r) => r.key);
      const failed = results.filter((r) => !r.ok);
      onStatusApplied(succeeded, pendingStatus);
      if (failed.length > 0) {
        setFailures(failed);
      } else {
        onClear();
        reset();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  async function confirmMove() {
    if (!pendingSprintId) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/sprints/${pendingSprintId}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKeys: selectedKeys }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const sprintName = sprints.find((s) => s.id === Number(pendingSprintId))?.name;
      onMoved(selectedKeys, sprintName || 'otro sprint');
      onClear();
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  async function confirmMoveToBacklog() {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch('/api/backlog/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueKeys: selectedKeys }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      onMoved(selectedKeys, 'el backlog');
      onClear();
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="sticky top-2 z-10 rounded-2xl border border-indigo-200 bg-indigo-50/95 p-4 shadow-lg backdrop-blur">
      {mode === null && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-indigo-700">{count} seleccionado{count === 1 ? '' : 's'}</span>
          <button onClick={openStatusMode} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-100">
            Cambiar estado
          </button>
          <button onClick={openSprintMode} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-100">
            Mover a sprint
          </button>
          {source === 'sprint' && (
            <button
              onClick={() => { setMode('backlog'); setError(null); }}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-100"
            >
              Mover al backlog
            </button>
          )}
          <button onClick={onClear} className="ml-auto text-sm text-indigo-500 hover:text-indigo-700">
            Cancelar selección
          </button>
        </div>
      )}

      {mode === 'status' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-indigo-700">
            Cambiar estado de {count} issue{count === 1 ? '' : 's'}
          </p>

          {pendingStatus ? (
            <div className="text-sm">
              <p className="mb-2 text-slate-700">¿Cambiar a <strong>{pendingStatus}</strong>?</p>
              {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-red-600">{error}</p>}
              {failures && (
                <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
                  {failures.length} fallaron: {failures.map((f) => `${f.key} (${f.error})`).join('; ')}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={reset} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  onClick={confirmStatus}
                  disabled={applying}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {applying ? 'Aplicando…' : 'Confirmar'}
                </button>
              </div>
            </div>
          ) : loadingOptions ? (
            <p className="text-sm text-slate-500">Buscando estados en común…</p>
          ) : statusOptions.length === 0 ? (
            <div className="text-sm">
              <p className="mb-2 text-amber-700">Estos issues no comparten ningún estado destino disponible.</p>
              <button onClick={reset} className="text-indigo-600 hover:text-indigo-700">Volver</button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((name) => (
                <button
                  key={name}
                  onClick={() => setPendingStatus(name)}
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {name}
                </button>
              ))}
              <button onClick={reset} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'sprint' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-indigo-700">
            Mover {count} issue{count === 1 ? '' : 's'} a otro sprint
          </p>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={pendingSprintId}
              onChange={(e) => setPendingSprintId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              <option value="">Selecciona un sprint…</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.state})</option>
              ))}
            </select>
            <button onClick={reset} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              onClick={confirmMove}
              disabled={!pendingSprintId || applying}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {applying ? 'Moviendo…' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {mode === 'backlog' && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-indigo-700">
            ¿Sacar {count} issue{count === 1 ? '' : 's'} del sprint y mandarlo{count === 1 ? '' : 's'} al backlog?
          </p>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={reset} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              onClick={confirmMoveToBacklog}
              disabled={applying}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {applying ? 'Moviendo…' : 'Sí, mover al backlog'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
