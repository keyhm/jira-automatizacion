const { getClient } = require('./jiraClient');

function throwApiError(error, action) {
  if (error.response && [401, 403].includes(error.response.status)) {
    throw new Error(
      `${action} falló (${error.response.status}). Revisa los scopes read:jira-work / write:jira-work.`
    );
  }
  const details = error.response?.data ? ` ${JSON.stringify(error.response.data)}` : '';
  throw new Error(`${action} falló.${details}`);
}

function textToAdf(text) {
  return {
    type: 'doc',
    version: 1,
    content: text.split('\n').map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  };
}

function adfToText(adf) {
  if (!adf?.content) return '';
  return adf.content
    .map((node) => (node.content || []).map((n) => n.text || '').join(''))
    .join('\n')
    .trim();
}

function normalizeComment(c) {
  return {
    id: c.id,
    author: c.author?.displayName || 'Desconocido',
    authorAvatar: c.author?.avatarUrls?.['24x24'],
    body: adfToText(c.body),
    bodyAdf: typeof c.body === 'object' ? c.body : undefined,
    created: c.created,
  };
}

async function listComments(issueKey) {
  const client = await getClient();
  try {
    const { data } = await client.get(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
      params: { orderBy: '-created' },
    });
    return data.comments.map(normalizeComment);
  } catch (error) {
    throwApiError(error, `La consulta de comentarios de ${issueKey}`);
  }
}

/**
 * Acepta texto plano (se convierte a ADF) o un documento ADF ya armado por el
 * editor enriquecido del frontend.
 */
async function addComment(issueKey, { text, adf }) {
  const client = await getClient();
  const body = adf || textToAdf(text);

  try {
    const { data } = await client.post(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
      body,
    });
    return normalizeComment(data);
  } catch (error) {
    throwApiError(error, `El comentario en ${issueKey}`);
  }
}

async function deleteComment(issueKey, commentId) {
  const client = await getClient();
  try {
    await client.delete(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment/${encodeURIComponent(commentId)}`);
  } catch (error) {
    throwApiError(error, `La eliminación del comentario ${commentId} en ${issueKey}`);
  }
}

module.exports = { listComments, addComment, deleteComment, textToAdf };
