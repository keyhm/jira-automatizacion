import { useState } from 'react';
import { ESTIMATE_FORMAT, fmtHours } from '../lib/workflow';

/**
 * Muestra horas registradas / estimación original / tiempo restante con barra de
 * avance, y permite fijar la estimación original (la responsabilidad es del
 * líder o QA del proyecto). Pide confirmación antes de aplicar.
 */
export default function EstimateEditor({
  issueKey,
  originalSeconds,
  remainingSeconds,
  secondsLogged,
  isDone,
  onChanged,
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const hasEstimate = originalSeconds > 0;
  const pct = hasEstimate ? Math.min(100, Math.round((secondsLogged / originalSeconds) * 100)) : 0;
  const over = hasEstimate && secondsLogged > originalSeconds;

  function startEdit() {
    setValue('');
    setConfirming(false);
    setError(null);
    setEditing(true);
  }

  function review() {
    if (!ESTIMATE_FORMAT.test(value.trim())) {
      setError('Usa un formato como 4h, 1d 4h o 30m (1d = 8h).');
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/estimate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalEstimate: value.trim() }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(
          'El servidor local no reconoce esta acción: tiene una versión vieja. Cierra la terminal de la app y ábrela de nuevo con Iniciar-App.bat.'
        );
      }
      if (!res.ok) throw new Error(data.error || 'Error desconocido');
      onChanged(data);
      setEditing(false);
      setConfirming(false);
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="w-48 space-y-2 text-xs">
        {confirming ? (
          <>
            <p className="text-slate-600">
              ¿Fijar la estimación original en <strong>{value.trim()}</strong>?
            </p>
            <p className="text-slate-400">Si cambia una estimación existente, deja un comentario con el motivo.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 rounded-lg border border-slate-200 py-1 text-slate-500 hover:bg-slate-50"
              >
                Volver
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-lg bg-indigo-600 py-1 text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? '...' : 'Confirmar'}
              </button>
            </div>
          </>
        ) : (
          <>
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && review()}
              placeholder="4h · 1d 4h · 30m"
              className="w-full rounded-lg border border-slate-200 px-2 py-1 outline-none focus:border-indigo-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 rounded-lg border border-slate-200 py-1 text-slate-500 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button onClick={review} className="flex-1 rounded-lg bg-indigo-600 py-1 text-white hover:bg-indigo-700">
                Revisar
              </button>
            </div>
          </>
        )}
        {error && <p className="text-red-600">{error}</p>}
      </div>
    );
  }

  if (!hasEstimate) {
    return (
      <button
        onClick={startEdit}
        className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition hover:opacity-80 ${
          isDone ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-700'
        }`}
        title="Poner estimación original"
      >
        {isDone ? 'Sin estimar' : '+ Estimar'}
      </button>
    );
  }

  return (
    <button onClick={startEdit} className="block w-36 text-left" title="Cambiar estimación original">
      <div className="mb-1 flex justify-between text-xs">
        <span className={over ? 'font-medium text-red-600' : 'text-slate-600'}>
          {fmtHours(secondsLogged)} / {fmtHours(originalSeconds)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${over ? 'bg-red-400' : 'bg-indigo-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">restan {fmtHours(remainingSeconds)}</p>
    </button>
  );
}
