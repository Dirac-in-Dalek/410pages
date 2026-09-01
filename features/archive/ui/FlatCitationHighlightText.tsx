import React from 'react';
import type { Citation, Highlight } from '../../../types';

type FlatCitationHighlightTextProps = {
  citation: Citation;
  disabled?: boolean;
  onUpdate: (id: string, data: Partial<Citation>) => unknown | Promise<unknown>;
  onHighlight: () => void;
};

export const FlatCitationHighlightText: React.FC<FlatCitationHighlightTextProps> = ({
  citation,
  disabled = false,
  onUpdate,
  onHighlight,
}) => {
  const rootRef = React.useRef<HTMLSpanElement>(null);
  const [highlights, setHighlights] = React.useState<Highlight[]>(citation.highlights || []);
  const [saving, setSaving] = React.useState(false);
  const highlightsRef = React.useRef(highlights);
  highlightsRef.current = highlights;
  const savingRef = React.useRef(false);

  React.useEffect(() => setHighlights(citation.highlights || []), [citation.highlights]);

  const updateHighlights = async (next: Highlight[]) => {
    if (disabled || savingRef.current) return false;
    const previous = highlightsRef.current;
    savingRef.current = true;
    setSaving(true);
    setHighlights(next);
    try {
      const result = await Promise.resolve(onUpdate(citation.id, { highlights: next }));
      if (result === false) throw new Error('Highlight save failed');
      return true;
    } catch {
      setHighlights(previous);
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleSelection = (event: React.MouseEvent<HTMLSpanElement>) => {
    if (event.detail > 1) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !rootRef.current) return;
    const range = selection.getRangeAt(0);
    if (!rootRef.current.contains(range.commonAncestorContainer)) return;
    const selectedText = selection.toString();
    if (!selectedText.trim()) return;
    onHighlight();
    if (disabled || savingRef.current) {
      selection.removeAllRanges();
      return;
    }

    const before = range.cloneRange();
    before.selectNodeContents(rootRef.current);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    const end = start + selectedText.length;
    if (highlights.some((highlight) => start < highlight.end && end > highlight.start)) {
      selection.removeAllRanges();
      return;
    }

    void updateHighlights([...highlights, {
      id: `hl-${Date.now()}`,
      start,
      end,
      color: 'yellow',
    }]);
    selection.removeAllRanges();
  };

  const segments: React.ReactNode[] = [];
  let cursor = 0;
  [...highlights].sort((a, b) => a.start - b.start).forEach((highlight) => {
    if (highlight.start > cursor) segments.push(citation.text.slice(cursor, highlight.start));
    segments.push(
      <mark
        key={highlight.id}
        className="cursor-pointer rounded px-0.5"
        style={{ backgroundColor: 'var(--highlight-bg)' }}
        title="눌러서 강조 제거"
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled && !savingRef.current) {
            void updateHighlights(highlights.filter((entry) => entry.id !== highlight.id));
          }
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          if (!disabled && !savingRef.current) {
            void updateHighlights(highlights.filter((entry) => entry.id !== highlight.id));
          }
        }}
        role="button"
        tabIndex={disabled || saving ? -1 : 0}
        aria-label={`하이라이트 제거: ${citation.text.slice(highlight.start, highlight.end)}`}
      >
        {citation.text.slice(highlight.start, highlight.end)}
      </mark>
    );
    cursor = Math.max(cursor, highlight.end);
  });
  if (cursor < citation.text.length) segments.push(citation.text.slice(cursor));

  return (
    <span
      ref={rootRef}
      data-testid={`book-citation-text-${citation.id}`}
      onMouseUp={handleSelection}
      aria-busy={saving}
      className="block select-text whitespace-pre-wrap font-[var(--font-display-active)] text-[1.02rem] leading-[1.72] text-[var(--text-main)]"
    >
      {segments}
    </span>
  );
};
