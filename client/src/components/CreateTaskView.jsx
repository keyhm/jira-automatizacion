import { useState } from 'react';
import EpicPicker from './EpicPicker';
import RichTextEditor from './RichTextEditor';
import RichTextView from './RichTextView';
import { tiptapToAdf, isEmptyDoc } from '../lib/adf';

const ISSUE_TYPES = [
  { value: 'Task', label: 'Tarea', emoji: '📋' },
  { value: 'Bug', label: 'Bug', emoji: '🐞' },
  { value: 'Story', label: 'Historia', emoji: '📖' },
];

const STATUSES = [
  { value: 'To Do', label: 'Por hacer', emoji: '📥' },
  { value: 'In Progress', label: 'En progreso', emoji: '🔄' },
  { value: 'Done', label: 'Hecha', emoji: '✅' },
];

const STEPS = { FORM: 'form', CONFIRM: 'confirm', DONE: 'done' };

const emptyForm = {
  issueType: 'Task',
  summary: '',
  description: null,
  assigneeAccountId: '',
  epicKey: '',
  hours: '',
  minutes: '',
  status: 'To Do',
};

export default function CreateTaskView({
  health,
  sprint,
  epics,
  epicsLoading,
  users,
  usersLoading,
}) {
  const [step, setStep] = useState(STEPS.FORM);
  const [form, setForm] = useState(emptyForm);
  const [editorKey, setEditorKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function goToConfirm(e) {
    e.preventDefault();
    if (!form.summary.trim()) return;
    setStep(STEPS.CONFIRM);
  }

  function timeSpentSeconds() {
    const h = parseFloat(form.hours) || 0;
    const m = parseFloat(form.minutes) || 0;
    return Math.round(h * 3600 + m * 60);
  }

  async function confirmCreate() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issueType: form.issueType,
          summary: form.summary,
          description: form.description && !isEmptyDoc(form.description) ? tiptapToAdf(form.description) : undefined,
          sprintId: sprint?.id,
          assigneeAccountId: form.assigneeAccountId || undefined,
          epicKey: form.epicKey || undefined,
          timeSpentSeconds: timeSpentSeconds() || undefined,
          status: form.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error desconocido');
      setResult(data);
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    setForm(emptyForm);
    setEditorKey((k) => k + 1);
    setResult(null);
    setError(null);
    setStep(STEPS.FORM);
  }

  const issueMeta = ISSUE_TYPES.find((t) => t.value === form.issueType);
  const statusMeta = STATUSES.find((s) => s.value === form.status);
  const selectedAssignee = users.find((u) => u.accountId === form.assigneeAccountId);
  const selectedEpic = epics.find((e) => e.key === form.epicKey);
  const seconds = timeSpentSeconds();
  const timeLabel = seconds > 0 ? `${(seconds / 3600).toFixed(2)}h` : null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
        {health?.ok && (
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            {health.project.key} · {health.project.name}
          </span>
        )}
        {sprint?.state && sprint.state !== 'active' && (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700">
            Creando en un sprint {sprint.state === 'closed' ? 'cerrado' : 'futuro'}
          </span>
        )}
      </div>

      <main className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-8">
        {step === STEPS.FORM && (
          <form onSubmit={goToConfirm} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Tipo de tarea</label>
              <div className="grid grid-cols-3 gap-3">
                {ISSUE_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.value}
                    onClick={() => updateField('issueType', t.value)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 text-sm font-medium transition ${
                      form.issueType === t.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Estado inicial</label>
              <div className="grid grid-cols-3 gap-3">
                {STATUSES.map((s) => (
                  <button
                    type="button"
                    key={s.value}
                    onClick={() => updateField('status', s.value)}
                    className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 text-sm font-medium transition ${
                      form.status === s.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xl">{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Resumen</label>
              <input
                type="text"
                required
                value={form.summary}
                onChange={(e) => updateField('summary', e.target.value)}
                placeholder="Ej: Validar flujo de login en QA"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Descripción (opcional)</label>
              <RichTextEditor
                key={editorKey}
                value={form.description}
                onChange={(doc) => updateField('description', doc)}
                minHeight={140}
                maxHeight={360}
                placeholder="Detalles, pasos, criterios de aceptación…"
              />
              <p className="mt-1 text-xs text-slate-400">
                Para adjuntar imágenes, créala primero y luego súbelas desde los comentarios en el Tablero.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Proyecto asociado (Epic)</label>
              <EpicPicker
                epics={epics}
                loading={epicsLoading}
                value={form.epicKey}
                onChange={(key) => updateField('epicKey', key)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Asignar a</label>
              {usersLoading ? (
                <p className="text-sm text-slate-400">Cargando participantes…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('assigneeAccountId', '')}
                    className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition ${
                      !form.assigneeAccountId
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs">?</span>
                    Sin asignar
                  </button>
                  {users.map((u) => (
                    <button
                      type="button"
                      key={u.accountId}
                      onClick={() => updateField('assigneeAccountId', u.accountId)}
                      className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition ${
                        form.assigneeAccountId === u.accountId
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <img
                        src={u.avatarUrls?.['24x24']}
                        alt=""
                        className="h-6 w-6 rounded-full bg-slate-200"
                      />
                      {u.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Tiempo invertido (opcional)</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={form.hours}
                    onChange={(e) => updateField('hours', e.target.value)}
                    placeholder="0"
                    className="w-24 rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                  <span className="text-sm text-slate-500">horas</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={form.minutes}
                    onChange={(e) => updateField('minutes', e.target.value)}
                    placeholder="0"
                    className="w-24 rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                  <span className="text-sm text-slate-500">minutos</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">Se registra como worklog en Jira al crear la tarea.</p>
            </div>

            <button
              type="submit"
              disabled={!sprint || !form.summary.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 font-medium text-white shadow-lg shadow-indigo-200 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Revisar antes de crear
            </button>
          </form>
        )}

        {step === STEPS.CONFIRM && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Confirma los datos</h2>
            <dl className="space-y-3 rounded-2xl bg-slate-50 p-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Tipo</dt>
                <dd className="font-medium text-slate-800">{issueMeta.emoji} {issueMeta.label}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Estado inicial</dt>
                <dd className="font-medium text-slate-800">{statusMeta.emoji} {statusMeta.label}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Resumen</dt>
                <dd className="text-right font-medium text-slate-800">{form.summary}</dd>
              </div>
              {form.description && !isEmptyDoc(form.description) && (
                <div className="flex justify-between gap-4">
                  <dt className="shrink-0 text-slate-500">Descripción</dt>
                  <dd className="max-w-xs text-right text-slate-700">
                    <RichTextView adf={tiptapToAdf(form.description)} />
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Proyecto (Epic)</dt>
                <dd className="font-medium text-slate-800">{selectedEpic ? selectedEpic.summary : 'Sin proyecto asociado'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Asignado a</dt>
                <dd className="flex items-center gap-2 font-medium text-slate-800">
                  {selectedAssignee ? (
                    <>
                      <img src={selectedAssignee.avatarUrls?.['24x24']} alt="" className="h-5 w-5 rounded-full" />
                      {selectedAssignee.displayName}
                    </>
                  ) : (
                    'Sin asignar'
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Tiempo a registrar</dt>
                <dd className="font-medium text-slate-800">{timeLabel || 'No se registrará tiempo'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Sprint</dt>
                <dd className="font-medium text-slate-800">{sprint.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Proyecto Jira</dt>
                <dd className="font-medium text-slate-800">{health?.project?.key}</dd>
              </div>
            </dl>

            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(STEPS.FORM)}
                className="flex-1 rounded-xl border border-slate-200 py-3 font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Volver a editar
              </button>
              <button
                onClick={confirmCreate}
                disabled={submitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 font-medium text-white shadow-lg shadow-indigo-200 transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? 'Creando…' : 'Sí, crear la tarea'}
              </button>
            </div>
          </div>
        )}

        {step === STEPS.DONE && result && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
              ✅
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Tarea creada</h2>
              <p className="text-slate-500">Se agregó al sprint {result.sprint?.name}.</p>
            </div>
            <a
              href={`https://${import.meta.env.VITE_JIRA_DOMAIN || ''}/browse/${result.key}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Ver {result.key} en Jira ↗
            </a>
            <button
              onClick={startOver}
              className="block w-full rounded-xl border border-slate-200 py-3 font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Crear otra tarea
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
