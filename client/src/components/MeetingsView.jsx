import { useEffect, useMemo, useState } from 'react';
import useLocalStorageState from '../hooks/useLocalStorageState';
import MeetingForm from './MeetingForm';
import { describeSchedule, nextOccurrence, sortByNextOccurrence } from '../lib/meetingSchedule';

function occurrenceLabel(occ) {
  if (!occ) return 'Sin horario';
  if (occ.liveNow) return '🔴 En curso';
  if (occ.daysAhead === 0) return `Hoy ${occ.start}`;
  if (occ.daysAhead === 1) return `Mañana ${occ.start}`;
  const DAY_NAMES = { mon: 'lunes', tue: 'martes', wed: 'miércoles', thu: 'jueves', fri: 'viernes', sat: 'sábado', sun: 'domingo' };
  return `${DAY_NAMES[occ.day] || occ.day} ${occ.start}`;
}

function MeetingRow({ meeting, scope, onEdit, onDelete }) {
  const occ = nextOccurrence(meeting);
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 shadow-sm transition ${
        occ?.liveNow ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white/80'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-slate-800">{meeting.name}</p>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              scope === 'team' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
            }`}
          >
            {scope === 'team' ? 'Equipo' : 'Personal'}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">{describeSchedule(meeting.schedule)}</p>
      </div>

      <span className={`text-sm font-medium ${occ?.liveNow ? 'text-red-600' : 'text-slate-500'}`}>
        {occurrenceLabel(occ)}
      </span>

      <a
        href={meeting.link}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
      >
        Entrar ↗
      </a>

      <div className="flex items-center gap-1">
        <button onClick={() => onEdit(meeting)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Editar">
          ✏️
        </button>
        <button onClick={() => onDelete(meeting)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Eliminar">
          🗑
        </button>
      </div>
    </div>
  );
}

export default function MeetingsView() {
  const [teamMeetings, setTeamMeetings] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState(null);

  const [personalMeetings, setPersonalMeetings] = useLocalStorageState('jira-qa:personalMeetings', []);

  const [formOpen, setFormOpen] = useState(false);
  const [formScope, setFormScope] = useState('personal');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    fetch('/api/meetings/team')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setTeamMeetings(data);
      })
      .catch((err) => setTeamError(err.message))
      .finally(() => setTeamLoading(false));
  }, []);

  const combined = useMemo(() => {
    const withScope = [
      ...teamMeetings.map((m) => ({ ...m, scope: 'team' })),
      ...personalMeetings.map((m) => ({ ...m, scope: 'personal' })),
    ];
    return sortByNextOccurrence(withScope);
  }, [teamMeetings, personalMeetings]);

  function openCreate(scope) {
    setFormScope(scope);
    setEditingId(null);
    setSaveError(null);
    setFormOpen(true);
  }

  function openEdit(meeting) {
    setFormScope(meeting.scope);
    setEditingId(meeting.id);
    setSaveError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setSaveError(null);
  }

  async function saveTeamList(list) {
    const res = await fetch('/api/meetings/team', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetings: list }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error desconocido');
    setTeamMeetings(data);
  }

  async function handleSave(values) {
    setSaving(true);
    setSaveError(null);
    try {
      if (formScope === 'team') {
        const next = editingId
          ? teamMeetings.map((m) => (m.id === editingId ? { ...m, ...values } : m))
          : [...teamMeetings, { id: `m-${Date.now()}`, ...values }];
        await saveTeamList(next);
      } else {
        setPersonalMeetings((prev) =>
          editingId
            ? prev.map((m) => (m.id === editingId ? { ...m, ...values } : m))
            : [...prev, { id: `m-${Date.now()}`, ...values }]
        );
      }
      closeForm();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(meeting) {
    if (!window.confirm(`¿Eliminar "${meeting.name}"?`)) return;
    if (meeting.scope === 'team') {
      try {
        await saveTeamList(teamMeetings.filter((m) => m.id !== meeting.id));
      } catch (err) {
        setTeamError(err.message);
      }
    } else {
      setPersonalMeetings((prev) => prev.filter((m) => m.id !== meeting.id));
    }
  }

  const editingMeeting = editingId ? combined.find((m) => m.id === editingId) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {combined.length} reunión{combined.length === 1 ? '' : 'es'} — las de{' '}
          <span className="font-medium text-indigo-700">Equipo</span> son compartidas (vienen del repositorio), las{' '}
          <span className="font-medium text-purple-700">Personales</span> solo se guardan en este navegador.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => openCreate('personal')}
            className="rounded-full border-2 border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:border-purple-300"
          >
            + Reunión personal
          </button>
          <button
            onClick={() => openCreate('team')}
            className="rounded-full border-2 border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:border-indigo-300"
          >
            + Reunión de equipo
          </button>
        </div>
      </div>

      {formOpen && (
        <MeetingForm
          initial={editingMeeting}
          onCancel={closeForm}
          onSave={handleSave}
          saving={saving}
          error={saveError}
        />
      )}

      {teamError && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
          No se pudieron cargar las reuniones de equipo: {teamError}
        </p>
      )}

      <div className="space-y-3">
        {teamLoading ? (
          <p className="py-8 text-center text-slate-400">Cargando reuniones…</p>
        ) : combined.length === 0 ? (
          <p className="py-8 text-center text-slate-400">Todavía no hay reuniones agregadas.</p>
        ) : (
          combined.map((m) => (
            <MeetingRow key={`${m.scope}-${m.id}`} meeting={m} scope={m.scope} onEdit={openEdit} onDelete={handleDelete} />
          ))
        )}
      </div>
    </div>
  );
}
