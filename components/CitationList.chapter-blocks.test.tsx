import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChapterBlock, Citation, Project } from '../types';
import { CitationList } from '../features/archive/ui/CitationList';

vi.mock('../features/archive/ui/CitationCard', () => ({
  CitationCard: ({ citation }: { citation: Citation }) => (
    <div data-testid={`citation-${citation.id}`}>{citation.text}</div>
  ),
}));

const citation = (overrides: Partial<Citation> & Pick<Citation, 'id' | 'text' | 'author' | 'book'>): Citation => ({
  notes: [],
  tags: [],
  createdAt: 0,
  ...overrides,
});

const chapterBlock = (
  overrides: Partial<ChapterBlock> & Pick<ChapterBlock, 'id' | 'bookId' | 'label'>
): ChapterBlock => ({
  createdAt: 0,
  createdAtSort: 0,
  ...overrides,
});

const projects: Project[] = [];
const baseProps = {
  projects,
  username: 'Reader',
  loading: false,
  searchTerm: '',
  selectedIds: new Set<string>(),
  onToggleSelect: vi.fn(),
  onAddNote: vi.fn(),
  onUpdateNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onDeleteCitation: vi.fn(),
  onUpdateCitation: vi.fn(),
  onCreateChapterBlock: vi.fn(),
  onDeleteChapterBlock: vi.fn(),
};

describe('CitationList chapter blocks', () => {
  it('renders a chapter block in book view mixed with citations', () => {
    render(
      <CitationList
        {...baseProps}
        citations={[
          citation({
            id: 'citation-1',
            text: 'First quote',
            author: 'Author A',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 100,
            createdAt: 1000,
          }),
          citation({
            id: 'citation-2',
            text: 'Second quote',
            author: 'Author B',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 200,
            createdAt: 2000,
          }),
        ]}
        chapterBlocks={[
          chapterBlock({
            id: 'block-1',
            bookId: 'book-1',
            label: '3장',
            pageSort: 150,
            createdAtSort: 1500,
            createdAt: 1500,
          }),
        ]}
        isBookView
        sortField="page"
      />
    );

    expect(screen.getByText('First quote')).toBeTruthy();
    expect(screen.queryByText('Chapter')).toBeNull();
    expect(screen.getByText('3장')).toBeTruthy();
    expect(screen.getByText('Second quote')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Add chapter block' })).toHaveLength(1);
    expect(screen.getByTestId('citation-citation-1').compareDocumentPosition(screen.getByText('3장'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText('3장').compareDocumentPosition(screen.getByTestId('citation-citation-2'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('does not render a chapter block when book view is off', () => {
    render(
      <CitationList
        {...baseProps}
        citations={[
          citation({
            id: 'citation-1',
            text: 'First quote',
            author: 'Author A',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 100,
            createdAt: 1000,
          }),
        ]}
        chapterBlocks={[
          chapterBlock({
            id: 'block-1',
            bookId: 'book-1',
            label: '3장',
            pageSort: 150,
            createdAtSort: 1500,
            createdAt: 1500,
          }),
        ]}
        isBookView={false}
      />
    );

    expect(screen.getByText('First quote')).toBeTruthy();
    expect(screen.queryByText('3장')).toBeNull();
  });

  it('renders a hover-only insert affordance between rows', () => {
    render(
      <CitationList
        {...baseProps}
        citations={[
          citation({
            id: 'citation-1',
            text: 'First quote',
            author: 'Author A',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 100,
            createdAt: 1000,
          }),
          citation({
            id: 'citation-2',
            text: 'Second quote',
            author: 'Author B',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 200,
            createdAt: 2000,
          }),
        ]}
        chapterBlocks={[]}
        isBookView
        sortField="page"
      />
    );

    const trigger = screen.getAllByRole('button', { name: 'Add chapter block' })[0];
    expect(trigger.className).toContain('opacity-0');
  });

  it('submits a chapter block with the expected book and sort payload in page view', async () => {
    const user = userEvent.setup();
    const onCreateChapterBlock = vi.fn();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation({
            id: 'citation-1',
            text: 'First quote',
            author: 'Author A',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 100,
            createdAt: 1000,
          }),
          citation({
            id: 'citation-2',
            text: 'Second quote',
            author: 'Author B',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 200,
            createdAt: 2000,
          }),
        ]}
        chapterBlocks={[]}
        isBookView
        sortField="page"
        onCreateChapterBlock={onCreateChapterBlock}
      />
    );

    await user.click(screen.getAllByRole('button', { name: 'Add chapter block' })[0]);
    await user.type(screen.getByRole('textbox', { name: 'Chapter block label' }), '3장');
    await user.click(screen.getByRole('button', { name: 'Save chapter block' }));

    expect(onCreateChapterBlock).toHaveBeenCalledWith({
      bookId: 'book-1',
      label: '3장',
      pageSort: 150,
      createdAtSort: 1500,
    });
  });

  it('keeps the chapter label input uncontrolled so IME composition can own the text', async () => {
    const user = userEvent.setup();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation({
            id: 'citation-1',
            text: 'First quote',
            author: 'Author A',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 100,
            createdAt: 1000,
          }),
          citation({
            id: 'citation-2',
            text: 'Second quote',
            author: 'Author B',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 200,
            createdAt: 2000,
          }),
        ]}
        chapterBlocks={[]}
        isBookView
        sortField="page"
      />
    );

    await user.click(screen.getAllByRole('button', { name: 'Add chapter block' })[0]);

    const input = screen.getByRole('textbox', { name: 'Chapter block label' });
    expect(input.getAttribute('value')).toBeNull();

    await user.type(input, '대한민국');

    expect((input as HTMLInputElement).value).toBe('대한민국');
    expect(input.getAttribute('value')).toBeNull();
    expect((screen.getByRole('button', { name: 'Save chapter block' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('still shows an insert control when the book view has only one citation', async () => {
    const user = userEvent.setup();
    const onCreateChapterBlock = vi.fn();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation({
            id: 'citation-1',
            text: 'Only quote',
            author: 'Author A',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 100,
            createdAt: 1000,
          }),
        ]}
        chapterBlocks={[]}
        isBookView
        sortField="page"
        onCreateChapterBlock={onCreateChapterBlock}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add chapter block' }));
    await user.type(screen.getByRole('textbox', { name: 'Chapter block label' }), '프롤로그');
    await user.click(screen.getByRole('button', { name: 'Save chapter block' }));

    expect(onCreateChapterBlock).toHaveBeenCalledWith({
      bookId: 'book-1',
      label: '프롤로그',
      pageSort: 100,
      createdAtSort: 999.9,
    });
  });

  it('hides every add button while one insert form is open', async () => {
    const user = userEvent.setup();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation({
            id: 'citation-1',
            text: 'First quote',
            author: 'Author A',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 100,
            createdAt: 1000,
          }),
          citation({
            id: 'citation-2',
            text: 'Second quote',
            author: 'Author B',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 200,
            createdAt: 2000,
          }),
        ]}
        chapterBlocks={[]}
        isBookView
        sortField="page"
      />
    );

    expect(screen.getAllByRole('button', { name: 'Add chapter block' })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: 'Add chapter block' })[0]);

    expect(screen.getByRole('textbox', { name: 'Chapter block label' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add chapter block' })).toBeNull();
  });

  it('opens extra vertical space around the chapter input while editing', async () => {
    const user = userEvent.setup();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation({
            id: 'citation-1',
            text: 'First quote',
            author: 'Author A',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 100,
            createdAt: 1000,
          }),
          citation({
            id: 'citation-2',
            text: 'Second quote',
            author: 'Author B',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 200,
            createdAt: 2000,
          }),
        ]}
        chapterBlocks={[]}
        isBookView
        sortField="page"
      />
    );

    const trigger = screen.getAllByRole('button', { name: 'Add chapter block' })[0];
    expect(trigger.parentElement?.className).toContain('h-5');

    await user.click(trigger);

    const input = screen.getByRole('textbox', { name: 'Chapter block label' });
    expect(input.className).toContain('h-10');
    expect(input.parentElement?.parentElement?.className).toContain('min-h-12');
  });

  it('closes the insert form when clicking outside', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <button type="button">Outside target</button>
        <CitationList
          {...baseProps}
          citations={[
            citation({
              id: 'citation-1',
              text: 'First quote',
              author: 'Author A',
              book: 'Book A',
              bookId: 'book-1',
              pageSort: 100,
              createdAt: 1000,
            }),
            citation({
              id: 'citation-2',
              text: 'Second quote',
              author: 'Author B',
              book: 'Book A',
              bookId: 'book-1',
              pageSort: 200,
              createdAt: 2000,
            }),
          ]}
          chapterBlocks={[]}
          isBookView
          sortField="page"
        />
      </div>
    );

    await user.click(screen.getAllByRole('button', { name: 'Add chapter block' })[0]);
    expect(screen.getByRole('textbox', { name: 'Chapter block label' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Outside target' }));

    expect(screen.queryByRole('textbox', { name: 'Chapter block label' })).toBeNull();
  });

  it('deletes a saved chapter block from its inline close button', async () => {
    const user = userEvent.setup();
    const onDeleteChapterBlock = vi.fn();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation({
            id: 'citation-1',
            text: 'First quote',
            author: 'Author A',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 100,
            createdAt: 1000,
          }),
          citation({
            id: 'citation-2',
            text: 'Second quote',
            author: 'Author B',
            book: 'Book A',
            bookId: 'book-1',
            pageSort: 200,
            createdAt: 2000,
          }),
        ]}
        chapterBlocks={[
          chapterBlock({
            id: 'block-1',
            bookId: 'book-1',
            label: '3장',
            pageSort: 150,
            createdAtSort: 1500,
            createdAt: 1500,
          }),
        ]}
        isBookView
        sortField="page"
        onDeleteChapterBlock={onDeleteChapterBlock}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete chapter block 3장' }));

    expect(onDeleteChapterBlock).toHaveBeenCalledWith('book-1', 'block-1');
  });
});
