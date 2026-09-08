import { useEffect, useState } from 'react';
import CreateTaskView from './components/CreateTaskView';
import ReportView from './components/ReportView';
import IssuesView from './components/IssuesView';
import SprintPicker from './components/SprintPicker';
import useLocalStorageState from './hooks/useLocalStorageState';

const TABS = [
  { id: 'create', label: 'Crear tarea', emoji: '✨' },
  { id: 'board', label: 'Tablero', emoji: '🗂️' },
  { id: 'report', label: 'Reporte', emoji: '📊' },
];

const BOARD_WIDTHS = {
  normal: 'max-w-3xl',
  ancho: 'max-w-6xl',
  completo: 'max-w-full',
};

export default function App() {
  const [tab, setTab] = useLocalStorageState('jira-qa:tab', 'create');
  const [boardWidth, setBoardWidth] = useLocalStorageState('jira-qa:boardWidth', 'ancho');

  const [health, setHealth] = useState(null);

  const [sprints, setSprints] = useState([]);
  const [sprintsLoading, setSprintsLoading] = useState(true);
  const [sprintsError, setSprintsError] = useState(null);
  const [selectedSprintId, setSelectedSprintId] = useLocalStorageState('jira-qa:selectedSprintId', null);

  const [epics, setEpics] = useState([]);
  const [epicsLoading, setEpicsLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then(setHealth).catch(() => {});

    fetch('/api/sprints')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSprints(data);
        setSelectedSprintId((current) => {
          if (current && data.some((s) => s.id === current)) return current;
          const active = data.find((s) => s.state === 'active');
          return (active || data[0])?.id ?? null;
        });
      })
      .catch((err) => setSprintsError(err.message))
      .finally(() => setSprintsLoading(false));

    fetch('/api/epics')
      .then((r) => r.json())
      .then((data) => setEpics(Array.isArray(data) ? data : []))
      .catch(() => setEpics([]))
      .finally(() => setEpicsLoading(false));

    fetch('/api/users/assignable')
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, []);

  const sprint = sprints.find((s) => s.id === selectedSprintId) || null;

  const shared = {
    health,
    sprints,
    sprintsLoading,
    sprintsError,
    sprint,
    selectedSprintId,
    epics,
    epicsLoading,
    users,
    usersLoading,
    boardWidth,
    setBoardWidth,
  };

  const containerWidth = tab === 'board' ? BOARD_WIDTHS[boardWidth] || BOARD_WIDTHS.ancho : 'max-w-3xl';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 font-sans text-slate-800">
      <div className={`mx-auto px-4 py-10 transition-all ${containerWidth}`}>
        <header className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl text-white shadow-lg shadow-indigo-200">
            ✨
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Jira Automation QA</h1>
          <p className="text-slate-500">Crea, gestiona y reporta cualquier sprint sin salir de esta pantalla.</p>

          <SprintPicker
            sprints={sprints}
            loading={sprintsLoading}
            value={selectedSprintId ?? ''}
            onChange={setSelectedSprintId}
          />
          {sprintsError && (
            <p className="text-sm text-red-600">No se pudieron cargar los sprints: {sprintsError}</p>
          )}

          <nav className="mt-2 inline-flex rounded-full bg-white/70 p-1 shadow-sm ring-1 ring-slate-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition ${
                  tab === t.id ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        {tab === 'create' && <CreateTaskView {...shared} />}
        {tab === 'board' && <IssuesView {...shared} />}
        {tab === 'report' && <ReportView {...shared} />}
      </div>
    </div>
  );
}
