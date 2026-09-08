const { getClient } = require('./jiraClient');

function throwApiError(error, action) {
  if (error.response && [401, 403].includes(error.response.status)) {
    throw new Error(
      `${action} falló (${error.response.status}). Revisa los scopes read:board-scope:jira-software y read:sprint:jira-software.`
    );
  }
  const details = error.response?.data ? ` ${JSON.stringify(error.response.data)}` : '';
  throw new Error(`${action} falló.${details}`);
}

async function listSprints(boardId) {
  const client = await getClient();
  const sprints = [];
  let startAt = 0;
  const maxResults = 50;

  while (true) {
    let data;
    try {
      ({ data } = await client.get(`/rest/agile/1.0/board/${encodeURIComponent(boardId)}/sprint`, {
        params: { startAt, maxResults },
      }));
    } catch (error) {
      throwApiError(error, 'La consulta de sprints del board');
    }

    sprints.push(...data.values);
    if (data.isLast) break;
    startAt += maxResults;
  }

  return sprints
    .map((s) => ({ id: s.id, name: s.name, state: s.state, startDate: s.startDate, endDate: s.endDate }))
    .sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
}

async function moveIssuesToSprint(sprintId, issueKeys) {
  const client = await getClient();
  try {
    await client.post(`/rest/agile/1.0/sprint/${encodeURIComponent(sprintId)}/issue`, {
      issues: issueKeys,
    });
  } catch (error) {
    throwApiError(error, `Mover ${issueKeys.length} issue(s) al sprint ${sprintId}`);
  }
}

module.exports = { listSprints, moveIssuesToSprint };
