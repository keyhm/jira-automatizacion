import { useCallback, useEffect, useState } from 'react';

/**
 * Carga los issues del sprint seleccionado (source = 'sprint') o del backlog
 * (source = 'backlog'). `patchIssue` actualiza una tarea en memoria después de
 * cambiar algo en Jira, sin volver a pedir todo.
 */
export default function useSprintIssues(sprintId, source = 'sprint') {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    if (source === 'sprint' && !sprintId) return undefined;
    const url = source === 'backlog' ? '/api/backlog' : `/api/sprint/issues?sprintId=${sprintId}`;
    let cancelled = false;

    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        if (!cancelled) setIssues(data.issues);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sprintId, source]);

  useEffect(() => load(), [load]);

  const patchIssue = useCallback((key, patch) => {
    setIssues((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }, []);

  return { issues, loading, error, reload: load, patchIssue };
}
