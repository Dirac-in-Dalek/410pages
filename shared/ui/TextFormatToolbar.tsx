import React from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Underline, Highlighter, Minus, Plus, X } from 'lucide-react';
import type { TextFormatRange } from '../../types';
import { changeTextFormat, selectionFormats, toggleTextFormat, MIN_TEXT_SIZE_OFFSET, MAX_TEXT_SIZE_OFFSET } from '../logic/textFormats';

export type TextSelection = { start: number; end: number; rect: { top: number; bottom: number; left: number; right: number } };

export function TextFormatToolbar({ text, formats, selection, onChange, onClose, status, portalTarget }: {
  text: string; formats: TextFormatRange[]; selection: TextSelection;
  onChange: (formats: TextFormatRange[]) => void; onClose: () => void; status?: string; portalTarget?: Element | null;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState({ left: 8, top: 8 });
  const selected = selectionFormats(text, formats, selection.start, selection.end);
  const offsets = selected.map(range => range.fontSizeOffset ?? 0);
  const offset = offsets.every(value => value === offsets[0]) ? offsets[0] ?? 0 : null;
  React.useLayoutEffect(() => {
    const place = () => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const viewport = window.visualViewport;
      const leftBound = viewport?.offsetLeft ?? 0;
      const topBound = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      setPosition({
        left: Math.max(leftBound + 8, Math.min((selection.rect.left + selection.rect.right - box.width) / 2, leftBound + width - box.width - 8)),
        top: Math.max(topBound + 8, Math.min(selection.rect.top - box.height - 10 >= topBound + 8 ? selection.rect.top - box.height - 10 : selection.rect.bottom + 10, topBound + height - box.height - 8)),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.visualViewport?.addEventListener('resize', place);
    return () => { window.removeEventListener('resize', place); window.visualViewport?.removeEventListener('resize', place); };
  }, [selection, status]);
  const flags = [
    { flag: 'bold', label: '굵게', Icon: Bold }, { flag: 'italic', label: '기울임', Icon: Italic },
    { flag: 'underline', label: '밑줄', Icon: Underline }, { flag: 'highlight', label: '하이라이트', Icon: Highlighter },
  ] as const;
  const resize = (delta: number) => onChange(changeTextFormat(text, formats, selection.start, selection.end, format => ({ ...format, fontSizeOffset: (format.fontSizeOffset ?? 0) + delta })));
  return createPortal(
    <div ref={ref} data-text-format-toolbar data-passage-note-trigger role="toolbar" aria-label="선택한 글자 서식"
      className="text-format-toolbar" style={{ left: position.left, top: position.top }}
      onMouseDown={event => event.preventDefault()} onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
        }
      }}>
      {flags.map(({ flag, label, Icon }) => <button key={flag} type="button" aria-label={label} title={label}
        aria-pressed={selected.length > 0 && selected.every(format => format[flag])}
        onClick={() => onChange(toggleTextFormat(text, formats, selection.start, selection.end, flag))}><Icon size={17} /></button>)}
      <span className="text-format-divider" aria-hidden="true" />
      <button type="button" aria-label="글자 크기 1pt 줄이기" title="중앙 설정보다 1pt 작게" disabled={offsets.every(value => value <= MIN_TEXT_SIZE_OFFSET)} onClick={() => resize(-1)}><Minus size={16} /></button>
      <button type="button" className="text-format-size" aria-label="글자 크기를 중앙 설정으로 되돌리기" title="중앙 설정 크기로 되돌리기"
        onClick={() => onChange(changeTextFormat(text, formats, selection.start, selection.end, format => ({ ...format, fontSizeOffset: 0 })))}>
        {offset === null ? '혼합' : offset === 0 ? '기본' : `${offset > 0 ? '+' : ''}${offset}pt`}
      </button>
      <button type="button" aria-label="글자 크기 1pt 키우기" title="중앙 설정보다 1pt 크게" disabled={offsets.every(value => value >= MAX_TEXT_SIZE_OFFSET)} onClick={() => resize(1)}><Plus size={16} /></button>
      <button type="button" data-text-format-close aria-label="서식 도구창 닫기" onClick={onClose}><X size={15} /></button>
      <span className={status?.startsWith('저장 실패') ? 'text-format-status' : 'sr-only'} role="status">{status}</span>
    </div>, portalTarget ?? document.body,
  );
}
