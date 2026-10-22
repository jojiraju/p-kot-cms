import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, RemoveFormatting, Underline as UnderlineIcon } from 'lucide-react';

const escapeHtml = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Plain text saved before the editor existed becomes paragraphs; real HTML passes through. */
export const toHtml = (value) => {
  if (!value) return '';
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  return value.split(/\n+/).map((line) => `<p>${escapeHtml(line)}</p>`).join('');
};

/** Features are stored as a list of HTML snippets; the editor shows them as bullets. */
export const featuresToHtml = (features) => {
  const list = Array.isArray(features) ? features : String(features || '').split('\n');
  const items = list.map((f) => String(f).trim()).filter(Boolean);
  const html = (f) => (/<[a-z][\s\S]*>/i.test(f) ? f : escapeHtml(f));
  return items.length ? `<ul>${items.map((f) => `<li>${html(f)}</li>`).join('')}</ul>` : '';
};

// <li><p>text</p></li> -> text, so a feature is just its inline content
const unwrap = (html) => html.replace(/^<p>([\s\S]*)<\/p>$/, (m, inner) => (inner.includes('<p>') ? m : inner)).trim();

/** Turns the editor's HTML back into one HTML snippet per bullet (or paragraph). */
export const featuresFromHtml = (html) => {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = [];
  doc.body.childNodes.forEach((node) => {
    if (/^(UL|OL)$/.test(node.nodeName)) node.querySelectorAll(':scope > li').forEach((li) => out.push(unwrap(li.innerHTML)));
    else if (node.nodeType === 1) out.push(node.innerHTML.trim());
    else if (node.textContent.trim()) out.push(node.textContent.trim());
  });
  return out.filter((t) => t && t !== '<br>');
};

function Btn({ active, onClick, label, children }) {
  return (
    <button type="button" className={`rte-btn ${active ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={label} aria-label={label}>
      {children}
    </button>
  );
}

/** Tiptap editor styled like the other inputs. */
export default function RichTextEditor({ value, onChange, placeholder, minHeight = 120 }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false,
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: toHtml(value),
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });

  if (!editor) return null;
  const run = (cmd) => () => cmd(editor.chain().focus()).run();

  return (
    <div className="rte">
      <div className="rte-bar">
          <Btn label="Bold" active={editor.isActive('bold')} onClick={run((c) => c.toggleBold())}><Bold size={15} /></Btn>
          <Btn label="Italic" active={editor.isActive('italic')} onClick={run((c) => c.toggleItalic())}><Italic size={15} /></Btn>
          <Btn label="Underline" active={editor.isActive('underline')} onClick={run((c) => c.toggleUnderline())}><UnderlineIcon size={15} /></Btn>
          <span className="rte-sep" />
          <Btn label="Bullet list" active={editor.isActive('bulletList')} onClick={run((c) => c.toggleBulletList())}><List size={15} /></Btn>
          <Btn label="Numbered list" active={editor.isActive('orderedList')} onClick={run((c) => c.toggleOrderedList())}><ListOrdered size={15} /></Btn>
          <span className="rte-sep" />
          <Btn label="Clear formatting" onClick={run((c) => c.unsetAllMarks().clearNodes())}><RemoveFormatting size={15} /></Btn>
      </div>
      <EditorContent editor={editor} className="rte-content" style={{ '--rte-min': `${minHeight}px` }} />
    </div>
  );
}
