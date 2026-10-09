import { useState } from 'react';
import { DAYS } from '../lib/meetingSchedule';

const emptyBlock = () => ({ days: [], start: '09:00', end: '09:30' });

function blocksFromSchedule(schedule) {
  return schedule && schedule.length > 0 ? schedule.map((b) => ({ ...b, days: [...b.days] })) : [emptyBlock()];
}

export default function MeetingForm({ initial, onCancel, onSave, saving, error }) {
  const [name, setName] = useState(initial?.name || '');
  const [link, setLink] = useState(initial?.link || '');
  const [blocks, setBlocks] = useState(blocksFromSchedule(initial?.schedule));

  function updateBlock(index, patch) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function toggleDay(index, dayKey) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        const days = b.days.includes(dayKey) ? b.days.filter((d) => d !== dayKey) : [...b.days, dayKey];
        return { ...b, days };
      })
    );
  }

  function addBlock() {
    setBlocks((prev) => [...prev, emptyBlock()]);
  }

  function removeBlock(index) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSave() {
    const schedule = blocks.filter((b) => b.days.length > 0 && b.start && b.end);
    onSave({ name: name.trim(), link: link.trim(), schedule });
  }

  const valid = name.trim() && link.trim() && blocks.some((b) => b.days.length > 0);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Daily Mi Proyecto"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Link de Teams</label>
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://teams.microsoft.com/l/meetup-join/…"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
        />
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-medium text-slate-600">
          Horario (agrega otro bloque si un día tiene horas distintas, ej. viernes)
        </label>
        {blocks.map((block, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {DAYS.filter((d) => d.key !== 'sat' && d.key !== 'sun').map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => toggleDay(i, d.key)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    block.days.includes(d.key)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
              {blocks.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBlock(i)}
                  className="ml-auto text-xs text-red-500 hover:text-red-700"
                >
                  Quitar bloque
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <input
                type="time"
                value={block.start}
                onChange={(e) => updateBlock(i, { start: e.target.value })}
                className="rounded-lg border border-slate-200 px-2 py-1 outline-none focus:border-indigo-400"
              />
              <span className="text-slate-400">a</span>
              <input
                type="time"
                value={block.end}
                onChange={(e) => updateBlock(i, { end: e.target.value })}
                className="rounded-lg border border-slate-200 px-2 py-1 outline-none focus:border-indigo-400"
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={addBlock} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
          + Agregar bloque de horario
        </button>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!valid || saving}
          className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
