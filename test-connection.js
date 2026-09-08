const { getClient } = require('./src/jiraClient');
require('dotenv').config();

const projectKey = process.env.JIRA_PROJECT_KEY;

if (!projectKey) {
  throw new Error('Falta JIRA_PROJECT_KEY en el archivo .env.');
}

(async () => {
  try {
    const client = await getClient();
    const { data } = await client.get(
      `/rest/api/3/project/${encodeURIComponent(projectKey)}`
    );

    console.log('✅ Conexión exitosa');
    console.log(`Proyecto accesible: ${data.key} - ${data.name}`);
  } catch (err) {
    console.error('❌ Error de conexión');
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
})();
