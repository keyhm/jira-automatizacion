import { useState } from 'react';

function KeywordsInput({ value, onCommit }) {
  const [text, setText] = useState((value || []).join(', '));
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => onCommit(text.split(',').map((k) => k.trim()).filter(Boolean))}
      placeholder="palabras del título (opcional): ej. lalexpo, hal"
      className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
    />
  );
}

/**
 * Cada QA elige los proyectos (épicas de Jira) que sigue. Se guarda en su
 * navegador, así el mismo proyecto de código sirve a todo el equipo.
 */
export default function QaProjectsEditor({ epics, projects, onChange }) {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const visible = epics.filter((e) => !q || e.summary.toLowerCase().includes(q) || e.key.toLowerCase().includes(q));

  function toggle(epic) {
    if (projects.some((p) => p.id === epic.key)) {
      onChange(projects.filter((p) => p.id !== epic.key));
    } else {
      onChange([...projects, { id: epic.key, label: epic.summary, epicKey: epic.key, keywords: [] }]);
    }
  }

  function setKeywords(epicKey, keywords) {
    onChange(projects.map((p) => (p.id === epicKey ? { ...p, keywords } : p)));
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">Mis proyectos</h3>
        <p className="text-xs text-slate-400">
          Marca los proyectos (épicas) de los que eres QA. Se guarda solo en tu navegador: cada persona del equipo elige los suyos.
          Las palabras clave sirven para incluir tareas del proyecto que no tengan épica.
        </p>
      </div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar proyecto…"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
      />
      <div className="max-h-72 space-y-1 overflow-y-auto">
        {visible.map((epic) => {
          const project = projects.find((p) => p.id === epic.key);
          return (
            <div key={epic.key} className={`rounded-xl px-3 py-2 ${project ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={!!project} onChange={() => toggle(epic)} className="rounded border-slate-300" />
                <span>{epic.summary}</span>
                <span className="text-xs text-slate-400">{epic.key}</span>
              </label>
              {project && <KeywordsInput value={project.keywords} onCommit={(kw) => setKeywords(epic.key, kw)} />}
            </div>
          );
        })}
        {visible.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No hay proyectos que coincidan.</p>}
      </div>
    </div>
  );
}
