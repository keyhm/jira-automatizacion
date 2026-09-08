const { getClient } = require('./jiraClient');
const { normalizeIssue } = require('./sprintReport');

const DEFAULT_BOARD_ID = process.env.JIRA_BOARD_ID || '2';

function throwApiError(error, action) {
  if (error.response && [401, 403].includes(error.response.status)) {
    throw new Error(
      `${action} falló (${error.response.status}). Falta el scope write:board-scope:jira-software en el token (permite mover issues entre el backlog y el board).`
    );
  }
  const details = error.response?.data ? ` ${JSON.stringify(error.response.data)}` : '';
  throw new Error(`${action} falló.${details}`);
}

/**
 * Los Epics aparecen en el backlog de la API pero en este proyecto funcionan
 * como "proyectos" contenedores, no como tareas de trabajo, así que se omiten.
 */
async function listBacklogIssues(boardId = DEFAULT_BOARD_ID) {
  const client = await getClient();
  const issues = [];
  let startAt = 0;
  const maxResults = 50;

  while (true) {
    let data;
    try {
      ({ data } = await client.get(`/rest/agile/1.0/board/${encodeURIComponent(boardId)}/backlog`, {
        params: {
          startAt,
          maxResults,
          fields: 'summary,status,issuetype,timespent,parent,assignee,comment',
        },
      }));
    } catch (error) {
      throwApiError(error, 'La consulta del backlog');
    }

    issues.push(...data.issues);
    if (data.startAt + data.issues.length >= data.total) break;
    startAt += maxResults;
  }

  return issues.map(normalizeIssue).filter((issue) => issue.type !== 'Epic');
}

async function moveIssuesToBacklog(issueKeys) {
  const client = await getClient();
  try {
    await client.post('/rest/agile/1.0/backlog/issue', { issues: issueKeys });
  } catch (error) {
    throwApiError(error, `Mover ${issueKeys.length} issue(s) al backlog`);
  }
}

module.exports = { listBacklogIssues, moveIssuesToBacklog };
