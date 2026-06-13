import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../types';
import { CitationList } from './CitationList';

const citation = (id: string, text: string): Citation => ({
  id,
  text,
  author: 'Author A',
  book: 'Book A',
  notes: [],
  tags: [],
  createdAt: 0,
});

const baseProps = {
  projects: [],
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
  onRetryCitationSave: vi.fn(),
};

beforeEach(() => {
  let isDesktopWidth = false;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('1024px') ? isDesktopWidth : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  Object.defineProperty(window, '__setDesktopWidthForCitationTest', {
    configurable: true,
    value: (nextValue: boolean) => {
      isDesktopWidth = nextValue;
    },
  });

  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid === 'citation-text') {
      if (this.textContent?.includes('Breakpoint quote')) {
        return 70;
      }

      return (this.textContent?.length ?? 0) > 200 ? 120 : 40;
    }

    return 40;
  });

  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (this: HTMLElement) {
    if (this.dataset.testid === 'citation-text') {
      if (this.textContent?.includes('Breakpoint quote') && isDesktopWidth) {
        return 80;
      }

      return 40;
    }

    return 40;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as typeof window & { __setDesktopWidthForCitationTest?: unknown }).__setDesktopWidthForCitationTest;
});

describe('CitationList expand all', () => {
  it('expands and collapses every long citation from one control', async () => {
    const user = userEvent.setup();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation('citation-1', 'Long quote '.repeat(80)),
          citation('citation-2', 'Another long quote '.repeat(80)),
        ]}
      />
    );

    expect(screen.getAllByTestId('citation-text').every((node) => node.className.includes('line-clamp-2'))).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Toggle all citations' }));

    expect(screen.getAllByTestId('citation-text').every((node) => !node.className.includes('line-clamp-2'))).toBe(true);
    expect(screen.getByText('Collapse all')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Toggle all citations' }));

    expect(screen.getAllByTestId('citation-text').every((node) => node.className.includes('line-clamp-2'))).toBe(true);
  });

  it('hides the bulk control when no citation has a More action', () => {
    render(
      <CitationList
        {...baseProps}
        citations={[
          citation('citation-1', 'Short quote.'),
          citation('citation-2', 'Another short quote.'),
        ]}
      />
    );

    expect(screen.queryByRole('button', { name: 'Toggle all citations' })).toBeNull();
  });

  it('does not create a per-card Less action for short citations during bulk expansion', async () => {
    const user = userEvent.setup();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation('citation-1', 'Long quote '.repeat(80)),
          citation('citation-2', 'Short quote.'),
        ]}
      />
    );

    await user.click(await screen.findByRole('button', { name: 'Toggle all citations' }));

    expect(screen.getAllByRole('button', { name: 'Less' })).toHaveLength(1);
  });

  it('keeps the bulk control synchronized with individual More and Less actions', async () => {
    const user = userEvent.setup();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation('citation-1', 'Long quote '.repeat(80)),
          citation('citation-2', 'Another long quote '.repeat(80)),
        ]}
      />
    );

    await user.click((await screen.findAllByRole('button', { name: 'More' }))[0]);

    expect(screen.getByRole('button', { name: 'Toggle all citations' }).getAttribute('aria-pressed')).toBe('false');
    expect(screen.getAllByRole('button', { name: 'Less' })[0].getAttribute('aria-expanded')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Toggle all citations' }));

    expect(screen.getByRole('button', { name: 'Toggle all citations' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getAllByRole('button', { name: 'Less' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Less' })[0].getAttribute('aria-controls')).toBe('citation-text-citation-1');

    await user.click(screen.getAllByRole('button', { name: 'Less' })[0]);

    expect(screen.getByRole('button', { name: 'Toggle all citations' }).getAttribute('aria-pressed')).toBe('false');

    await user.click(screen.getByRole('button', { name: 'Toggle all citations' }));
    await user.click(screen.getByRole('button', { name: 'Toggle all citations' }));

    expect(screen.getAllByRole('button', { name: 'More' })).toHaveLength(2);
  });

  it('keeps expanded text expanded after an edit session is canceled', async () => {
    const user = userEvent.setup();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation('citation-1', 'Long quote '.repeat(80)),
        ]}
      />
    );

    await user.click(await screen.findByRole('button', { name: 'Toggle all citations' }));
    expect(screen.getByTestId('citation-text').className).not.toContain('line-clamp-2');

    await user.dblClick(screen.getByTestId('citation-text'));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByTestId('citation-text').className).not.toContain('line-clamp-2');
    expect(screen.getByRole('button', { name: 'Toggle all citations' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('recalculates overflow after a breakpoint resize while text is expanded', async () => {
    const user = userEvent.setup();

    render(
      <CitationList
        {...baseProps}
        citations={[
          citation('citation-1', 'Breakpoint quote '.repeat(20)),
        ]}
      />
    );

    await user.click(await screen.findByRole('button', { name: 'Toggle all citations' }));
    expect(screen.getByRole('button', { name: 'Less' })).toBeTruthy();

    (window as typeof window & { __setDesktopWidthForCitationTest: (nextValue: boolean) => void }).__setDesktopWidthForCitationTest(true);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Less' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Toggle all citations' })).toBeNull();
    });
  });
});
