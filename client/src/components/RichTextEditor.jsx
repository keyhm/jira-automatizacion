import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { Image } from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extensions';

const COLORS = [
  { value: '#172b4d', label: 'Negro' },
  { value: '#0052cc', label: 'Azul' },
  { value: '#006644', label: 'Verde' },
  { value: '#ff991f', label: 'Naranja' },
  { value: '#bf2600', label: 'Rojo' },
  { value: '#403294', label: 'Morado' },
  { value: '#6b778c', label: 'Gris' },
];

function ToolbarButton({ onClick, active, title, children, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded text-sm transition ${
        active ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function ColorMenu({ editor }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <ToolbarButton onClick={() => setOpen((o) => !o)} title="Color del texto" active={open}>
        <span className="font-semibold underline decoration-2" style={{ textDecorationColor: editor.getAttributes('textStyle').color || '#172b4d' }}>
          A
        </span>
      </ToolbarButton>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-30 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
            <div className="grid grid-cols-4 gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => {
                    editor.chain().focus().setColor(c.value).run();
                    setOpen(false);
                  }}
                  className="h-6 w-6 rounded border border-slate-200 transition hover:scale-110"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().unsetColor().run();
                setOpen(false);
              }}
              className="mt-2 w-full rounded border border-slate-200 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Quitar el color
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribe aquí…',
  minHeight = 120,
  onImageUpload,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const editor = useEditor({
    extensions: [
      // StarterKit v3 ya trae Link y Underline, por eso no se agregan aparte.
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false },
      }),
      TextStyle,
      Color,
      Image.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => onChange(ed.getJSON()),
    editorProps: {
      attributes: {
        class: 'prose-sm focus:outline-none px-3 py-2',
        style: `min-height:${minHeight}px`,
      },
    },
  });

  useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) return null;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onImageUpload) return;

    setUploading(true);
    setUploadError(null);
    try {
      const { src, id } = await onImageUpload(file);
      editor.chain().focus().setImage({ src, title: id, alt: file.name }).run();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function addLink() {
    const url = window.prompt('URL del enlace:', editor.getAttributes('link').href || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div className="rich-text overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 py-1.5">
        <select
          value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: Number(v[1]) }).run();
          }}
          className="mr-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-600 outline-none"
        >
          <option value="p">Normal</option>
          <option value="h1">Título 1</option>
          <option value="h2">Título 2</option>
          <option value="h3">Título 3</option>
        </select>

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrita">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Cursiva">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Subrayado">
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado">
          <span className="line-through">S</span>
        </ToolbarButton>

        <ColorMenu editor={editor} />

        <span className="mx-1 h-4 w-px bg-slate-200" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista con viñetas">
          ☰
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
          ⒈
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código">
          {'</>'}
        </ToolbarButton>
        <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Enlace">
          🔗
        </ToolbarButton>

        {onImageUpload && (
          <>
            <span className="mx-1 h-4 w-px bg-slate-200" />
            <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Insertar imagen" disabled={uploading}>
              {uploading ? '…' : '🖼'}
            </ToolbarButton>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </>
        )}

        <span className="ml-auto flex items-center gap-1">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Deshacer" disabled={!editor.can().undo()}>
            ↺
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Rehacer" disabled={!editor.can().redo()}>
            ↻
          </ToolbarButton>
        </span>
      </div>

      {uploadError && <p className="bg-red-50 px-3 py-1.5 text-xs text-red-600">{uploadError}</p>}

      <EditorContent editor={editor} data-placeholder={placeholder} />
    </div>
  );
}
