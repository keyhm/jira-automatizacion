import { useState } from 'react';
import useAnchoredMenu from '../hooks/useAnchoredMenu';

function formatDate(iso) {
  // Se arma a mano en vez de con Date() para evitar el corrimiento de
  // zona horaria que hace ver "un día antes" con fechas tipo YYYY-MM-DD.
  const [year, month, day] = iso.split('-');
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${day} ${MONTHS[Number(month) - 1]}`;
}

function isOverdue(iso) {
  if (!iso) return false;
  const today = new Date().toISOString().slice(0, 10);
  return iso < today;
}

export default function DueDateChanger({ issueKey, dueDate, isDone, onChanged }) {
  const { triggerRef, open, style, toggle, close } = useAnchoredMenu({ width: 220, estimatedHeight: 160 });
  const [value, setValue] = useState(dueDate || '');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  function openPicker() {
    toggle();
    setValue(dueDate || '');
    setError(null);
  }

  async function save(nextDate) {
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/duedate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: nextDate || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error desconocido');
      }
      onChanged(nextDate || null);
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  const overdue = isOverdue(dueDate) && !isDone;

  return (
    <div className="inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs transition hover:bg-slate-100 ${
          overdue ? 'font-medium text-red-600' : dueDate ? 'text-slate-600' : 'text-slate-400'
        }`}
      >
        <span>📅</span>
        {dueDate ? formatDate(dueDate) : 'Sin fecha'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            style={style}
            className="fixed z-20 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl"
          >
            <p className="mb-2 text-xs font-semibold text-slate-500">Fecha de vencimiento</p>
            {error && <p className="mb-2 rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>}
            <input
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mb-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
            />
            <div className="flex gap-2">
              {dueDate && (
                <button
                  onClick={() => save(null)}
                  disabled={applying}
                  className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-60"
                >
                  Quitar
                </button>
              )}
              <button
                onClick={() => save(value)}
                disabled={applying || !value}
                className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {applying ? '...' : 'Guardar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
