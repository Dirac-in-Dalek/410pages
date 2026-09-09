import React from 'react';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CitationList } from './CitationList';
import type { Citation } from '../../../types';

const citations: Citation[] = [1, 2].map(n => ({
  id: `quote-${n}`, kind: 'sentence', text: `인용문 ${n}`, author: '저자', book: '책',
  page: String(n), notes: [], tags: [], createdAt: n,
}));
const props = {
  citations, projects: [], username: '독자', loading: false, searchTerm: '',
  selectedIds: new Set<string>(), isBookView: true, passageNoteCitationId: 'quote-2',
  onToggleSelect: vi.fn(), onAddNote: vi.fn(), onUpdateNote: vi.fn(), onDeleteNote: vi.fn(),
  onDeleteCitation: vi.fn(), onUpdateCitation: vi.fn(), onRetryCitationSave: vi.fn(),
};

describe('inline passage comments', () => {
  it('offers all-comments next to a quote without also toggling that individual quote', async () => {
    const user = userEvent.setup();
    const onToggleAll = vi.fn();
    const onSelect = vi.fn();
    const withNotes = citations.map(citation => ({ ...citation, notes: [{ id: `note-${citation.id}`, content: '번역문', createdAt: 1 }] }));
    render(<CitationList {...props} citations={withNotes} inlinePassageNotes onToggleAllPassageNotes={onToggleAll} onPassageNoteCitationChange={onSelect} />);
    await user.click(within(screen.getByTestId('citation-quote-1')).getByRole('button', { name: '댓글 모두 펼치기' }));
    expect(onToggleAll).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows all saved comments with one active composer and retains a draft across closing all', async () => {
    const user = userEvent.setup();
    const withNotes = citations.map((citation, index) => ({ ...citation, notes: [{ id: `note-${index}`, content: `Translation ${index}`, createdAt: 1 }] }));
    const { rerender } = render(<CitationList {...props} citations={withNotes} passageNoteCitationId={null} inlinePassageNotes showAllPassageNotes />);
    expect(screen.getByText('Translation 0')).toBeTruthy();
    expect(screen.getByText('Translation 1')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    rerender(<CitationList {...props} citations={withNotes} inlinePassageNotes showAllPassageNotes />);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    await user.type(screen.getByRole('textbox', { name: '댓글 입력' }), 'Keep my draft');
    rerender(<CitationList {...props} citations={withNotes} passageNoteCitationId={null} inlinePassageNotes showAllPassageNotes={false} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
    rerender(<CitationList {...props} citations={withNotes} inlinePassageNotes showAllPassageNotes />);
    expect((screen.getByRole('textbox', { name: '댓글 입력' }) as HTMLTextAreaElement).value).toBe('Keep my draft');
  });

  it('switches directly to another comment edit without closing the active row on pointerdown', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const withNotes = citations.map((citation, index) => ({ ...citation, notes: [{ id: `note-${index}`, content: `Translation ${index}`, createdAt: 1 }] }));
    render(<CitationList {...props} citations={withNotes} passageNoteCitationId="quote-1" inlinePassageNotes showAllPassageNotes onPassageNoteCitationChange={onChange} />);
    await user.click(within(screen.getByTestId('citation-quote-2')).getByRole('button', { name: '메모 수정' }));
    expect(onChange.mock.calls).toEqual([['quote-2']]);
  });

  it('preserves an unsaved comment when its divider is folded and reopened', async () => {
    const user = userEvent.setup();
    function Book() {
      const [selected, setSelected] = React.useState<string | null>('quote-2');
      const [collapsed, setCollapsed] = React.useState(false);
      return <CitationList {...props} inlinePassageNotes
        passageNoteCitationId={selected} onPassageNoteCitationChange={setSelected}
        chapterBlocks={[{ id: 'divider', bookId: 'book', label: '구간', createdAt: 0, createdAtSort: 1.5 }]}
        collapsedDividerIds={new Set(collapsed ? ['divider'] : [])}
        onToggleDivider={() => setCollapsed(value => !value)} />;
    }
    render(<Book />);
    await user.type(screen.getByPlaceholderText('댓글을 남기세요'), '작성 중인 댓글');
    await user.click(screen.getByRole('button', { name: '챕터 접기 구간' }));
    expect(screen.queryByRole('textbox')).toBeNull();
    await user.click(screen.getByRole('button', { name: '챕터 펼치기 구간' }));
    expect((screen.getByPlaceholderText('댓글을 남기세요') as HTMLTextAreaElement).value).toBe('작성 중인 댓글');
  });

  it('anchors the only comment editor to the selected quote and closes it through the owner', () => {
    const onChange = vi.fn();
    render(<CitationList {...props} inlinePassageNotes onPassageNoteCitationChange={onChange} />);
    const row = screen.getByTestId('citation-quote-2');
    expect(within(row).getByPlaceholderText('댓글을 남기세요')).toBeTruthy();
    expect(within(screen.getByTestId('citation-quote-1')).queryByRole('textbox')).toBeNull();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    fireEvent.click(within(row).getByRole('button', { name: '구절 메모 닫기' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('leaves the mobile comment surface to the existing outer sheet', () => {
    render(<CitationList {...props} inlinePassageNotes={false} />);
    expect(screen.queryByTestId('inline-passage-comments')).toBeNull();
  });
});
