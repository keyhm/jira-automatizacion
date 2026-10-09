const fs = require('fs/promises');
const path = require('path');

/**
 * Las reuniones de equipo NO viven en Jira — es un archivo JSON simple
 * dentro del repositorio (data/team-meetings.json). "Compartido" aquí
 * significa lo mismo que el resto del proyecto: cada quien corre su propio
 * servidor local, así que para que un cambio le llegue a otra persona hay
 * que confirmarlo y publicarlo con git, igual que con el código.
 */
const FILE_PATH = path.join(__dirname, '..', 'data', 'team-meetings.json');

function normalize(meetings) {
  if (!Array.isArray(meetings)) return [];
  return meetings
    .filter((m) => m && m.name && m.link)
    .map((m) => ({
      id: m.id || `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: String(m.name).trim(),
      link: String(m.link).trim(),
      schedule: Array.isArray(m.schedule)
        ? m.schedule
            .filter((s) => Array.isArray(s.days) && s.days.length > 0 && s.start && s.end)
            .map((s) => ({ days: s.days, start: s.start, end: s.end }))
        : [],
    }));
}

async function listTeamMeetings() {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8');
    return normalize(JSON.parse(raw));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new Error(`No se pudo leer data/team-meetings.json: ${error.message}`);
  }
}

async function saveTeamMeetings(meetings) {
  const normalized = normalize(meetings);
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(normalized, null, 2) + '\n', 'utf-8');
  return normalized;
}

module.exports = { listTeamMeetings, saveTeamMeetings };
