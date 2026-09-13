import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCitationEntryController } from './useCitationEntryController';

describe('book composer drafts during saving', () => {
  it.each([true, false])('preserves book B and settles only A when A success=%s', async ok => {
    let finish!: (value: { ok: boolean }) => void;
    const pending = new Promise<{ ok: boolean }>(resolve => { finish = resolve; });
    const sources = { A: { author: 'A', book: 'A', bookId: 'A' }, B: { author: 'B', book: 'B', bookId: 'B' } };
    const { result, rerender } = renderHook(({ book }) => useCitationEntryController({
      username: 'User', draftScope: book, prefillData: sources[book as 'A' | 'B'], onAddCitation: () => pending,
    }), { initialProps: { book: 'A' } });
    act(() => result.current.updateValue('text', 'A chapter draft'));
    let save!: Promise<boolean>;
    act(() => { save = result.current.handleSubmit(); });
    rerender({ book: 'B' });
    expect(result.current.values).toMatchObject({ text: '', author: 'B', bookId: 'B' });
    await act(async () => { finish({ ok }); await save; });
    expect(result.current.values).toMatchObject({ text: '', author: 'B', bookId: 'B' });
    act(() => result.current.updateValue('text', 'B quote'));
    rerender({ book: 'A' });
    expect(result.current.values.text).toBe(ok ? '' : 'A chapter draft');
    rerender({ book: 'B' });
    expect(result.current.values).toMatchObject({ text: 'B quote', bookId: 'B' });
  });
});
