import { useState } from 'react';
import useAnchoredMenu from '../hooks/useAnchoredMenu';
import RichTextEditor from './RichTextEditor';
import RichTextView from './RichTextView';
import { tiptapToAdf, isEmptyDoc } from '../lib/adf';

function formatDate(iso) {
  return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function CommentsPanel({ issueKey, commentCount, onCountChanged }) {
  const { triggerRef, open, style, toggle, close } = useAnchoredMenu({ width: 420, estimatedHeight: 420 });
  const [comments, setComments] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [doc, setDoc] = useState(null);
  const [editorKey, setEditorKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  function toggleExpanded(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function uploadImage(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/issues/${issueKey}/attachments`, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return { src: `/api/attachments/${data.id}/content`, id: data.id };
  }

  async function openPanel() {
    const wasOpen = open;
    toggle();
    if (!wasOpen && !comments) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/issues/${issueKey}/comments`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setComments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleSend() {
    if (!doc || isEmptyDoc(doc)) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adf: tiptapToAdf(doc) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = [data, ...comments];
      setComments(updated);
      onCountChanged(updated.length);
      setDoc(null);
      setEditorKey((k) => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId) {
    setDeletingId(commentId);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueKey}/comments/${commentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const updated = comments.filter((c) => c.id !== commentId);
      setComments(updated);
      onCountChanged(updated.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        onClick={openPanel}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
      >
        <span>💬</span>
        {commentCount > 0 ? commentCount : ''}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div
            style={style}
            className="fixed z-20 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="shrink-0 border-b border-slate-100 px-3 py-2">
              <p className="text-xs font-semibold text-slate-500">Comentarios de {issueKey}</p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2">
              {loading && <p className="py-4 text-center text-xs text-slate-400">Cargando…</p>}
              {error && <p className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>}
              {comments?.map((c) => {
                const isLong = (c.body?.length || 0) > 320;
                const isExpanded = expanded.has(c.id);
                return (
                  <div key={c.id} className="group rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {c.authorAvatar && <img src={c.authorAvatar} alt="" className="h-5 w-5 rounded-full" />}
                        <span className="font-medium text-slate-700">{c.author}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">{formatDate(c.created)}</span>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                          title="Eliminar comentario"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                    <div className={`relative ${isLong && !isExpanded ? 'max-h-56 overflow-hidden' : ''}`}>
                      {c.bodyAdf ? (
                        <RichTextView adf={c.bodyAdf} />
                      ) : (
                        <p className="whitespace-pre-wrap text-slate-700">{c.body}</p>
                      )}
                      {isLong && !isExpanded && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-50" />
                      )}
                    </div>
                    {isLong && (
                      <button
                        onClick={() => toggleExpanded(c.id)}
                        className="mt-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {isExpanded ? 'Ver menos' : 'Ver más'}
                      </button>
                    )}
                  </div>
                );
              })}
              {comments?.length === 0 && !loading && (
                <p className="py-4 text-center text-xs text-slate-400">Sin comentarios todavía.</p>
              )}
            </div>

            <div className="shrink-0 space-y-2 border-t border-slate-100 p-2">
              <RichTextEditor
                key={editorKey}
                value={doc}
                onChange={setDoc}
                minHeight={70}
                maxHeight={160}
                placeholder="Escribe un comentario…"
                onImageUpload={uploadImage}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  Las imágenes se adjuntan al issue en Jira.
                </span>
                <button
                  onClick={handleSend}
                  disabled={sending || !doc || isEmptyDoc(doc)}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {sending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
