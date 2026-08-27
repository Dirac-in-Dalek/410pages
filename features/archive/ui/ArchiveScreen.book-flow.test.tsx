import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ArchiveScreen } from './ArchiveScreen';

const renderBookScreen = () => render(
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
  />
);

describe('ArchiveScreen book flow', () => {
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
