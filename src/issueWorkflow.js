const { getClient } = require('./jiraClient');

function throwApiError(error, action) {
  if (error.response && [401, 403].includes(error.response.status)) {
    throw new Error(
      `${action} falló (${error.response.status}). Revisa el scope write:issue:jira o write:jira-work.`
    );
  }
  const details = error.response?.data ? ` ${JSON.stringify(error.response.data)}` : '';
  throw new Error(`${action} falló.${details}`);
}

async function getTransitions(issueKey) {
  const client = await getClient();
  try {
    const { data } = await client.get(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`);
    return data.transitions.map((t) => ({ id: t.id, name: t.name, to: t.to.name }));
  } catch (error) {
    throwApiError(error, `La consulta de transiciones de ${issueKey}`);
  }
}

async function transitionIssue(issueKey, transitionId) {
  const client = await getClient();
  try {
    await client.post(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/transitions`, {
      transition: { id: transitionId },
    });
  } catch (error) {
    throwApiError(error, `El cambio de estado de ${issueKey}`);
  }
}

async function getCommonTransitions(issueKeys) {
  const perIssue = await Promise.all(
    issueKeys.map(async (key) => ({ key, transitions: await getTransitions(key) }))
  );
  const nameSets = perIssue.map((p) => new Set(p.transitions.map((t) => t.name)));
  return [...nameSets[0]].filter((name) => nameSets.every((set) => set.has(name)));
}

async function bulkTransition(issueKeys, targetStatusName) {
  const results = [];
  for (const key of issueKeys) {
    try {
      const transitions = await getTransitions(key);
      const match = transitions.find((t) => t.name === targetStatusName);
      if (!match) throw new Error(`No hay transición a "${targetStatusName}" disponible para ${key}.`);
      await transitionIssue(key, match.id);
      results.push({ key, ok: true });
    } catch (error) {
      results.push({ key, ok: false, error: error.message });
    }
  }
  return results;
}

module.exports = { getTransitions, transitionIssue, getCommonTransitions, bulkTransition };
