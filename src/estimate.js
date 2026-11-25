const { getClient } = require('./jiraClient');

// Formato de tiempo de Jira: 4h, 1d, 1d 4h, 30m, 1w 2d (1d = 8h).
const ESTIMATE_FORMAT = /^(\d+[wdhm]\s*)+$/i;

function throwApiError(error, action) {
  if (error.response && [401, 403].includes(error.response.status)) {
    throw new Error(
      `${action} falló (${error.response.status}). Revisa el scope write:jira-work y que "Time tracking" esté disponible en la pantalla de edición del issue.`
    );
  }
  const details = error.response?.data ? ` ${JSON.stringify(error.response.data)}` : '';
  throw new Error(`${action} falló.${details}`);
}

/**
 * Fija la estimación original (en formato Jira: "4h", "1d 4h", "30m").
 * Regla desde el sprint 112: la estimación sale del plan de trabajo de QA y
 * los cambios se concilian (comentario con el motivo). Aquí solo se aplica.
 * Devuelve los valores resultantes (Jira recalcula el tiempo restante).
 */
async function updateOriginalEstimate(issueKey, originalEstimate, existingClient) {
  const value = (originalEstimate || '').trim();
  if (!ESTIMATE_FORMAT.test(value)) {
    throw new Error('Formato de estimación inválido. Usa por ejemplo 4h, 1d 4h o 30m (1d = 8h).');
  }

  const client = existingClient || (await getClient());
  try {
    await client.put(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
      fields: { timetracking: { originalEstimate: value } },
    });
  } catch (error) {
    throwApiError(error, `El cambio de estimación de ${issueKey}`);
  }

  try {
    const { data } = await client.get(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
      params: { fields: 'timeoriginalestimate,timeestimate,timespent' },
    });
    return {
      originalSeconds: data.fields.timeoriginalestimate || 0,
      remainingSeconds: data.fields.timeestimate || 0,
      secondsLogged: data.fields.timespent || 0,
    };
  } catch (error) {
    throwApiError(error, `La lectura de la estimación de ${issueKey}`);
  }
}

module.exports = { updateOriginalEstimate, ESTIMATE_FORMAT };
