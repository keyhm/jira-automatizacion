const axios = require('axios');
require('dotenv').config();

const { JIRA_DOMAIN, JIRA_API_TOKEN } = process.env;

if (!JIRA_DOMAIN || !JIRA_API_TOKEN) {
  throw new Error(
    'Faltan variables de entorno. Revisa tu archivo .env (JIRA_DOMAIN, JIRA_API_TOKEN).'
  );
}

const jiraDomain = new URL(
  JIRA_DOMAIN.match(/^https?:\/\//i) ? JIRA_DOMAIN : `https://${JIRA_DOMAIN}`
).hostname;

let cachedCloudId = null;

/**
 * Los tokens con scopes NO se autentican contra tu-dominio.atlassian.net
 * directamente: se autentican contra api.atlassian.com usando el Cloud ID
 * de tu sitio. Esta función lo obtiene una sola vez y lo cachea en memoria.
 */
async function getCloudId() {
  if (cachedCloudId) return cachedCloudId;

  const { data } = await axios.get(`https://${jiraDomain}/_edge/tenant_info`);
  if (!data.cloudId) {
    throw new Error('Jira no devolvió un cloudId. Revisa que JIRA_DOMAIN sea el host de tu sitio.');
  }
  cachedCloudId = data.cloudId;
  return cachedCloudId;
}

/**
 * Devuelve un cliente axios ya configurado con la URL base correcta
 * y el header de autenticación Bearer.
 */
async function getClient() {
  const cloudId = await getCloudId();

  return axios.create({
    baseURL: `https://api.atlassian.com/ex/jira/${cloudId}`,
    headers: {
      Authorization: `Bearer ${JIRA_API_TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
}

module.exports = { getClient, getCloudId };
