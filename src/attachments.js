const FormData = require('form-data');
const { getClient } = require('./jiraClient');

function throwApiError(error, action) {
  if (error.response && [401, 403].includes(error.response.status)) {
    throw new Error(
      `${action} falló (${error.response.status}). Revisa el scope write:jira-work (adjuntar archivos usa el mismo permiso de escritura del issue).`
    );
  }
  const details = error.response?.data ? ` ${JSON.stringify(error.response.data)}` : '';
  throw new Error(`${action} falló.${details}`);
}

/**
 * Sube un archivo como adjunto del issue. Jira exige el header
 * X-Atlassian-Token para permitir subidas desde clientes externos.
 */
async function uploadAttachment(issueKey, { buffer, filename, mimetype }) {
  const client = await getClient();
  const form = new FormData();
  form.append('file', buffer, { filename, contentType: mimetype });

  try {
    const { data } = await client.post(
      `/rest/api/3/issue/${encodeURIComponent(issueKey)}/attachments`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'X-Atlassian-Token': 'no-check',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    const attachment = Array.isArray(data) ? data[0] : data;
    return {
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size,
    };
  } catch (error) {
    throwApiError(error, `La subida del adjunto a ${issueKey}`);
  }
}

/**
 * El navegador no puede pedir el archivo directamente a Jira porque la URL
 * requiere el token; por eso el servidor lo descarga y lo reenvía.
 */
async function getAttachmentContent(attachmentId) {
  const client = await getClient();
  try {
    const { data, headers } = await client.get(
      `/rest/api/3/attachment/content/${encodeURIComponent(attachmentId)}`,
      { responseType: 'arraybuffer' }
    );
    return { buffer: Buffer.from(data), contentType: headers['content-type'] || 'application/octet-stream' };
  } catch (error) {
    throwApiError(error, `La descarga del adjunto ${attachmentId}`);
  }
}

module.exports = { uploadAttachment, getAttachmentContent };
