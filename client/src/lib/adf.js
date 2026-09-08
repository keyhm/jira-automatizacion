/**
 * Conversión entre el JSON de TipTap (ProseMirror) y el ADF de Jira.
 *
 * Los dos formatos son parecidos (ambos son árboles de nodos con marcas), pero
 * los nombres difieren: TipTap usa "bold"/"italic"/"textStyle", Jira usa
 * "strong"/"em"/"textColor". Estas funciones traducen en ambas direcciones.
 */

const MARK_TO_ADF = {
  bold: () => ({ type: 'strong' }),
  italic: () => ({ type: 'em' }),
  underline: () => ({ type: 'underline' }),
  strike: () => ({ type: 'strike' }),
  code: () => ({ type: 'code' }),
  link: (mark) => ({ type: 'link', attrs: { href: mark.attrs?.href } }),
  textStyle: (mark) =>
    mark.attrs?.color ? { type: 'textColor', attrs: { color: mark.attrs.color } } : null,
};

const MARK_FROM_ADF = {
  strong: () => ({ type: 'bold' }),
  em: () => ({ type: 'italic' }),
  underline: () => ({ type: 'underline' }),
  strike: () => ({ type: 'strike' }),
  code: () => ({ type: 'code' }),
  link: (mark) => ({ type: 'link', attrs: { href: mark.attrs?.href } }),
  textColor: (mark) => ({ type: 'textStyle', attrs: { color: mark.attrs?.color } }),
};

function marksToAdf(marks = []) {
  return marks.map((m) => MARK_TO_ADF[m.type]?.(m)).filter(Boolean);
}

function marksFromAdf(marks = []) {
  return marks.map((m) => MARK_FROM_ADF[m.type]?.(m)).filter(Boolean);
}

function nodeToAdf(node) {
  switch (node.type) {
    case 'text': {
      const adf = { type: 'text', text: node.text };
      const marks = marksToAdf(node.marks);
      if (marks.length) adf.marks = marks;
      return adf;
    }
    case 'paragraph': {
      const content = (node.content || []).map(nodeToAdf).filter(Boolean);
      return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
    }
    case 'heading':
      return {
        type: 'heading',
        attrs: { level: node.attrs?.level || 1 },
        content: (node.content || []).map(nodeToAdf).filter(Boolean),
      };
    case 'bulletList':
      return { type: 'bulletList', content: (node.content || []).map(nodeToAdf).filter(Boolean) };
    case 'orderedList':
      return {
        type: 'orderedList',
        attrs: { order: node.attrs?.start || 1 },
        content: (node.content || []).map(nodeToAdf).filter(Boolean),
      };
    case 'listItem':
      return { type: 'listItem', content: (node.content || []).map(nodeToAdf).filter(Boolean) };
    case 'codeBlock':
      return { type: 'codeBlock', content: (node.content || []).map(nodeToAdf).filter(Boolean) };
    case 'blockquote':
      return { type: 'blockquote', content: (node.content || []).map(nodeToAdf).filter(Boolean) };
    case 'hardBreak':
      return { type: 'hardBreak' };
    case 'horizontalRule':
      return { type: 'rule' };
    case 'image': {
      /**
       * Jira NO permite incrustar imágenes en el ADF vía la API pública: el nodo
       * "media" exige un UUID de Media Services que la API REST no expone (el id
       * numérico del adjunto es rechazado con ATTACHMENT_VALIDATION_ERROR).
       * Por eso la imagen ya se subió como adjunto del issue y aquí solo queda
       * un enlace hacia ella, que sí se ve y funciona dentro de Jira.
       */
      const id = node.attrs?.title;
      const name = node.attrs?.alt || 'imagen adjunta';
      if (!id) return null;

      const domain = import.meta.env.VITE_JIRA_DOMAIN;
      const href = domain
        ? `https://${domain}/rest/api/3/attachment/content/${id}`
        : undefined;

      return {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: `📎 ${name}`,
            ...(href ? { marks: [{ type: 'link', attrs: { href } }] } : {}),
          },
        ],
      };
    }
    default:
      return null;
  }
}

function nodeFromAdf(node, mediaUrls = {}) {
  switch (node.type) {
    case 'text': {
      const tip = { type: 'text', text: node.text };
      const marks = marksFromAdf(node.marks);
      if (marks.length) tip.marks = marks;
      return tip;
    }
    case 'paragraph':
      return { type: 'paragraph', content: (node.content || []).map((n) => nodeFromAdf(n, mediaUrls)).filter(Boolean) };
    case 'heading':
      return {
        type: 'heading',
        attrs: { level: node.attrs?.level || 1 },
        content: (node.content || []).map((n) => nodeFromAdf(n, mediaUrls)).filter(Boolean),
      };
    case 'bulletList':
      return { type: 'bulletList', content: (node.content || []).map((n) => nodeFromAdf(n, mediaUrls)).filter(Boolean) };
    case 'orderedList':
      return {
        type: 'orderedList',
        attrs: { start: node.attrs?.order || 1 },
        content: (node.content || []).map((n) => nodeFromAdf(n, mediaUrls)).filter(Boolean),
      };
    case 'listItem':
      return { type: 'listItem', content: (node.content || []).map((n) => nodeFromAdf(n, mediaUrls)).filter(Boolean) };
    case 'codeBlock':
      return { type: 'codeBlock', content: (node.content || []).map((n) => nodeFromAdf(n, mediaUrls)).filter(Boolean) };
    case 'blockquote':
      return { type: 'blockquote', content: (node.content || []).map((n) => nodeFromAdf(n, mediaUrls)).filter(Boolean) };
    case 'hardBreak':
      return { type: 'hardBreak' };
    case 'rule':
      return { type: 'horizontalRule' };
    case 'mediaSingle':
    case 'mediaGroup': {
      const media = (node.content || []).find((n) => n.type === 'media');
      const id = media?.attrs?.id;
      return { type: 'image', attrs: { src: mediaUrls[id] || '', title: id, alt: media?.attrs?.alt || '' } };
    }
    default:
      return null;
  }
}

export function tiptapToAdf(doc) {
  return {
    type: 'doc',
    version: 1,
    content: (doc?.content || []).map(nodeToAdf).filter(Boolean),
  };
}

export function adfToTiptap(adf, mediaUrls = {}) {
  return {
    type: 'doc',
    content: (adf?.content || []).map((n) => nodeFromAdf(n, mediaUrls)).filter(Boolean),
  };
}

export function isEmptyDoc(doc) {
  const content = doc?.content || [];
  if (content.length === 0) return true;
  return content.every(
    (node) => node.type === 'paragraph' && (!node.content || node.content.length === 0)
  );
}
