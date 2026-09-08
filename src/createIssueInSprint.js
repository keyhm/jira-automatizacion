const { getClient } = require('./jiraClient');
const { addWorklog } = require('./worklog');
const { getTransitions, transitionIssue } = require('./issueWorkflow');

const DEFAULT_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'JS';
const DEFAULT_BOARD_ID = process.env.JIRA_BOARD_ID || '2';

/**
 * Acepta texto plano (lo envuelve en ADF) o un documento ADF ya armado por el
 * editor enriquecido del frontend.
 */
function toDescription(description) {
  if (!description) return undefined;

  if (typeof description === 'object') return description;

  return {
    type: 'doc',
    version: 1,
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: String(description) }],
      },
    ],
  };
}

function throwApiError(error, action) {
  if (error.response && [401, 403].includes(error.response.status)) {
    const scopeMessage = action.includes('sprint')
      ? 'Revisa los scopes read:board-scope:jira-software, read:sprint:jira-software y write:sprint:jira-software.'
      : 'Revisa el scope write:jira-work y los permisos de creación del proyecto.';
    throw new Error(
      `${action} falló (${error.response.status}). ${scopeMessage}`
    );
  }

  const details = error.response?.data
    ? ` ${JSON.stringify(error.response.data)}`
    : '';
  throw new Error(`${action} falló.${details}`);
}

async function getActiveSprint(client, boardId) {
  try {
    const { data } = await client.get(
      `/rest/agile/1.0/board/${encodeURIComponent(boardId)}/sprint`,
      { params: { state: 'active' } }
    );

    const activeSprint = data.values?.[0];
    if (!activeSprint) {
      throw new Error(`No hay un sprint activo en el board ${boardId}.`);
    }
    return activeSprint;
  } catch (error) {
    if (error.message.startsWith('No hay un sprint')) throw error;
    throwApiError(error, 'La consulta del sprint activo');
  }
}

async function searchAssignableUsers(client, project, query = '') {
  try {
    const { data } = await client.get('/rest/api/3/user/assignable/search', {
      params: { project, query, maxResults: 25 },
    });
    return data;
  } catch (error) {
    throwApiError(error, 'La búsqueda de usuarios asignables');
  }
}

async function getEpics(client, project) {
  try {
    const { data } = await client.get('/rest/api/3/search/jql', {
      params: {
        jql: `project = ${project} AND issuetype = Epic ORDER BY summary ASC`,
        fields: 'summary,status',
        maxResults: 100,
      },
    });
    return data.issues.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
    }));
  } catch (error) {
    throwApiError(error, 'La consulta de epics');
  }
}

async function createIssueInSprint({
  project = DEFAULT_PROJECT_KEY,
  issueType = 'Task',
  summary,
  description,
  sprint,
  boardId = DEFAULT_BOARD_ID,
  assigneeAccountId,
  epicKey,
  timeSpentSeconds,
  status,
} = {}) {
  if (!project) throw new Error('El proyecto es obligatorio.');
  if (!summary) throw new Error('El resumen es obligatorio.');

  const client = await getClient();
  const targetSprint = sprint || await getActiveSprint(client, boardId);
  const sprintId = typeof targetSprint === 'object' ? targetSprint.id : targetSprint;

  if (!sprintId) throw new Error('El sprint debe ser un ID válido.');

  const fields = {
    project: { key: project },
    issuetype: { name: issueType },
    summary,
  };
  const formattedDescription = toDescription(description);
  if (formattedDescription) fields.description = formattedDescription;
  if (assigneeAccountId) fields.assignee = { accountId: assigneeAccountId };
  if (epicKey) fields.parent = { key: epicKey };

  let createdIssue;
  try {
    const { data } = await client.post('/rest/api/3/issue', { fields });
    createdIssue = data;
  } catch (error) {
    throwApiError(error, 'La creación del issue');
  }

  try {
    await client.post(`/rest/agile/1.0/sprint/${encodeURIComponent(sprintId)}/issue`, {
      issues: [createdIssue.key],
    });
  } catch (error) {
    throwApiError(error, `La asignación del issue ${createdIssue.key} al sprint ${sprintId}`);
  }

  if (timeSpentSeconds > 0) {
    await addWorklog(createdIssue.key, timeSpentSeconds, client);
  }

  if (status) {
    const transitions = await getTransitions(createdIssue.key);
    const match = transitions.find((t) => t.to === status);
    if (match) {
      await transitionIssue(createdIssue.key, match.id);
    }
  }

  return {
    ...createdIssue,
    sprint: targetSprint,
  };
}

async function updateIssueEpic(issueKey, epicKey) {
  const client = await getClient();
  try {
    await client.put(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
      fields: { parent: epicKey ? { key: epicKey } : null },
    });
  } catch (error) {
    throwApiError(error, `El cambio de proyecto (Epic) de ${issueKey}`);
  }
}

async function updateIssueAssignee(issueKey, accountId) {
  const client = await getClient();
  try {
    await client.put(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/assignee`, {
      accountId: accountId || null,
    });
  } catch (error) {
    throwApiError(error, `El cambio de responsable de ${issueKey}`);
  }
}

module.exports = {
  createIssueInSprint,
  getActiveSprint,
  searchAssignableUsers,
  getEpics,
  updateIssueEpic,
  updateIssueAssignee,
};
