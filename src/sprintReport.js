const { getClient } = require('./jiraClient');
const { getActiveSprint } = require('./createIssueInSprint');

const DEFAULT_BOARD_ID = process.env.JIRA_BOARD_ID || '2';

function throwApiError(error, action) {
  if (error.response && [401, 403].includes(error.response.status)) {
    throw new Error(
      `${action} falló (${error.response.status}). Revisa los scopes read:jira-work, read:board-scope:jira-software y read:sprint:jira-software.`
    );
  }
  const details = error.response?.data ? ` ${JSON.stringify(error.response.data)}` : '';
  throw new Error(`${action} falló.${details}`);
}

function normalizeIssue(issue) {
  const epic = issue.fields.parent
    ? { key: issue.fields.parent.key, summary: issue.fields.parent.fields?.summary || issue.fields.parent.key }
    : null;
  const assignee = issue.fields.assignee
    ? {
        accountId: issue.fields.assignee.accountId,
        displayName: issue.fields.assignee.displayName,
        avatarUrl: issue.fields.assignee.avatarUrls?.['24x24'],
      }
    : null;

  return {
    key: issue.key,
    summary: issue.fields.summary,
    type: issue.fields.issuetype.name,
    status: issue.fields.status.name,
    statusCategory: issue.fields.status.statusCategory.key,
    secondsLogged: issue.fields.timespent || 0,
    commentCount: issue.fields.comment?.total ?? 0,
    epic,
    assignee,
  };
}

async function getSprintIssues(client, boardId, sprintId) {
  const issues = [];
  let startAt = 0;
  const maxResults = 50;

  while (true) {
    let data;
    try {
      ({ data } = await client.get(`/rest/agile/1.0/board/${encodeURIComponent(boardId)}/issue`, {
        params: {
          jql: `sprint = ${sprintId}`,
          startAt,
          maxResults,
          fields: 'summary,status,issuetype,timespent,parent,assignee,comment',
        },
      }));
    } catch (error) {
      throwApiError(error, 'La consulta de issues del sprint');
    }

    issues.push(...data.issues);
    if (data.startAt + data.issues.length >= data.total) break;
    startAt += maxResults;
  }

  return issues.map(normalizeIssue);
}

async function resolveSprint(client, sprintId, boardId) {
  return sprintId ? { id: sprintId } : getActiveSprint(client, boardId);
}

async function listSprintIssues({ sprintId, boardId = DEFAULT_BOARD_ID } = {}) {
  const client = await getClient();
  const sprint = await resolveSprint(client, sprintId, boardId);
  const issues = await getSprintIssues(client, boardId, sprint.id);
  return { sprint, issues };
}

async function getSprintReport({ sprintId, boardId = DEFAULT_BOARD_ID, epicKey, assigneeAccountId } = {}) {
  const client = await getClient();
  const sprint = await resolveSprint(client, sprintId, boardId);
  const allIssues = await getSprintIssues(client, boardId, sprint.id);

  const issues = allIssues.filter((issue) => {
    if (epicKey && issue.epic?.key !== epicKey) return false;
    if (assigneeAccountId && issue.assignee?.accountId !== assigneeAccountId) return false;
    return true;
  });

  const byStatus = {};
  const byType = {};
  const byEpic = {};
  const byAssignee = {};
  let doneCount = 0;
  let totalSecondsLogged = 0;

  for (const issue of issues) {
    byStatus[issue.status] = (byStatus[issue.status] || 0) + 1;
    byType[issue.type] = (byType[issue.type] || 0) + 1;
    if (issue.statusCategory === 'done') doneCount += 1;
    totalSecondsLogged += issue.secondsLogged;

    const epicLabel = issue.epic ? issue.epic.summary : 'Sin proyecto asociado';
    if (!byEpic[epicLabel]) byEpic[epicLabel] = { issues: 0, secondsLogged: 0 };
    byEpic[epicLabel].issues += 1;
    byEpic[epicLabel].secondsLogged += issue.secondsLogged;

    const assigneeLabel = issue.assignee ? issue.assignee.displayName : 'Sin asignar';
    if (!byAssignee[assigneeLabel]) byAssignee[assigneeLabel] = { issues: 0, secondsLogged: 0 };
    byAssignee[assigneeLabel].issues += 1;
    byAssignee[assigneeLabel].secondsLogged += issue.secondsLogged;
  }

  return {
    sprint,
    totalIssues: issues.length,
    completedIssues: doneCount,
    percentComplete: issues.length ? Math.round((doneCount / issues.length) * 100) : 0,
    byStatus,
    byType,
    byEpic,
    byAssignee,
    totalHoursLogged: Math.round((totalSecondsLogged / 3600) * 100) / 100,
  };
}

module.exports = { getSprintReport, listSprintIssues, normalizeIssue };
