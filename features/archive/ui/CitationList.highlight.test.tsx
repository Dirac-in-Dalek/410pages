import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Citation } from '../../../types';
import { CitationList } from './CitationList';
const citation: Citation = { id:'citation-1',kind:'sentence',text:'드래그해서 강조할 문장',author:'저자',book:'책',notes:[],tags:[],createdAt:1 };
const renderList = (onUpdateCitation = vi.fn(), onPassageNoteCitationChange = vi.fn(), value = citation) => render(<CitationList
  citations={[value]} projects={[]} username="독자" loading={false} searchTerm="" selectedIds={new Set()} isBookView
  onToggleSelect={vi.fn()} onAddNote={vi.fn()} onUpdateNote={vi.fn()} onDeleteNote={vi.fn()} onDeleteCitation={vi.fn()}
  onUpdateCitation={onUpdateCitation} onRetryCitationSave={vi.fn()} onPassageNoteCitationChange={onPassageNoteCitationChange} />);
function selectText() {
  const text = screen.getByTestId('book-citation-text-citation-1');
  const node = text.querySelector('mark,span')!.firstChild!;
  const range = document.createRange(); range.setStart(node,0);range.setEnd(node,4);
  window.getSelection()?.removeAllRanges();window.getSelection()?.addRange(range);
  fireEvent.mouseUp(text);fireEvent.click(text.parentElement!);
  return text;
}
describe('book citation selection toolbar', () => {
  it('opens a toolbar without saving or opening passage notes, then applies highlight', async () => {
    const update=vi.fn();const open=vi.fn();renderList(update,open);selectText();
    expect(update).not.toHaveBeenCalled();expect(open).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'하이라이트'}));
    await waitFor(()=>expect(update).toHaveBeenCalledWith(citation.id,{textFormats:[{start:0,end:4,highlight:true}],highlights:[{id:'format-0-4',start:0,end:4,color:'yellow'}]},citation.text));
    expect(open).not.toHaveBeenCalled();
  });
  it('selects a legacy highlight and removes it through the shared toolbar', async () => {
    const update=vi.fn();renderList(update,vi.fn(),{...citation,highlights:[{id:'old',start:0,end:4}]});selectText();
    const button=screen.getByRole('button',{name:'하이라이트'});expect(button.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button);
    await waitFor(()=>expect(update).toHaveBeenCalledWith(citation.id,{textFormats:[],highlights:[]},citation.text));
  });
  it('rolls back a failed format save without changing the selected text', async () => {
    renderList(vi.fn().mockResolvedValue(false));const root=selectText();
    fireEvent.click(screen.getByRole('button',{name:'하이라이트'}));
    await waitFor(()=>expect(screen.getByText('저장 실패 · 다시 시도하세요')).toBeTruthy());
    expect(root.querySelector('mark')).toBeNull();expect(root.textContent).toBe(citation.text);
  });
  it('suppresses passage opening on a drag while a citation is still being saved', () => {
    const update=vi.fn();const open=vi.fn();renderList(update,open,{...citation,saveStatus:'saving'});selectText();
    expect(open).not.toHaveBeenCalled();expect(update).not.toHaveBeenCalled();expect(screen.queryByRole('toolbar')).toBeNull();
  });
});
