/**
 * Render de solo lectura del ADF de Jira. Se hace a mano (en vez de montar un
 * editor por cada comentario) porque en el Tablero puede haber decenas visibles
 * a la vez y montar un TipTap por cada uno sería innecesariamente pesado.
 */

const MARK_WRAPPERS = {
  strong: (child, i) => <strong key={i}>{child}</strong>,
  em: (child, i) => <em key={i}>{child}</em>,
  underline: (child, i) => <u key={i}>{child}</u>,
  strike: (child, i) => <s key={i}>{child}</s>,
  code: (child, i) => <code key={i}>{child}</code>,
};

function renderText(node, key) {
  let el = node.text;

  for (const mark of node.marks || []) {
    if (mark.type === 'textColor') {
      el = <span key={key} style={{ color: mark.attrs?.color }}>{el}</span>;
    } else if (mark.type === 'link') {
      el = (
        <a key={key} href={mark.attrs?.href} target="_blank" rel="noreferrer">
          {el}
        </a>
      );
    } else if (MARK_WRAPPERS[mark.type]) {
      el = MARK_WRAPPERS[mark.type](el, key);
    }
  }

  return <span key={key}>{el}</span>;
}

function renderNode(node, key) {
  const children = (node.content || []).map((child, i) => renderNode(child, `${key}-${i}`));

  switch (node.type) {
    case 'text':
      return renderText(node, key);
    case 'paragraph':
      return <p key={key}>{children}</p>;
    case 'heading': {
      const Tag = `h${Math.min(node.attrs?.level || 1, 3)}`;
      return <Tag key={key}>{children}</Tag>;
    }
    case 'bulletList':
      return <ul key={key}>{children}</ul>;
    case 'orderedList':
      return <ol key={key}>{children}</ol>;
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'codeBlock':
      return <pre key={key}><code>{children}</code></pre>;
    case 'blockquote':
      return <blockquote key={key}>{children}</blockquote>;
    case 'hardBreak':
      return <br key={key} />;
    case 'rule':
      return <hr key={key} />;
    case 'mediaSingle':
    case 'mediaGroup': {
      const media = (node.content || []).find((n) => n.type === 'media');
      if (!media?.attrs?.id) return null;
      return (
        <img
          key={key}
          src={`/api/attachments/${media.attrs.id}/content`}
          alt={media.attrs.alt || 'Imagen adjunta'}
        />
      );
    }
    default:
      return children.length ? <div key={key}>{children}</div> : null;
  }
}

export default function RichTextView({ adf, className = '' }) {
  if (!adf?.content?.length) return null;

  return (
    <div className={`rich-text-view ${className}`}>
      {adf.content.map((node, i) => renderNode(node, `n${i}`))}
    </div>
  );
}
