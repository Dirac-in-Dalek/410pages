import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArchiveScreen } from './ArchiveScreen';
import userEvent from '@testing-library/user-event';
import { BookComposerDraftStore } from '../../citation-entry/logic/bookComposerDrafts';
import { compareBookPositions, legacyOrderKey } from '../../../lib/bookOrder';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const renderBookScreen = (overrides: Partial<React.ComponentProps<typeof ArchiveScreen>> = {}) => render(
  <ArchiveScreen
    isMobileApp={false}
    title="정정하는 힘"
    showEditor
    username="Reader"
    editorPrefill={{ author: '정희진', book: '정정하는 힘', bookId: 'book-1' }}
    isBookView
    authorName="정희진"
    onBackToAuthor={vi.fn()}
    sortField="page"
    dateDirection="desc"
    pageDirection="desc"
    onAddCitation={vi.fn()}
    onRetryCitationSave={vi.fn()}
    onDateSortClick={vi.fn()}
    onPageSortClick={vi.fn()}
    projects={[]}
    citations={[]}
    allCitations={[]}
    chapterBlocks={[]}
    loading={false}
    loadError={null}
    onRetryLoad={vi.fn()}
    searchTerm=""
    selectedIds={new Set()}
    selectedFilter={{ type: 'book', value: '정정하는 힘', author: '정희진' }}
    isCopying={false}
    onSelectAll={vi.fn()}
    onCopy={vi.fn()}
    onDeleteRequest={vi.fn()}
    onCancelSelection={vi.fn()}
    onAddToProject={vi.fn()}
    onCreateAndAddToProject={vi.fn()}
    onToggleSelect={vi.fn()}
    onAddNote={vi.fn()}
    onUpdateNote={vi.fn()}
    onDeleteNote={vi.fn()}
    onDeleteCitation={vi.fn()}
    onUpdateCitation={vi.fn()}
    {...overrides}
  />
);

describe('ArchiveScreen book flow', () => {
  it.each(['Backspace', 'Delete'])('keeps the top-level draft unchanged on %s without scheduling scrolling', key => {
    const drafts = new BookComposerDraftStore();
    const chapter = { id: 'root', bookId: 'book-1', label: 'Root', depth: 0, createdAt: 0, createdAtSort: 10 };
    renderBookScreen({ composerDrafts: drafts, chapterBlocks: [chapter] });
    const editor = screen.getByRole('textbox', { name: '인용문 입력' }) as HTMLTextAreaElement;
    editor.setSelectionRange(0, 0);
    const before = drafts.get('book-1');
    const frame = vi.spyOn(window, 'requestAnimationFrame');
    fireEvent.keyDown(editor, { key });
    expect(drafts.get('book-1')).toBe(before);
    expect(screen.queryByTestId('book-insertion-preview')).toBeNull();
    expect(frame).not.toHaveBeenCalled();
    frame.mockRestore();
  });
  it('changes chapter depth one step at a fixed anchor without moving focus or revealing chapters', async () => {
    const drafts = new BookComposerDraftStore();
    drafts.patch('book-1', { chapterMode: true, insertion: { afterId: 'last', depth: 1 } });
    const chapterBlocks = [0, 1, 1].map((depth, i) => ({ id: i === 2 ? 'last' : `ch${i}`, bookId: 'book-1', label: `Chapter ${i}`, depth, createdAt: i, createdAtSort: i + 1 }));
    const onToggleDivider = vi.fn();
    renderBookScreen({ composerDrafts: drafts, chapterBlocks, onToggleDivider, collapsedDividerIds: new Set(['ch0']) });
    const user = userEvent.setup();
    const editor = screen.getByRole('textbox', { name: '챕터 제목 입력' }) as HTMLTextAreaElement;
    await user.click(editor);
    await user.type(editor, '다음 장');
    editor.setSelectionRange(0, 0);
    const frame = vi.spyOn(window, 'requestAnimationFrame');
    for (const [key, depth] of [['Backspace', 0], ['Backspace', 0], ['Tab', 1], ['Tab', 2], ['Tab', 2]] as const) {
      await user.keyboard(`{${key}}`);
      expect(drafts.get('book-1')?.insertion).toEqual({ afterId: 'last', depth });
      expect(editor.closest('[data-composer-depth]')?.getAttribute('data-composer-depth')).toBe(String(depth));
      expect(document.activeElement).toBe(editor);
      expect(editor.value).toBe('다음 장');
      expect(editor.selectionStart).toBe(0);
    }
    expect(frame).not.toHaveBeenCalled();
    expect(onToggleDivider).not.toHaveBeenCalled();
  });
  it('continues after a chapter saved in the middle and keeps ordinary quote input native', async () => {
    const drafts = new BookComposerDraftStore();
    drafts.patch('book-1', { chapterMode: true, insertion: { afterId: 'root', depth: 1 } });
    const chapterBlocks = [
      { id: 'root', bookId: 'book-1', label: '2장', depth: 0, createdAt: 0, createdAtSort: 10 },
      { id: 'later', bookId: 'book-1', label: '3장', depth: 0, createdAt: 0, createdAtSort: 30 },
    ];
    const created = { id: 'new', bookId: 'book-1', label: '2-1장', depth: 1, createdAt: 0, createdAtSort: 20 };
    const onCreateChapterBlock = vi.fn().mockResolvedValue(created);
    const onAddCitation = vi.fn().mockResolvedValue({ ok: true, citationId: 'quote-new' });
    const props = { composerDrafts: drafts, chapterBlocks, onCreateChapterBlock, onAddCitation };
    const view = renderBookScreen(props);
    const user = userEvent.setup();
    const previewPosition = screen.getByTestId('book-insertion-preview').getAttribute('data-insertion-position');
    await user.type(screen.getByRole('textbox', { name: '챕터 제목 입력' }), '2-1장{Enter}');
    await waitFor(() => expect(drafts.get('book-1')?.insertion).toEqual({ afterId: 'new', depth: 1 }));
    expect(onCreateChapterBlock).toHaveBeenCalledWith(expect.objectContaining({
      createdAtSort: expect.any(Number),
      orderKey: expect.any(String),
      depth: 1,
    }));
    const chapterInput = onCreateChapterBlock.mock.calls[0][0];
    expect(chapterInput.orderKey).toBe(previewPosition);
    expect(compareBookPositions(legacyOrderKey(10), chapterInput.orderKey)).toBeLessThan(0);
    expect(compareBookPositions(chapterInput.orderKey, legacyOrderKey(30))).toBeLessThan(0);
    view.unmount();
    renderBookScreen({ ...props, chapterBlocks: [chapterBlocks[0], created, chapterBlocks[1]] });
    const editor = screen.getByRole('textbox', { name: '인용문 입력' }) as HTMLTextAreaElement;
    expect(editor.closest('[data-composer-depth]')?.getAttribute('data-composer-depth')).toBe('1');
    await user.type(editor, 'abc');
    await user.keyboard('{Backspace}');
    expect(editor.value).toBe('ab');
    editor.setSelectionRange(0, 0);
    await user.keyboard(' ');
    expect(editor.value).toBe(' ab');
    await user.keyboard('{Tab}');
    expect(drafts.get('book-1')?.insertion?.afterId).toBe('new');
    expect(document.activeElement).not.toBe(editor);
    await user.click(screen.getByRole('button', { name: '문장 저장' }));
    await waitFor(() => expect(drafts.get('book-1')?.insertion?.afterId).toBe('quote-new'));
    expect(onAddCitation).toHaveBeenCalledWith(expect.objectContaining({ orderKey: expect.any(String) }));
    const quoteInput = onAddCitation.mock.calls[0][0];
    expect(compareBookPositions(legacyOrderKey(20), quoteInput.orderKey)).toBeLessThan(0);
    expect(compareBookPositions(quoteInput.orderKey, legacyOrderKey(30))).toBeLessThan(0);
  });
  it('shows the author path, hides sorting, and places the editor after the list', () => {
    renderBookScreen();

    expect(screen.getByRole('button', { name: '정희진의 책' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /정렬:/ })).toBeNull();
    expect(screen.getByText('아래 입력창에서 문장이나 단어를 추가해보세요.')).not.toBeNull();
    const editor = screen.getByPlaceholderText('문장, 인용문 또는 단어를 입력하세요');
    const emptyState = screen.getByText('아직 수집한 항목이 없습니다.');
    expect(emptyState.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
