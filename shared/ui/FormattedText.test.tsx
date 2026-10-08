import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FormattedText } from './FormattedText';
function select(start=0,end=4) {
  const root=screen.getByTestId('formatted');const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const range=document.createRange();let cursor=0;let begun=false;
  while(walker.nextNode()){const node=walker.currentNode;const length=node.textContent!.length;if(!begun&&start<=cursor+length){range.setStart(node,start-cursor);begun=true;}if(end<=cursor+length){range.setEnd(node,end-cursor);break;}cursor+=length;}
  window.getSelection()?.removeAllRanges();window.getSelection()?.addRange(range);fireEvent.mouseUp(root);return root;
}
describe('shared selection formatting',()=>{
  it('retains native selection while combining flags and stepping relative size',async()=>{
    const save=vi.fn().mockResolvedValue(true);render(<FormattedText text="abcd efgh" testId="formatted" onSave={save}/>);select();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'굵게'}));
    fireEvent.click(screen.getByRole('button',{name:'기울임'}));
    fireEvent.click(screen.getByRole('button',{name:'글자 크기 1pt 키우기'}));
    fireEvent.click(screen.getByRole('button',{name:'글자 크기 1pt 키우기'}));
    await waitFor(()=>expect(save).toHaveBeenCalledTimes(4));
    expect(save).toHaveBeenLastCalledWith([{start:0,end:4,bold:true,italic:true,fontSizeOffset:2}]);
    expect(window.getSelection()?.toString()).toBe('abcd');
  });
  it('serializes quick changes and rolls back to the last successful save',async()=>{
    let finish!:(value:boolean)=>void;const save=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValueOnce(false);
    render(<FormattedText text="abcd efgh" testId="formatted" onSave={save}/>);select();
    fireEvent.click(screen.getByRole('button',{name:'굵게'}));fireEvent.click(screen.getByRole('button',{name:'밑줄'}));
    await act(async()=>{});expect(save).toHaveBeenCalledTimes(1);
    await act(async()=>finish(true));await waitFor(()=>expect(save).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button',{name:'굵게'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button',{name:'밑줄'}).getAttribute('aria-pressed')).toBe('false');
  });
  it('does not save on escape, whitespace, outside selection or a read-only surface',()=>{
    const save=vi.fn();const {rerender}=render(<FormattedText text="abcd efgh" testId="formatted" onSave={save}/>);select();
    fireEvent.keyDown(document,{key:'Escape'});expect(screen.queryByRole('toolbar')).toBeNull();select(4,5);expect(screen.queryByRole('toolbar')).toBeNull();
    rerender(<FormattedText text="abcd efgh" testId="formatted"/>);select();expect(screen.queryByRole('toolbar')).toBeNull();expect(save).not.toHaveBeenCalled();
  });
});
