const express = require('express');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const { getClient } = require('../src/jiraClient');
const {
  createIssueInSprint,
  getActiveSprint,
  searchAssignableUsers,
  getEpics,
  updateIssueEpic,
  updateIssueAssignee,
} = require('../src/createIssueInSprint');
const { getSprintReport, listSprintIssues } = require('../src/sprintReport');
const { getTransitions, transitionIssue, getCommonTransitions, bulkTransition } = require('../src/issueWorkflow');
const { listWorklogs, addWorklog, updateWorklog, deleteWorklog } = require('../src/worklog');
const { listSprints, moveIssuesToSprint } = require('../src/sprints');
const { listComments, addComment, deleteComment } = require('../src/comments');
const { listBacklogIssues, moveIssuesToBacklog } = require('../src/backlog');
const { uploadAttachment, getAttachmentContent } = require('../src/attachments');

const app = express();
const PORT = process.env.SERVER_PORT || 4000;
const PROJECT_KEY = process.env.JIRA_PROJECT_KEY;
const BOARD_ID = process.env.JIRA_BOARD_ID || '2';

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.get('/api/health', async (_req, res) => {
  try {
    const client = await getClient();
    const { data } = await client.get(`/rest/api/3/project/${encodeURIComponent(PROJECT_KEY)}`);
    res.json({ ok: true, project: { key: data.key, name: data.name } });
  } catch (error) {
    res.status(error.response?.status || 500).json({ ok: false, error: error.message });
  }
});

app.get('/api/sprints', async (_req, res) => {
  try {
    const sprints = await listSprints(BOARD_ID);
    res.json(sprints);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/sprint/active', async (_req, res) => {
  try {
    const client = await getClient();
    const sprint = await getActiveSprint(client, BOARD_ID);
    res.json(sprint);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/users/assignable', async (req, res) => {
  try {
    const client = await getClient();
    const users = await searchAssignableUsers(client, PROJECT_KEY, req.query.query || '');
    res.json(users);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/epics', async (_req, res) => {
  try {
    const client = await getClient();
    const epics = await getEpics(client, PROJECT_KEY);
    res.json(epics);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/report/sprint', async (req, res) => {
  try {
    const report = await getSprintReport({
      sprintId: req.query.sprintId,
      boardId: BOARD_ID,
      epicKey: req.query.epicKey || undefined,
      assigneeAccountId: req.query.assigneeAccountId || undefined,
    });
    res.json(report);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/sprint/issues', async (req, res) => {
  try {
    const { sprint, issues } = await listSprintIssues({ sprintId: req.query.sprintId, boardId: BOARD_ID });
    res.json({ sprint, issues });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/backlog', async (_req, res) => {
  try {
    const issues = await listBacklogIssues(BOARD_ID);
    res.json({ issues });
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/backlog/issues', async (req, res) => {
  const { issueKeys } = req.body;
  if (!Array.isArray(issueKeys) || issueKeys.length === 0) {
    return res.status(400).json({ error: 'issueKeys debe ser un arreglo no vacío.' });
  }
  try {
    await moveIssuesToBacklog(issueKeys);
    res.status(204).end();
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/issues/:key/transitions', async (req, res) => {
  try {
    const transitions = await getTransitions(req.params.key);
    res.json(transitions);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/issues/:key/transitions', async (req, res) => {
  const { transitionId } = req.body;
  if (!transitionId) {
    return res.status(400).json({ error: 'transitionId es obligatorio.' });
  }
  try {
    await transitionIssue(req.params.key, transitionId);
    res.status(204).end();
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.put('/api/issues/:key/epic', async (req, res) => {
  const { epicKey } = req.body;
  try {
    await updateIssueEpic(req.params.key, epicKey || null);
    res.status(204).end();
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.put('/api/issues/:key/assignee', async (req, res) => {
  const { accountId } = req.body;
  try {
    await updateIssueAssignee(req.params.key, accountId || null);
    res.status(204).end();
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/issues/bulk/common-transitions', async (req, res) => {
  const { issueKeys } = req.body;
  if (!Array.isArray(issueKeys) || issueKeys.length === 0) {
    return res.status(400).json({ error: 'issueKeys debe ser un arreglo no vacío.' });
  }
  try {
    const statusNames = await getCommonTransitions(issueKeys);
    res.json(statusNames);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/issues/bulk/transition', async (req, res) => {
  const { issueKeys, statusName } = req.body;
  if (!Array.isArray(issueKeys) || issueKeys.length === 0 || !statusName) {
    return res.status(400).json({ error: 'issueKeys y statusName son obligatorios.' });
  }
  try {
    const results = await bulkTransition(issueKeys, statusName);
    res.json(results);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/sprints/:sprintId/issues', async (req, res) => {
  const { issueKeys } = req.body;
  if (!Array.isArray(issueKeys) || issueKeys.length === 0) {
    return res.status(400).json({ error: 'issueKeys debe ser un arreglo no vacío.' });
  }
  try {
    await moveIssuesToSprint(req.params.sprintId, issueKeys);
    res.status(204).end();
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/issues/:key/comments', async (req, res) => {
  try {
    const comments = await listComments(req.params.key);
    res.json(comments);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/issues/:key/comments', async (req, res) => {
  const { text, adf } = req.body;
  if (!adf && (!text || !text.trim())) {
    return res.status(400).json({ error: 'El comentario no puede estar vacío.' });
  }
  try {
    const comment = await addComment(req.params.key, { text: text?.trim(), adf });
    res.status(201).json(comment);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/issues/:key/attachments', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  }
  try {
    const attachment = await uploadAttachment(req.params.key, {
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
    });
    res.status(201).json(attachment);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/attachments/:id/content', async (req, res) => {
  try {
    const { buffer, contentType } = await getAttachmentContent(req.params.id);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.delete('/api/issues/:key/comments/:commentId', async (req, res) => {
  try {
    await deleteComment(req.params.key, req.params.commentId);
    res.status(204).end();
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/issues/:key/worklogs', async (req, res) => {
  try {
    const worklogs = await listWorklogs(req.params.key);
    res.json(worklogs);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/issues/:key/worklogs', async (req, res) => {
  const { timeSpentSeconds } = req.body;
  if (!timeSpentSeconds || timeSpentSeconds <= 0) {
    return res.status(400).json({ error: 'timeSpentSeconds debe ser mayor a 0.' });
  }
  try {
    const worklog = await addWorklog(req.params.key, timeSpentSeconds);
    res.status(201).json(worklog);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.put('/api/issues/:key/worklogs/:worklogId', async (req, res) => {
  const { timeSpentSeconds } = req.body;
  if (!timeSpentSeconds || timeSpentSeconds <= 0) {
    return res.status(400).json({ error: 'timeSpentSeconds debe ser mayor a 0.' });
  }
  try {
    const worklog = await updateWorklog(req.params.key, req.params.worklogId, timeSpentSeconds);
    res.json(worklog);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.delete('/api/issues/:key/worklogs/:worklogId', async (req, res) => {
  try {
    await deleteWorklog(req.params.key, req.params.worklogId);
    res.status(204).end();
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/issues', async (req, res) => {
  const { issueType, summary, description, sprintId, assigneeAccountId, epicKey, timeSpentSeconds, status } = req.body;

  if (!summary) {
    return res.status(400).json({ error: 'El resumen es obligatorio.' });
  }

  try {
    const issue = await createIssueInSprint({
      project: PROJECT_KEY,
      issueType: issueType || 'Task',
      summary,
      description,
      sprint: sprintId,
      boardId: BOARD_ID,
      assigneeAccountId: assigneeAccountId || undefined,
      epicKey: epicKey || undefined,
      timeSpentSeconds: timeSpentSeconds || undefined,
      status: status || undefined,
    });
    res.status(201).json(issue);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor API en http://localhost:${PORT}`);
});
