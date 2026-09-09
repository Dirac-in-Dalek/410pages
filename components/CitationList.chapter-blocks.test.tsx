import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  kind: 'sentence',
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
  it('moves only the chapter before or after a row without changing citations', async () => {
    const user = userEvent.setup();
    const move = vi.fn().mockResolvedValue(true);
    const updateCitation = vi.fn();
    const quotes = [1, 3, 5].map(n => citation({ id: `quote-${n}`, text: `Quote ${n}`, author: 'Author', book: 'Book', bookId: 'book-1', createdAt: n }));
    render(<CitationList {...baseProps} citations={quotes} isBookView onMoveChapterBlock={move} onUpdateCitation={updateCitation}
      chapterBlocks={[chapterBlock({ id: 'move-me', bookId: 'book-1', label: 'Move title', createdAtSort: 2 })]} />);
    const handle = screen.getByRole('button', { name: '챕터 이동 Move title' });
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(handle, { dataTransfer });
    const last = screen.getByTestId('citation-quote-5').closest('[data-book-row]')!;
    const over = new MouseEvent('dragover', { bubbles: true, clientY: 10 });
    Object.defineProperty(over, 'dataTransfer', { value: dataTransfer });
    fireEvent(last, over);
    fireEvent.drop(last, { dataTransfer });
    expect(move).toHaveBeenCalledWith('book-1', 'move-me', 5.9);
    expect(updateCitation).not.toHaveBeenCalled();
    // Same saved position remains until the owner accepts a server response.
    expect(screen.getAllByRole('checkbox').map(el => el.getAttribute('aria-label'))).toEqual(['문장 선택: Quote 1', '문장 선택: Quote 3', '문장 선택: Quote 5']);
    await user.click(handle);
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}');
    expect(move).toHaveBeenLastCalledWith('book-1', 'move-me', 0.9);
  });

  it('moves a chapter relative to an individual short citation', () => {
    const move = vi.fn().mockResolvedValue(true);
    const quotes = [
      citation({ id: 'sentence', text: 'Sentence', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 1 }),
      ...[10, 20].map(n => citation({ id: `word-${n}`, kind: 'sentence', text: `Word ${n}`, author: 'Author', book: 'Book', bookId: 'book-1', createdAt: n })),
    ];
    render(<CitationList {...baseProps} citations={quotes} isBookView onMoveChapterBlock={move}
      chapterBlocks={[chapterBlock({ id: 'source', bookId: 'book-1', label: 'Word chapter', createdAtSort: 5 })]} />);
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(screen.getByRole('button', { name: '챕터 이동 Word chapter' }), { dataTransfer });
    const group = document.querySelector('[data-book-row="word-10"]')!;
    const over = new MouseEvent('dragover', { bubbles: true, clientY: -1 });
    Object.defineProperty(over, 'dataTransfer', { value: dataTransfer });
    fireEvent(group, over);
    fireEvent.drop(group, { dataTransfer });
    expect(move).toHaveBeenCalledWith('book-1', 'source', 5.5);
  });

  it('folds only until the next divider and preserves folds when the list is reopened', async () => {
    const user = userEvent.setup();
    const quotes = [
      citation({ id: 'before', text: 'Before divider', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 1 }),
      citation({ id: 'middle', text: 'Middle section', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 3 }),
      citation({ id: 'last', text: 'Last section', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 5 }),
    ];
    const blocks = [
      chapterBlock({ id: 'a', bookId: 'book-1', label: 'First', createdAtSort: 2 }),
      chapterBlock({ id: 'b', bookId: 'book-1', label: 'Second', createdAtSort: 4 }),
      chapterBlock({ id: 'empty', bookId: 'book-1', label: 'Empty', createdAtSort: 6 }),
    ];
    function Screen() {
      const [open, setOpen] = React.useState(true);
      const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
      return <>
        <button onClick={() => setOpen(value => !value)}>Toggle book</button>
        {open && <CitationList {...baseProps} citations={quotes} chapterBlocks={blocks} isBookView
          collapsedDividerIds={collapsed} onToggleDivider={id => setCollapsed(previous => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          })} />}
      </>;
    }
    render(<Screen />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '챕터 접기 First' }));
    expect(screen.queryByRole('checkbox', { name: '문장 선택: Middle section' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: '문장 선택: Before divider' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: '문장 선택: Last section' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '챕터 접기 Second' })).toBeTruthy();
    // Hidden content stays mounted so an in-progress editor is not discarded.
    expect(screen.getByTestId('citation-middle')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Toggle book' }));
    await user.click(screen.getByRole('button', { name: 'Toggle book' }));
    expect(screen.getByRole('button', { name: '챕터 펼치기 First' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('checkbox', { name: '문장 선택: Middle section' })).toBeNull();
    screen.getByRole('button', { name: '챕터 펼치기 First' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: '챕터 접기 Second' }));
    expect(screen.queryByRole('checkbox', { name: '문장 선택: Last section' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '챕터 접기 Empty' }));
    expect(screen.getByRole('button', { name: '챕터 펼치기 Empty' })).toBeTruthy();
    expect(baseProps.onDeleteChapterBlock).not.toHaveBeenCalled();
  });

  it('creates a leading chapter before the first citation', async () => {
    const user = userEvent.setup();
    const onCreateChapterBlock = vi.fn();
    render(<CitationList
      {...baseProps}
      citations={[citation({ id: 'first', text: 'First quote', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 1000, pageSort: 10 })]}
      isBookView
      onCreateChapterBlock={onCreateChapterBlock}
    />);

    await user.click(screen.getByRole('button', { name: '맨 위에 챕터 추가' }));
    await user.type(screen.getByRole('textbox', { name: '챕터 제목' }), '1장');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));

    expect(onCreateChapterBlock).toHaveBeenCalledWith({ bookId: 'book-1', label: '1장', pageSort: 10, createdAtSort: 999.9 });
  });

  it('creates the first chapter in an empty selected book', async () => {
    const user = userEvent.setup();
    const onCreateChapterBlock = vi.fn();
    render(<CitationList
      {...baseProps}
      citations={[]}
      isBookView
      selectedFilter={{ type: 'book', bookId: 'empty-book', value: 'Empty book' }}
      onCreateChapterBlock={onCreateChapterBlock}
    />);

    await user.click(screen.getByRole('button', { name: '맨 위에 챕터 추가' }));
    await user.type(screen.getByRole('textbox', { name: '챕터 제목' }), '들어가며');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));

    expect(onCreateChapterBlock).toHaveBeenCalledWith({ bookId: 'empty-book', label: '들어가며', pageSort: undefined, createdAtSort: expect.any(Number) });
  });

  it('keeps leading insertion at the book start when search hides earlier citations', async () => {
    const user = userEvent.setup();
    const onCreateChapterBlock = vi.fn();
    const visible = citation({ id: 'visible', text: 'Match', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 2000 });
    render(<CitationList {...baseProps} citations={[visible]} allCitations={[
      citation({ id: 'other', text: 'Other book', author: 'Author', book: 'Other', bookId: 'book-2', createdAt: 100 }),
      citation({ id: 'hidden', text: 'Hidden quote', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 1000 }),
      visible,
    ]} isBookView searchTerm="Match" onCreateChapterBlock={onCreateChapterBlock} />);

    await user.click(screen.getByRole('button', { name: '맨 위에 챕터 추가' }));
    await user.type(screen.getByRole('textbox', { name: '챕터 제목' }), '1장');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));
    expect(onCreateChapterBlock).toHaveBeenCalledWith({ bookId: 'book-1', label: '1장', pageSort: undefined, createdAtSort: 999.9 });
  });

  it('keeps book citations and chapter blocks in oldest-first time order', () => {
    render(
      <CitationList
        {...baseProps}
        citations={[
          citation({ id: 'new', text: 'Latest quote', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 300 }),
          citation({ id: 'old', text: 'Oldest quote', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 100 }),
        ]}
        chapterBlocks={[{
          id: 'middle', bookId: 'book-1', label: 'Middle chapter', createdAtSort: 200, createdAt: 200,
        }]}
        isBookView
        sortField="page"
        dateDirection="desc"
      />
    );

    const oldest = screen.getByText('Oldest quote');
    const middle = screen.getByText('Middle chapter');
    const latest = screen.getByText('Latest quote');
    expect(oldest.compareDocumentPosition(middle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(middle.compareDocumentPosition(latest) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

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
    expect(screen.getAllByRole('button', { name: '챕터 추가' })).toHaveLength(1);
    expect(screen.getByTestId('citation-citation-1').compareDocumentPosition(screen.getByText('3장'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText('3장').compareDocumentPosition(screen.getByTestId('citation-citation-2'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('allows long chapter labels to wrap instead of truncating', () => {
    const longLabel = '6장. 돈으로 행복해지는 비결은 쾌락을 사는 것이 아니라 시간을 되찾는 것이다';

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
            label: longLabel,
            pageSort: 150,
            createdAtSort: 1500,
            createdAt: 1500,
          }),
        ]}
        isBookView
        sortField="page"
      />
    );

    expect(screen.getByText(longLabel).className).toContain('whitespace-normal');
    expect(screen.getByText(longLabel).className).not.toContain('truncate');
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

    const trigger = screen.getAllByRole('button', { name: '챕터 추가' })[0];
    expect(trigger.className).not.toContain('opacity-0');
    expect(trigger.querySelector('span.inline-flex')?.className).toContain('group-hover:opacity-100');
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

    await user.click(screen.getAllByRole('button', { name: '챕터 추가' })[0]);
    await user.type(screen.getByRole('textbox', { name: '챕터 제목' }), '3장');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));

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

    await user.click(screen.getAllByRole('button', { name: '챕터 추가' })[0]);

    const input = screen.getByRole('textbox', { name: '챕터 제목' });
    expect(input.getAttribute('value')).toBeNull();

    await user.type(input, '대한민국');

    expect((input as HTMLInputElement).value).toBe('대한민국');
    expect(input.getAttribute('value')).toBeNull();
    expect((screen.getByRole('button', { name: '챕터 저장' }) as HTMLButtonElement).disabled).toBe(false);
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

    await user.click(screen.getByRole('button', { name: '챕터 추가' }));
    await user.type(screen.getByRole('textbox', { name: '챕터 제목' }), '프롤로그');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));

    expect(onCreateChapterBlock).toHaveBeenCalledWith({
      bookId: 'book-1',
      label: '프롤로그',
      pageSort: 100,
      createdAtSort: 1000.9,
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

    expect(screen.getAllByRole('button', { name: '챕터 추가' })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: '챕터 추가' })[0]);

    expect(screen.getByRole('textbox', { name: '챕터 제목' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '챕터 추가' })).toBeNull();
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

    const trigger = screen.getAllByRole('button', { name: '챕터 추가' })[0];
    expect(trigger.parentElement?.className).toContain('h-5');

    await user.click(trigger);

    const input = screen.getByRole('textbox', { name: '챕터 제목' });
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

    await user.click(screen.getAllByRole('button', { name: '챕터 추가' })[0]);
    expect(screen.getByRole('textbox', { name: '챕터 제목' })).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Outside target' }));

    expect(screen.queryByRole('textbox', { name: '챕터 제목' })).toBeNull();
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

    await user.click(screen.getByRole('button', { name: '챕터 삭제 3장' }));

    expect(onDeleteChapterBlock).toHaveBeenCalledWith('book-1', 'block-1');
  });

  it('disables chapter edit controls while chapter data is loading', () => {
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
            label: '1장',
            pageSort: 50,
            createdAtSort: 500,
          }),
        ]}
        isBookView
        sortField="page"
        chapterActionsDisabled
      />
    );

    expect(screen.getAllByRole('button', { name: '챕터 추가' }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.queryByRole('button', { name: '챕터 삭제 1장' })).toBeNull();
  });
});
