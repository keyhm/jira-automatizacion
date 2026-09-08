const { getClient } = require('./jiraClient');

function throwApiError(error, action) {
  if (error.response && [401, 403].includes(error.response.status)) {
    throw new Error(
      `${action} falló (${error.response.status}). Revisa el scope write:issue-worklog:jira (o read:issue-worklog:jira para lectura).`
    );
  }
  const details = error.response?.data ? ` ${JSON.stringify(error.response.data)}` : '';
  throw new Error(`${action} falló.${details}`);
}

function normalizeWorklog(w) {
  return {
    id: w.id,
    author: w.author?.displayName || 'Desconocido',
    timeSpentSeconds: w.timeSpentSeconds,
    started: w.started,
    comment: typeof w.comment === 'string' ? w.comment : undefined,
  };
}

async function listWorklogs(issueKey) {
  const client = await getClient();
  try {
    const { data } = await client.get(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog`);
    return data.worklogs.map(normalizeWorklog);
  } catch (error) {
    throwApiError(error, `La consulta de tiempos de ${issueKey}`);
  }
}

async function addWorklog(issueKey, timeSpentSeconds, client) {
  const c = client || (await getClient());
  try {
    const { data } = await c.post(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog`, {
      timeSpentSeconds,
    });
    return normalizeWorklog(data);
  } catch (error) {
    throwApiError(error, `El registro de tiempo en ${issueKey}`);
  }
}

async function updateWorklog(issueKey, worklogId, timeSpentSeconds) {
  const client = await getClient();
  try {
    const { data } = await client.put(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog/${encodeURIComponent(worklogId)}`,
      { timeSpentSeconds }
    );
    return normalizeWorklog(data);
  } catch (error) {
    throwApiError(error, `La edición del tiempo ${worklogId} en ${issueKey}`);
  }
}

async function deleteWorklog(issueKey, worklogId) {
  const client = await getClient();
  try {
    await client.delete(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/worklog/${encodeURIComponent(worklogId)}`
    );
  } catch (error) {
    throwApiError(error, `La eliminación del tiempo ${worklogId} en ${issueKey}`);
  }
}

module.exports = { listWorklogs, addWorklog, updateWorklog, deleteWorklog };
