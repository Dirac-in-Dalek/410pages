import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import { Mark, mergeAttributes, type Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Slice } from '@tiptap/pm/model';
import type { TextFormatRange } from '../../types';
import { documentToText, textToDocument } from '../logic/richTextDocument';
import { MIN_TEXT_SIZE_OFFSET, MAX_TEXT_SIZE_OFFSET } from '../logic/textFormats';
import { TextFormatToolbar, type TextSelection } from './TextFormatToolbar';

const Highlight = Mark.create({
  name: 'highlight', parseHTML: () => [{ tag: 'mark' }],
  renderHTML: ({ HTMLAttributes }) => ['mark', mergeAttributes(HTMLAttributes, { style: 'background-color:var(--highlight-bg);color:inherit' }), 0],
});
const RelativeSize = Mark.create({
  name: 'relativeSize',
  addAttributes: () => ({ offset: {
    default: 0,
    parseHTML: element => Math.max(MIN_TEXT_SIZE_OFFSET, Math.min(MAX_TEXT_SIZE_OFFSET, parseInt(element.getAttribute('data-size-offset') ?? '0', 10) || 0)),
    renderHTML: attributes => ({ 'data-size-offset': attributes.offset, style: `font-size:calc(1em + ${attributes.offset}pt)` }),
  } }),
  parseHTML: () => [{ tag: 'span[data-size-offset]' }], renderHTML: ({ HTMLAttributes }) => ['span', HTMLAttributes, 0],
});

// Map UTF-16 text offsets to ProseMirror positions, including empty paragraphs.
function positionsFor(editor: Editor) {
  const positions: number[] = [];
  let offset = 0;
  editor.state.doc.forEach((paragraph, base, index) => {
    if (index) offset++;
    positions[offset] = base + 1;
    paragraph.forEach((node, inner) => {
      const length = node.isText ? node.text!.length : node.type.name === 'hardBreak' ? 1 : 0;
      for (let i = 0; i <= length; i++) positions[offset + i] = base + 1 + inner + i;
      offset += length;
    });
  });
  return positions;
}

export function RichTextEditor({ text, formats = [], onChange, label, placeholder, className }: {
  text: string; formats?: TextFormatRange[]; onChange: (text: string, formats: TextFormatRange[]) => void;
  label: string; placeholder?: string; className?: string;
}) {
  const [selection, setSelection] = React.useState<TextSelection | null>(null);
  const changeRef = React.useRef(onChange);
  changeRef.current = onChange;
  const selectionRef = React.useRef<TextSelection | null>(null);
  selectionRef.current = selection;
  const captureSelection = (current: Editor) => {
    const { from, to } = current.state.selection;
    if (from === to || current.view.composing || current.view.dom.closest('[inert]')) { selectionRef.current = null; setSelection(null); return; }
    const positions = positionsFor(current);
    const start = positions.findIndex(position => position >= from);
    let end = positions.findIndex(position => position >= to);
    if (end < 0) end = positions.length - 1;
    if (start < 0 || start >= end || !documentToText(current.getJSON()).text.slice(start, end).trim()) { selectionRef.current = null; setSelection(null); return; }
    const first = current.view.coordsAtPos(from);
    const last = current.view.coordsAtPos(to);
    if (last.bottom <= 0 || first.top >= window.innerHeight) { selectionRef.current = null; setSelection(null); return; }
    const next = { start, end, rect: { top: first.top, bottom: last.bottom, left: Math.min(first.left, last.left), right: Math.max(first.right, last.right) } };
    selectionRef.current = next; setSelection(next);
  };
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, bulletList: false, orderedList: false, listItem: false, listKeymap: false, blockquote: false, code: false, codeBlock: false, horizontalRule: false, strike: false, link: false, trailingNode: false }), Highlight, RelativeSize],
    content: textToDocument(text, formats),
    editorProps: {
      attributes: { role: 'textbox', tabindex: '0', 'aria-label': label, 'aria-multiline': 'true', 'data-book-memo-editor': '', 'data-placeholder': placeholder ?? '', class: 'rich-text-surface' },
      // Pasting rich HTML must not import fixed sizes or unsupported structures.
      handlePaste: (view, event) => {
        const value = event.clipboardData?.getData('text/plain');
        if (value == null) return false;
        event.preventDefault();
        const doc = view.state.schema.nodeFromJSON(textToDocument(value));
        view.dispatch(view.state.tr.replaceSelection(new Slice(doc.content, 1, 1)).scrollIntoView());
        return true;
      },
    },
    onUpdate: ({ editor: current }) => {
      if (current.view.composing) return;
      const value = documentToText(current.getJSON()); changeRef.current(value.text, value.formats);
    },
    onSelectionUpdate: ({ editor: current }) => captureSelection(current),
  });
  React.useEffect(() => {
    if (!editor) return;
    const start = () => setSelection(null);
    const end = () => queueMicrotask(() => {
      if (editor.isDestroyed) return;
      const value = documentToText(editor.getJSON()); changeRef.current(value.text, value.formats);
    });
    editor.view.dom.addEventListener('compositionstart', start);
    editor.view.dom.addEventListener('compositionend', end);
    return () => { editor.view.dom.removeEventListener('compositionstart', start); editor.view.dom.removeEventListener('compositionend', end); };
  }, [editor]);
  React.useEffect(() => {
    if (!editor) return;
    const current = documentToText(editor.getJSON());
    if (current.text === text && JSON.stringify(current.formats) === JSON.stringify(formats)) return;
    const previousSelection = editor.state.selection;
    editor.commands.setContent(textToDocument(text, formats), { emitUpdate: false });
    const maximum = editor.state.doc.content.size;
    editor.commands.setTextSelection({ from: Math.min(previousSelection.from, maximum), to: Math.min(previousSelection.to, maximum) });
  }, [editor, text, formats]);
  React.useEffect(() => {
    const outside = (event: Event) => {
      const target = event.target as Element;
      if (!target.closest?.('[data-text-format-toolbar]') && !editor?.view.dom.contains(target)) setSelection(null);
    };
    const scroll = () => { if (selectionRef.current && editor && !editor.isDestroyed) captureSelection(editor); };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('scroll', scroll, true);
    const hidden = new MutationObserver(() => { if (editor?.view.dom.closest('[inert]')) setSelection(null); });
    const panel = editor?.view.dom.closest('[data-reading-memo-scroll]')?.parentElement;
    if (panel) hidden.observe(panel, { attributes: true, subtree: true, attributeFilter: ['inert'] });
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('scroll', scroll, true); hidden.disconnect(); };
  }, [editor]);
  const apply = (next: TextFormatRange[]) => {
    if (!editor || !selection) return;
    const positions = positionsFor(editor);
    const from = positions[selection.start];
    const to = positions[selection.end];
    const tr = editor.state.tr;
    for (const name of ['bold', 'italic', 'underline', 'highlight', 'relativeSize']) tr.removeMark(from, to, editor.schema.marks[name]);
    for (const range of next.filter(range => range.start < selection.end && range.end > selection.start)) {
      const start = positions[Math.max(range.start, selection.start)];
      const end = positions[Math.min(range.end, selection.end)];
      for (const flag of ['bold', 'italic', 'underline', 'highlight'] as const) if (range[flag]) tr.addMark(start, end, editor.schema.marks[flag].create());
      if (range.fontSizeOffset) tr.addMark(start, end, editor.schema.marks.relativeSize.create({ offset: range.fontSizeOffset }));
    }
    editor.view.dispatch(tr); editor.view.focus();
  };
  const current = editor ? documentToText(editor.getJSON()) : { text, formats };
  React.useEffect(() => { editor?.view.dom.setAttribute('data-empty', String(current.text.length === 0)); }, [editor, current.text]);
  return <div className={className}>
    <EditorContent editor={editor} />
    {selection && editor ? <TextFormatToolbar text={current.text} formats={current.formats} selection={selection} onChange={apply}
      portalTarget={editor.view.dom.closest('[role="dialog"]')}
      onClose={() => { setSelection(null); editor.view.focus(); }} /> : null}
  </div>;
}
