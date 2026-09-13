import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCitationEntryController } from './useCitationEntryController';
import { BookComposerDraftStore } from './bookComposerDrafts';

const prefill = { author: 'Author', book: 'Book', bookId: 'book' };

describe('session-owned book composer', () => {
  it.each([true, false])('keeps draft, location and lock across actual unmount until success=%s settles', async ok => {
    const drafts = new BookComposerDraftStore();
    drafts.patch('book', { chapterMode: true, insertion: { afterId: 'chapter', depth: 1 } });
    let finish!: (result: { ok: boolean }) => void;
    let calls = 0;
    const onAddCitation = () => { calls++; return new Promise<{ok:boolean}>(resolve => { finish=resolve; }); };
    const useComposer = () => useCitationEntryController({ username: 'User', draftScope: 'book', draftStore: drafts, prefillData: prefill, onAddCitation });
    const first = renderHook(useComposer);
    act(() => first.result.current.updateValue('text', 'Keep this chapter'));
    let saving!: Promise<boolean>;
    act(() => { saving = first.result.current.handleSubmit(); });
    first.unmount();
    const second = renderHook(useComposer);
    expect(second.result.current.values.text).toBe('Keep this chapter');
    expect(second.result.current.isSubmitting).toBe(true);
    expect(drafts.get('book')).toMatchObject({ chapterMode: true, insertion: { afterId: 'chapter', depth: 1 } });
    await act(async () => { expect(await second.result.current.handleSubmit()).toBe(false); });
    expect(calls).toBe(1);
    await act(async () => { finish({ok}); await saving; });
    expect(second.result.current.isSubmitting).toBe(false);
    expect(second.result.current.values.text).toBe(ok ? '' : 'Keep this chapter');
    second.unmount();
  });
});
