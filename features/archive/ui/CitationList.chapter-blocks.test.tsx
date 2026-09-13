import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ChapterBlock, Citation, Project } from '../../../types';
import { CitationList } from './CitationList';

vi.mock('./CitationCard', () => ({
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

function dragEvent(element: Element, type: string, clientX: number, clientY: number) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
  Object.defineProperty(event, 'dataTransfer', { value: { setData: vi.fn(), effectAllowed: '', dropEffect: '' } });
  fireEvent(element, event);
}

describe('CitationList chapter blocks', () => {
  it('adds a child after the last chapter even without citations', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(true);
    render(<CitationList {...baseProps} citations={[]} isBookView onCreateChapterBlock={create} chapterBlocks={[
      chapterBlock({ id: 'first', bookId: 'book-1', label: '1장', createdAtSort: 1 }),
      chapterBlock({ id: 'second', bookId: 'book-1', label: '2장', createdAtSort: 2 }),
    ]} />);
    await user.click(screen.getAllByRole('button', { name: '챕터 추가' }).at(-1)!);
    await user.keyboard('{Tab}');
    await user.type(screen.getByRole('textbox', { name: '챕터 제목' }), '하위 제목');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ label: '하위 제목', depth: 1, bookId: 'book-1', createdAtSort: 2.9 }));
  });
  it('moves only the chapter before or after a row without changing citations', async () => {
    const user = userEvent.setup();
    const move = vi.fn().mockResolvedValue(true);
    const updateCitation = vi.fn();
    const quotes = [1, 3, 5].map(n => citation({ id: `quote-${n}`, text: `Quote ${n}`, author: 'Author', book: 'Book', bookId: 'book-1', createdAt: n }));
    render(<CitationList {...baseProps} citations={quotes} isBookView onMoveChapterBlock={move} onUpdateCitation={updateCitation}
      chapterBlocks={[chapterBlock({ id: 'move-me', bookId: 'book-1', label: 'Move title', createdAtSort: 2 })]} />);
    const handle = screen.getByRole('heading', { name: 'Move title' });
    const dataTransfer = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };
    fireEvent.dragStart(handle, { dataTransfer });
    const last = screen.getByTestId('citation-quote-5').closest('[data-book-row]')!;
    const over = new MouseEvent('dragover', { bubbles: true, clientY: 10 });
    Object.defineProperty(over, 'dataTransfer', { value: dataTransfer });
    fireEvent(last, over);
    dragEvent(last, 'drop', 0, 10);
    expect(move).toHaveBeenCalledWith('book-1', 'move-me', 5.9, 0);
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
    fireEvent.dragStart(screen.getByRole('heading', { name: 'Word chapter' }), { dataTransfer });
    const group = document.querySelector('[data-book-row="word-10"]')!;
    const over = new MouseEvent('dragover', { bubbles: true, clientY: -1 });
    Object.defineProperty(over, 'dataTransfer', { value: dataTransfer });
    fireEvent(group, over);
    dragEvent(group, 'drop', 0, -1);
    expect(move).toHaveBeenCalledWith('book-1', 'source', 5.5, 0);
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
    expect(screen.getAllByRole('button', { name: '챕터 추가' })).toHaveLength(3);
    expect(screen.getByTestId('citation-citation-1').compareDocumentPosition(screen.getByText('3장'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(screen.getByText('3장').compareDocumentPosition(screen.getByTestId('citation-citation-2'))).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('preserves the complete long chapter title', () => {
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

    expect(screen.getByRole('heading', { name: longLabel }).textContent).toBe(longLabel);
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

  it('keeps an accessible insert button between rows', () => {
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
    expect(trigger.getAttribute('type')).toBe('button');
    expect(trigger.hasAttribute('disabled')).toBe(false);
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

  it('opens the title input with save and cancel controls', async () => {
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

    await user.click(trigger);

    const input = screen.getByRole('textbox', { name: '챕터 제목' });
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole('button', { name: '챕터 저장' }).closest('form')).toBe(input.closest('form'));
    expect(screen.getByRole('button', { name: '챕터 취소' }).closest('form')).toBe(input.closest('form'));
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

it('previews the destination parent and drops at that depth, retaining the original on failure', async () => {
  const move = vi.fn().mockResolvedValue(false);
  const blocks = [
    chapterBlock({ id: 'parent', bookId: 'b', label: '2장', createdAtSort: 10 }),
    chapterBlock({ id: 'child', bookId: 'b', label: '기존 하위', createdAtSort: 20, depth: 1 }),
    chapterBlock({ id: 'moved', bookId: 'b', label: '새 챕터', createdAtSort: 30 }),
  ];
  render(<CitationList {...baseProps} citations={[]} chapterBlocks={blocks} isBookView onMoveChapterBlock={move} />);
  const handle = screen.getByRole('heading', { name: '새 챕터' });
  const row = document.querySelector('[data-book-row="child"]')!;
  dragEvent(handle, 'dragstart', 100, 100);
  dragEvent(row, 'dragover', 116, 10);
  expect(screen.getByRole('status').textContent).toBe('2장 아래 · 하위 1단계');
  dragEvent(row, 'dragover', 132, 10);
  expect(screen.getByRole('status').textContent).toBe('기존 하위 아래 · 하위 2단계');
  dragEvent(row, 'dragover', 100, 10);
  expect(screen.getByRole('status').textContent).toBe('최상위에 놓기');
  dragEvent(row, 'dragover', 116, 10);
  dragEvent(row, 'drop', 116, 10);
  expect(move).toHaveBeenCalledWith('b', 'moved', 20.9, 1);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('이동하지 못했습니다'));
  expect(document.querySelector('[data-chapter-node="moved"]')?.getAttribute('data-chapter-depth')).toBe('0');
  expect(screen.queryByRole('status')).toBeNull();
  expect(blocks.map(block => block.createdAtSort)).toEqual([10, 20, 30]);
  dragEvent(handle, 'dragstart', 100, 100);
  expect(screen.getByRole('alert').textContent).toContain('이동하지 못했습니다');
  dragEvent(row, 'dragover', 116, 10);
  dragEvent(handle, 'dragend', 116, 10);
  expect(screen.queryByRole('status')).toBeNull();
  expect(move).toHaveBeenCalledTimes(1);
});


describe('approved chapter placement and subtree folding', () => {
  const blocks = [
    chapterBlock({ id: 'a', bookId: 'b', label: '생각의 시작', createdAtSort: 10, depth: 0 }),
    chapterBlock({ id: 'b', bookId: 'b', label: '작은 관찰', createdAtSort: 20, depth: 1 }),
    chapterBlock({ id: 'c', bookId: 'b', label: '관찰의 기록', createdAtSort: 30, depth: 2 }),
    chapterBlock({ id: 'd', bookId: 'b', label: '다음 이야기', createdAtSort: 50, depth: 0 }),
  ];
  const row = (id: string) => document.querySelector(`[data-book-row="${id}"]`) as HTMLElement;

  it('adds a sibling at the selected chapter and citation separators without generated numbering', async () => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(false);
    const quotes = [citation({ id: 'q', text: '관찰 인용문', author: '저자', book: '책', bookId: 'b', createdAt: 25 })];
    render(<CitationList {...baseProps} isBookView citations={quotes} chapterBlocks={blocks} onCreateChapterBlock={create} />);
    await user.click(within(row('b')).getByRole('button', { name: '챕터 추가' }));
    let input = screen.getByRole('textbox', { name: '챕터 제목' });
    expect(input.closest('form')?.dataset.chapterDepth).toBe('1');
    await user.type(input, '다시 읽기');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({ label: '다시 읽기', depth: 1, createdAtSort: 22.5 }));
    expect(input).toBe(screen.getByRole('textbox', { name: '챕터 제목' }));
    await user.click(screen.getByRole('button', { name: '챕터 취소' }));
    await user.click(within(row('q')).getByRole('button', { name: '챕터 추가' }));
    input = screen.getByRole('textbox', { name: '챕터 제목' });
    expect(input.closest('form')?.dataset.chapterDepth).toBe('1');
    expect(screen.getByRole('heading', { name: '작은 관찰' }).textContent).toBe('작은 관찰');
  });

  it('hides all descendants and citations until the next peer, and retains child fold state', async () => {
    const user = userEvent.setup();
    const quotes = [citation({ id: 'q', text: '하위 인용문', author: '저자', book: '책', bookId: 'b', createdAt: 40 })];
    function Screen() {
      const [folds, setFolds] = React.useState(new Set(['b']));
      return <CitationList {...baseProps} isBookView citations={quotes} chapterBlocks={blocks} collapsedDividerIds={folds}
        onToggleDivider={id => setFolds(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; })} />;
    }
    render(<Screen />);
    expect(row('c').hidden).toBe(true);
    await user.click(screen.getByRole('button', { name: '챕터 접기 생각의 시작' }));
    for (const id of ['b', 'c', 'q']) expect(row(id).hidden).toBe(true);
    expect(row('a').hidden).toBe(false);
    expect(row('d').hidden).toBe(false);
    await user.click(screen.getByRole('button', { name: '챕터 펼치기 생각의 시작' }));
    expect(row('b').hidden).toBe(false);
    expect(row('c').hidden).toBe(true);
    await user.click(screen.getByRole('button', { name: '챕터 펼치기 작은 관찰' }));
    expect(row('c').hidden).toBe(false);
    expect(row('q').hidden).toBe(false);
  });

  it.each([false, true])('inserts and drops after the full folded subtree (filtered=%s)', async filtered => {
    const user = userEvent.setup();
    const create = vi.fn().mockResolvedValue(true), move = vi.fn().mockResolvedValue(true);
    const quotes = [citation({ id: 'q', text: '숨은 본문', author: '저자', book: '책', bookId: 'b', createdAt: 40 })];
    render(<CitationList {...baseProps} isBookView citations={filtered ? [] : quotes} allCitations={quotes} searchTerm={filtered ? '다른 검색어' : ''} chapterBlocks={blocks} collapsedDividerIds={new Set(['a'])}
      onCreateChapterBlock={create} onMoveChapterBlock={move} />);
    await user.click(within(row('a')).getByRole('button', { name: '챕터 추가' }));
    await user.type(screen.getByRole('textbox', { name: '챕터 제목' }), '새 이야기');
    await user.click(screen.getByRole('button', { name: '챕터 저장' }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ label: '새 이야기', createdAtSort: 45 }));
    dragEvent(screen.getByRole('heading', { name: '다음 이야기' }), 'dragstart', 100, 100);
    dragEvent(row('a'), 'dragover', 100, 10);
    dragEvent(row('a'), 'drop', 100, 10);
    expect(move).toHaveBeenCalledWith('b', 'd', 40.9, 0);
  });
});

it('keeps keyboard preview, save and cancel consistent for previously normalized descendants', async () => {
  const bounds = vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect()] as unknown as DOMRectList);
  const user = userEvent.setup();
  function Screen() {
    const [blocks, setBlocks] = React.useState([0, 0, 2].map((depth, i) => chapterBlock({ id: String(i), bookId: 'book', label: ['A', 'B', 'C'][i], depth, createdAtSort: i + 1 })));
    return <CitationList {...baseProps} isBookView citations={[]} chapterBlocks={blocks}
      onRenameChapterBlock={async (_book, id, label, depth) => { setBlocks(current => current.map(c => c.id === id ? { ...c, label, depth: depth ?? c.depth } : c)); return true; }} />;
  }
  const { container } = render(<Screen />);
  const parent = () => container.querySelector('[data-chapter-connection="2"]')?.getAttribute('data-chapter-parent');
  try {
    await user.click(screen.getByRole('button', { name: '챕터 제목 수정 B' }));
    const input = screen.getByRole('textbox', { name: '챕터 제목 수정' }) as HTMLInputElement;
    input.setSelectionRange(0, 0);
    await user.keyboard('{Tab}');
    await waitFor(() => expect(parent()).toBe('1'));
    expect(container.querySelector('[data-chapter-node="2"]')?.getAttribute('data-chapter-depth')).toBe('2');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(container.querySelector('[data-chapter-node="2"]')?.getAttribute('data-chapter-depth')).toBe('1'));
    expect(parent()).toBe('1');
    await user.click(screen.getByRole('button', { name: '챕터 제목 수정 B' }));
    (screen.getByRole('textbox', { name: '챕터 제목 수정' }) as HTMLInputElement).setSelectionRange(0, 0);
    await user.keyboard('{Tab}');
    await user.click(screen.getByRole('button', { name: '챕터 제목 저장' }));
    await waitFor(() => expect(screen.queryByRole('textbox', { name: '챕터 제목 수정' })).toBeNull());
    expect(parent()).toBe('1');
  } finally { bounds.mockRestore(); }
});

it('projects a new chapter with original stored levels and restores the display on cancel', async () => {
  const bounds = vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect()] as unknown as DOMRectList);
  const user = userEvent.setup();
  const blocks = [2, 2].map((depth, i) => chapterBlock({ id: `old-${i}`, bookId: 'book', label: `원래 제목 ${i}`, depth, createdAtSort: i + 10 }));
  const { container } = render(<CitationList {...baseProps} isBookView citations={[]} chapterBlocks={blocks} />);
  try {
    await user.click(screen.getByRole('button', { name: '맨 위에 챕터 추가' }));
    const draftId = screen.getByRole('textbox', { name: '챕터 제목' }).closest('form')!.dataset.chapterNode;
    await waitFor(() => expect(container.querySelector('[data-chapter-connection="old-0"]')?.getAttribute('data-chapter-parent')).toBe(draftId));
    expect(container.querySelector('[data-chapter-node="old-1"]')?.getAttribute('data-chapter-depth')).toBe('2');
    await user.click(screen.getByRole('button', { name: '챕터 취소' }));
    await waitFor(() => expect(container.querySelector('[data-chapter-connection="old-0"]')).toBeNull());
    expect(container.querySelector('[data-chapter-node="old-1"]')?.getAttribute('data-chapter-depth')).toBe('1');
  } finally { bounds.mockRestore(); }
});

it('uses the full folded boundary at the last separator with filtered-out trailing citations', async () => {
  const user = userEvent.setup(), create = vi.fn().mockResolvedValue(true);
  const quote = citation({ id: 'q', text: '검색으로 숨은 마지막 인용문', author: '저자', book: '책', bookId: 'book', createdAt: 40 });
  render(<CitationList {...baseProps} isBookView searchTerm="다른 검색어" citations={[]} allCitations={[quote]}
    chapterBlocks={[chapterBlock({ id: 'a', bookId: 'book', label: '마지막 장', createdAtSort: 10 })]}
    collapsedDividerIds={new Set(['a'])} onCreateChapterBlock={create} />);
  await user.click(screen.getByRole('button', { name: '챕터 추가' }));
  await user.type(screen.getByRole('textbox', { name: '챕터 제목' }), '새 장');
  await user.click(screen.getByRole('button', { name: '챕터 저장' }));
  expect(create).toHaveBeenCalledWith(expect.objectContaining({ label: '새 장', createdAtSort: 40.9 }));
});

it('accepts the displayed drop marker without reinterpreting its enclosing row', () => {
  const move = vi.fn().mockResolvedValue(true);
  const q = citation({ id: 'q', text: 'Drop target', author: 'A', book: 'B', bookId: 'book', createdAt: 2 });
  render(<CitationList {...baseProps} citations={[q]} isBookView onMoveChapterBlock={move} chapterBlocks={[
    chapterBlock({ id: 'parent', bookId: 'book', label: 'Parent', createdAtSort: 1, depth: 0 }),
    chapterBlock({ id: 'moved', bookId: 'book', label: 'Moved', createdAtSort: 3, depth: 0 }),
  ]} />);
  dragEvent(screen.getByRole('heading', { name: 'Moved' }), 'dragstart', 100, 100);
  dragEvent(document.querySelector('[data-book-row="q"]')!, 'dragover', 116, -1);
  const marker = document.querySelector('[data-chapter-node="chapter-drop-preview"]')!;
  expect(marker.getAttribute('data-chapter-depth')).toBe('1');
  dragEvent(marker, 'drop', 100, 100);
  expect(move).toHaveBeenCalledOnce();
  expect(move).toHaveBeenCalledWith('book', 'moved', 1.5, 1);
});

describe('CitationList citation movement', () => {
  const blocks = [
    chapterBlock({ id: 'root', bookId: 'book-1', label: 'First', createdAtSort: 10, depth: 0 }),
    chapterBlock({ id: 'child', bookId: 'book-1', label: 'Child', createdAtSort: 20, depth: 1 }),
    chapterBlock({ id: 'next', bookId: 'book-1', label: 'Second', createdAtSort: 40, depth: 0 }),
  ];
  const quotes = [
    citation({ id: 'resident', text: 'Resident', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 30 }),
    citation({ id: 'source', text: 'Move this sentence', author: 'Author', book: 'Book', bookId: 'book-1', createdAt: 50, page: '42', notes: [{ id: 'note', content: 'Keep note', createdAt: 50 }] }),
  ];
  const dragToChild = () => {
    dragEvent(screen.getByRole('button', { name: '인용문 이동: Move this sentence' }), 'dragstart', 10, 0);
    dragEvent(document.querySelector('[data-book-row="child"]')!, 'dragover', 10, -1);
    const marker = document.querySelector('[data-citation-drop]')!;
    expect(marker).toBeTruthy();
    expect(marker.hasAttribute('data-chapter-node')).toBe(false);
    expect(screen.getByRole('status').textContent).toContain('Child 안으로 인용문 이동');
    dragEvent(marker, 'drop', 10, -1);
  };
  it('moves into a folded child via the displayed marker, preserves quote data and reveals it only after success', async () => {
    const move = vi.fn();
    function Host() {
      const [items, setItems] = React.useState(quotes);
      const [folds, setFolds] = React.useState(new Set(['child']));
      return <CitationList {...baseProps} citations={items} chapterBlocks={blocks} isBookView
        collapsedDividerIds={folds} onToggleDivider={id => setFolds(old => { const next = new Set(old); next.delete(id); return next; })}
        onMoveCitation={async (book, id, position) => {
          move(book, id, position);
          setItems(old => old.map(item => item.id === id ? { ...item, createdAtSort: position } : item));
          return true;
        }} />;
    }
    render(<Host />);
    dragToChild();
    expect(move).toHaveBeenCalledExactlyOnceWith('book-1', 'source', 25);
    await waitFor(() => expect(screen.getByRole('button', { name: '챕터 접기 Child' })).toBeTruthy());
    expect(Array.from(document.querySelectorAll('[data-book-row]')).map(e => e.getAttribute('data-book-row'))).toEqual(['root', 'child', 'source', 'resident', 'next']);
    expect(screen.getByText('42쪽')).toBeTruthy();
    expect(quotes[1].createdAt).toBe(50);
    expect(quotes[1].notes[0].content).toBe('Keep note');
    fireEvent.mouseDown(screen.getByText('Move this sentence'), { button: 0 });
    expect(screen.getByText('Move this sentence').closest('[draggable="true"]')).toBeNull();
  });
  it('leaves order and fold unchanged after a failed move and allows a retry', async () => {
    const move = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const toggle = vi.fn();
    render(<CitationList {...baseProps} citations={quotes} chapterBlocks={blocks} isBookView
      collapsedDividerIds={new Set(['child'])} onToggleDivider={toggle} onMoveCitation={move} />);
    dragToChild();
    await screen.findByRole('alert');
    expect(toggle).not.toHaveBeenCalled();
    expect(Array.from(document.querySelectorAll('[data-book-row]')).at(-1)?.getAttribute('data-book-row')).toBe('source');
    dragToChild();
    await waitFor(() => expect(toggle).toHaveBeenCalledWith('child'));
    expect(move).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('uses saved citation positions for keyboard moves and subsequent chapter moves', async () => {
    const user = userEvent.setup();
    const move = vi.fn().mockResolvedValue(true);
    const moveChapter = vi.fn().mockResolvedValue(true);
    render(<CitationList {...baseProps} citations={[quotes[0], { ...quotes[1], createdAtSort: 25 }]} chapterBlocks={blocks} isBookView onMoveCitation={move} onMoveChapterBlock={moveChapter} />);
    screen.getByRole('button', { name: '인용문 이동: Move this sentence' }).focus();
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}');
    expect(move).toHaveBeenCalledWith('book-1', 'source', 35);
    dragEvent(screen.getByRole('heading', { name: 'Second' }), 'dragstart', 0, 0);
    dragEvent(document.querySelector('[data-book-row="source"]')!, 'dragover', 0, 10);
    dragEvent(document.querySelector('[data-book-row="source"]')!, 'drop', 0, 10);
    expect(moveChapter).toHaveBeenCalledWith('book-1', 'next', 27.5, 0);
  });
  it('does not refold a destination manually opened while the move is saving', async () => {
    let resolve!: (value: boolean) => void;
    const move = vi.fn(() => new Promise<boolean>(done => { resolve = done; }));
    function Host() {
      const [folds, setFolds] = React.useState(new Set(['child']));
      return <CitationList {...baseProps} citations={quotes} chapterBlocks={blocks} isBookView
        collapsedDividerIds={folds} onToggleDivider={id => setFolds(old => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; })}
        onMoveCitation={move} />;
    }
    render(<Host />);
    dragToChild();
    await userEvent.click(screen.getByRole('button', { name: '챕터 펼치기 Child' }));
    resolve(true);
    await waitFor(() => expect(screen.getByRole('button', { name: '챕터 접기 Child' })).toBeTruthy());
    await new Promise(done => setTimeout(done, 0));
    expect(screen.getByRole('button', { name: '챕터 접기 Child' })).toBeTruthy();
  });
  it('does not expose handles for unsaved citations or outside book view', () => {
    const view = render(<CitationList {...baseProps} citations={[{ ...quotes[1], saveStatus: 'saving' }]} chapterBlocks={blocks} isBookView onMoveCitation={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^인용문 이동:/ })).toBeNull();
    view.rerender(<CitationList {...baseProps} citations={quotes} onMoveCitation={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /^인용문 이동:/ })).toBeNull();
  });
});

it('starts citation moves from blank row space without making text or controls drag origins', () => {
  const move = vi.fn().mockResolvedValue(true);
  render(<CitationList {...baseProps} isBookView onMoveCitation={move}
    citations={[citation({ id: 'space-source', text: 'Select this text', author: 'A', book: 'B', bookId: 'book-1', createdAt: 30 })]}
    chapterBlocks={[chapterBlock({ id: 'destination', label: 'Destination', bookId: 'book-1', createdAtSort: 10 })]} />);
  const row = document.querySelector('[data-book-row="space-source"] [data-row-content]') as HTMLDivElement;
  fireEvent.mouseDown(row, { button: 0 });
  expect(row.draggable).toBe(true);
  dragEvent(row, 'dragstart', 0, 10);
  const target = document.querySelector('[data-book-row="destination"]')!;
  dragEvent(target, 'dragover', 0, 10);
  dragEvent(document.querySelector('[data-citation-drop]')!, 'drop', 0, 10);
  expect(move).toHaveBeenCalledExactlyOnceWith('book-1', 'space-source', 10.9);
  fireEvent.mouseDown(screen.getByText('Select this text'), { button: 0 });
  expect(row.draggable).toBe(false);
  fireEvent.mouseDown(screen.getByRole('checkbox'), { button: 0 });
  expect(row.draggable).toBe(false);
  fireEvent.mouseDown(row, { button: 2 });
  expect(row.draggable).toBe(false);
});

it('indents each citation with its owning chapter, including filtered book contents', () => {
  const blocks = [
    chapterBlock({ id: 'root', label: 'Root', bookId: 'book-1', createdAtSort: 10, depth: 0 }),
    chapterBlock({ id: 'child', label: 'Child', bookId: 'book-1', createdAtSort: 20, depth: 1 }),
    chapterBlock({ id: 'deep', label: 'Deep', bookId: 'book-1', createdAtSort: 30, depth: 2 }),
    chapterBlock({ id: 'next', label: 'Next', bookId: 'book-1', createdAtSort: 40, depth: 0 }),
  ];
  const quotes = [5, 25, 35, 45].map(n => citation({ id: `q-${n}`, text: `Quote ${n}`, author: 'A', book: 'B', bookId: 'book-1', createdAt: n }));
  const view = render(<CitationList {...baseProps} citations={quotes} chapterBlocks={blocks} isBookView />);
  const depth = (id: string) => document.querySelector(`[data-book-row="${id}"] [data-citation-depth]`);
  expect(depth('q-5')?.getAttribute('data-citation-depth')).toBe('0');
  expect(depth('q-25')?.getAttribute('data-citation-depth')).toBe('1');
  expect(depth('q-25')?.getAttribute('data-citation-owner')).toBe('child');
  expect(depth('q-35')?.getAttribute('data-citation-depth')).toBe('2');
  expect(depth('q-45')?.getAttribute('data-citation-depth')).toBe('0');
  view.rerender(<CitationList {...baseProps} citations={[quotes[2]]} allCitations={quotes} chapterBlocks={blocks} isBookView searchTerm="35" />);
  expect(depth('q-35')?.getAttribute('data-citation-owner')).toBe('deep');
  expect(depth('q-35')?.getAttribute('data-citation-depth')).toBe('2');
});
