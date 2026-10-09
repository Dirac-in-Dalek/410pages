import React from 'react';
import type { TextFormatRange } from '../../types';
import { normalizeTextFormats, textFormatSegments, toggleTextFormat } from '../logic/textFormats';
import { TextFormatToolbar, type TextSelection } from './TextFormatToolbar';

// One selection listener for the entire archive, including large libraries.
const roots = new WeakMap<Element, { capture: () => void; close: () => void }>();
const EMPTY_FORMATS: TextFormatRange[] = [];
let activeRoot: Element | null = null;
let registrations = 0;
const selectionChanged = () => {
  const anchor = window.getSelection()?.anchorNode;
  const element = anchor?.nodeType === Node.ELEMENT_NODE ? anchor as Element : anchor?.parentElement;
  const next = element?.closest('[data-format-text]') ?? null;
  if (activeRoot !== next && activeRoot) roots.get(activeRoot)?.close();
  activeRoot = next;
  if (next) roots.get(next)?.capture();
};
const dismiss = (event: Event) => {
  if (event.type === 'scroll') { if (activeRoot) roots.get(activeRoot)?.capture(); return; }
  const target = event.target as Element | null;
  if (target?.closest?.('[data-text-format-toolbar]')) return;
  if (event.type === 'keydown' && (event as KeyboardEvent).key !== 'Escape') return;
  if (event.type !== 'pointerdown' || !activeRoot?.contains(target)) {
    if (activeRoot) roots.get(activeRoot)?.close();
    activeRoot = null;
  }
};

export function formatStyle(format: TextFormatRange): React.CSSProperties {
  return {
    fontWeight: format.bold ? 700 : undefined, fontStyle: format.italic ? 'italic' : undefined,
    textDecoration: format.underline ? 'underline' : undefined, textUnderlineOffset: format.underline ? '0.15em' : undefined,
    fontSize: format.fontSizeOffset ? `calc(1em + ${format.fontSizeOffset}pt)` : undefined,
    backgroundColor: format.highlight ? 'var(--highlight-bg)' : undefined, color: 'inherit',
  };
}

function selectionIn(root: HTMLElement, text: string): TextSelection | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer) || !selection.toString().trim()) return null;
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const end = start + range.toString().length;
  if (end > text.length) return null;
  const rect = typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : root.getBoundingClientRect();
  if (rect.height > 0 && (rect.bottom <= 0 || rect.top >= window.innerHeight)) return null;
  return { start, end, rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } };
}

export function FormattedText({ text, formats = EMPTY_FORMATS, onSave, onSelect, className, testId, visibleEnd, bookCitation }: {
  text: string; formats?: TextFormatRange[]; onSave?: (formats: TextFormatRange[]) => unknown | Promise<unknown>;
  onSelect?: () => void; className?: string; testId?: string; visibleEnd?: number | null; bookCitation?: boolean;
}) {
  const root = React.useRef<HTMLSpanElement>(null);
  const [local, setLocal] = React.useState(() => normalizeTextFormats(formats, text.length));
  const localRef = React.useRef(local);
  const confirmed = React.useRef(local);
  const chain = React.useRef(Promise.resolve());
  const pending = React.useRef(0);
  const revision = React.useRef(0);
  const [selection, setSelection] = React.useState<TextSelection | null>(null);
  const [status, setStatus] = React.useState('');
  const textRef = React.useRef(text);
  const saveRef = React.useRef(onSave);
  saveRef.current = onSave;
  const restoreSelection = React.useEffectEvent(() => {
    if (!selection || !root.current || textRef.current !== text) return;
    const walker = document.createTreeWalker(root.current, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let cursor = 0; let started = false;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const length = node.textContent?.length ?? 0;
      if (!started && selection.start <= cursor + length) { range.setStart(node, selection.start - cursor); started = true; }
      if (started && selection.end <= cursor + length) {
        range.setEnd(node, selection.end - cursor);
        const native = window.getSelection(); native?.removeAllRanges(); native?.addRange(range);
        break;
      }
      cursor += length;
    }
  });
  React.useLayoutEffect(() => { restoreSelection(); }, [local]);
  React.useEffect(() => {
    if (textRef.current !== text) {
      textRef.current = text; revision.current++; setSelection(null); pending.current = 0;
      setStatus(''); localRef.current = normalizeTextFormats(formats, text.length);
      confirmed.current = localRef.current; setLocal(localRef.current);
    } else if (!pending.current) {
      confirmed.current = normalizeTextFormats(formats, text.length); localRef.current = confirmed.current; setLocal(confirmed.current);
    }
  }, [text, formats]);
  const invalidatePendingSaves = React.useCallback(() => { revision.current++; }, []);
  React.useEffect(() => {
    const element = root.current;
    if (!element) return;
    const capture = () => {
      const next = saveRef.current && !element.closest('[inert]') ? selectionIn(element, textRef.current) : null;
      setSelection(next);
    };
    roots.set(element, { capture, close: () => setSelection(null) });
    if (registrations++ === 0) {
      document.addEventListener('selectionchange', selectionChanged);
      document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', dismiss);
      window.addEventListener('scroll', dismiss, true);
    }
    return () => {
      roots.delete(element);
      if (activeRoot === element) activeRoot = null;
      if (--registrations === 0) {
        document.removeEventListener('selectionchange', selectionChanged);
        document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', dismiss);
        window.removeEventListener('scroll', dismiss, true);
      }
      invalidatePendingSaves();
    };
  }, [invalidatePendingSaves]);
  const capture = () => {
    if (!root.current) return;
    const next = selectionIn(root.current, text);
    if (activeRoot && activeRoot !== root.current) roots.get(activeRoot)?.close();
    activeRoot = root.current;
    setSelection(onSave ? next : null);
    if (next) onSelect?.();
  };
  const apply = (next: TextFormatRange[]) => {
    const generation = revision.current;
    const save = saveRef.current;
    localRef.current = next; setLocal(next); pending.current++; setStatus('저장 중…');
    chain.current = chain.current.then(async () => {
      if (generation !== revision.current) return;
      let ok = false;
      try { ok = await save?.(next) !== false; } catch { /* Keep the last saved formatting. */ }
      if (generation !== revision.current) return;
      pending.current--;
      if (ok) confirmed.current = next;
      if (!pending.current) {
        if (!ok) { localRef.current = confirmed.current; setLocal(confirmed.current); }
        setStatus(ok ? '' : '저장 실패 · 다시 시도하세요');
      }
    });
  };
  const end = visibleEnd == null ? text.length : Math.min(visibleEnd, text.length);
  return <>
    <span ref={root} data-format-text data-book-citation-text={bookCitation || undefined} data-testid={testId} className={className} onMouseUp={capture} onKeyUp={capture} onTouchEnd={capture}
      tabIndex={onSave ? 0 : undefined} aria-keyshortcuts={onSave ? 'Shift+F10' : undefined}
      aria-description={onSave ? '텍스트를 선택해 서식을 바꾸세요. Shift+F10으로 전체 텍스트 서식 도구창을 열 수 있습니다.' : undefined}
      onKeyDown={event => {
        if (!onSave) return;
        if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
          event.preventDefault(); const range = document.createRange(); range.selectNodeContents(root.current!);
          window.getSelection()?.removeAllRanges(); window.getSelection()?.addRange(range); capture();
          requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-text-format-toolbar] button')?.focus());
        } else if ((event.ctrlKey || event.metaKey) && selection) {
          const flag = ({ b: 'bold', i: 'italic', u: 'underline' } as const)[event.key.toLowerCase()];
          if (flag) { event.preventDefault(); apply(toggleTextFormat(text, localRef.current, selection.start, selection.end, flag)); }
        }
      }}
      onClick={event => { if (selectionIn(root.current!, text)) { event.stopPropagation(); onSelect?.(); } }}
      onDoubleClick={event => { if (selectionIn(root.current!, text)) { event.stopPropagation(); capture(); } }}>
      {textFormatSegments(text, local).filter(segment => segment.start < end).map(segment => {
        const value = text.slice(segment.start, Math.min(segment.end, end));
        return segment.highlight ? <mark key={segment.start} style={formatStyle(segment)}>{value}</mark> : <span key={segment.start} style={formatStyle(segment)}>{value}</span>;
      })}
    </span>
    {selection && onSave ? <TextFormatToolbar text={text} formats={local} selection={selection} onChange={apply}
      portalTarget={root.current?.closest('[role="dialog"]')} onClose={() => {
      if (document.activeElement?.closest('[data-text-format-toolbar]')) root.current?.focus({ preventScroll: true });
      activeRoot = null;
      setSelection(null);
    }} status={status} /> : null}
  </>;
}
