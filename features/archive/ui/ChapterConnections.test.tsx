import React, { useRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ChapterConnections } from './ChapterConnections';

afterEach(() => vi.restoreAllMocks());

it('draws preloaded chapters on the first mount after the parent ref attaches', async () => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect()] as unknown as DOMRectList);
  function Screen() {
    const containerRef = useRef<HTMLDivElement>(null);
    return <div ref={containerRef}>
      <ChapterConnections containerRef={containerRef} revision="ready" />
      <div data-chapter-node="parent" data-chapter-depth="0">부모</div>
      <div data-chapter-node="child" data-chapter-depth="1">하위</div>
    </div>;
  }
  const { container } = render(<Screen />);
  await waitFor(() => expect(container.querySelector('[data-chapter-connection="child"]')?.getAttribute('data-chapter-parent')).toBe('parent'));
});

it('uses projected saved levels for preview lines and restores original lines on cancel', async () => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect()] as unknown as DOMRectList);
  function Screen({ preview }: { preview: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    return <div ref={containerRef}>
      <ChapterConnections containerRef={containerRef} revision={String(preview)} excludedId={preview ? 'moved' : null}
        depthOverrides={preview ? new Map([['a', 1], ['b', 2]]) : undefined} />
      {preview && <div data-chapter-node="chapter-drop-preview" data-chapter-depth="0" />}
      <div data-chapter-node="a" data-chapter-depth="0" />
      <div data-chapter-node="b" data-chapter-depth="1" />
      <div data-chapter-node="moved" data-chapter-depth="0" />
    </div>;
  }
  const { container, rerender } = render(<Screen preview />);
  await waitFor(() => expect(container.querySelector('[data-chapter-connection="a"]')?.getAttribute('data-chapter-parent')).toBe('chapter-drop-preview'));
  expect(container.querySelector('[data-chapter-connection="b"]')?.getAttribute('data-chapter-parent')).toBe('a');
  expect(container.querySelector('[data-chapter-connection="moved"]')).toBeNull();
  rerender(<Screen preview={false} />);
  await waitFor(() => expect(container.querySelector('[data-chapter-connection="a"]')).toBeNull());
  expect(container.querySelector('[data-chapter-connection="b"]')?.getAttribute('data-chapter-parent')).toBe('a');
});

it('connects siblings to one parent rail while giving the grandchild its own parent', async () => {
  const rows = [{ id: 'root', depth: 0 }, { id: 'first', depth: 1 }, { id: 'grandchild', depth: 2 }, { id: 'second', depth: 1 }, { id: 'next', depth: 0 }];
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect()] as unknown as DOMRectList);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const index = rows.findIndex(row => row.id === this.dataset.chapterNode);
    return index < 0 ? new DOMRect(0, 0, 600, 500) : new DOMRect(rows[index].depth * 32, index * 80, 300, 44);
  });
  function Screen() {
    const ref = useRef<HTMLDivElement>(null);
    return <div ref={ref}><ChapterConnections containerRef={ref} revision="siblings" />
      {rows.map(row => <div key={row.id} data-chapter-node={row.id} data-chapter-depth={row.depth} />)}
    </div>;
  }
  const { container } = render(<Screen />);
  await waitFor(() => expect(container.querySelectorAll('[data-chapter-trunk]').length).toBe(2));
  expect(container.querySelectorAll('[data-chapter-trunk="root"]').length).toBe(1);
  expect(container.querySelector('[data-chapter-connection="first"]')?.getAttribute('data-chapter-parent')).toBe('root');
  expect(container.querySelector('[data-chapter-connection="second"]')?.getAttribute('data-chapter-parent')).toBe('root');
  expect(container.querySelector('[data-chapter-connection="grandchild"]')?.getAttribute('data-chapter-parent')).toBe('first');
  for (const path of container.querySelectorAll('[data-chapter-connection]')) {
    expect(path.getAttribute('d')?.match(/Q/g)?.length).toBe(1);
    expect(path.getAttribute('d')).not.toContain('H');
  }
});
