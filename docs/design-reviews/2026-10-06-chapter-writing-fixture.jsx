import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { ArchiveScreen } from '../../features/archive/ui/ArchiveScreen';
import { BookComposerDraftStore } from '../../features/citation-entry/logic/bookComposerDrafts';
import { sortBookViewItems, toBookViewItems } from '../../lib/bookViewItems';
import { getChapterDropPlacement } from '../../features/archive/logic/chapterHierarchy';
import { resolveBookInsertion } from '../../features/archive/logic/bookInsertion';

const testMode=new URLSearchParams(parent.location.search).has('qa');
const bookId='local-writing-review',noop=()=>{},base={author:'비교용 저자',book:'순서대로 기록하기',bookId,kind:'sentence',notes:[],tags:[]};
const prefill={author:base.author,book:base.book,bookId};
const selectedFilter={type:'book',value:base.book,author:base.author,bookId};
const chapter=(id,label,depth,createdAtSort)=>({id,label,depth,createdAtSort,createdAt:createdAtSort,bookId});
const citation=(id,text,createdAtSort,page='67')=>({...base,id,text,createdAtSort,createdAt:createdAtSort,page});
function seed(scenario){
  let chapters=[chapter('root','1장 · 기계번역과 언어 학습',0,10)],citations=[citation('q-root','기계번역의 도움: 단어, 표현, 문장구조를 점검하며 새로운 언어 표현에 주목한다.',20)];
  for(let i=1;i<=4;i++)citations.push(citation('q-root-'+i,'번역기를 활용하며 자기 문장의 구조와 표현을 비교하고 수정한다. 기록한 내용을 다시 읽으며 이해한 점과 남은 질문을 살펴본다.',20+i*2));
  let insertion={afterId:'q-root-4',depth:0},chapterMode=true;
  if(scenario==='child'||scenario==='child-chapter'){chapters.push(chapter('child','1.1 · 번역기의 장점과 한계',1,30));citations.push(citation('q-child','소제목 아래에서는 이 문장과 다음 문장이 같은 시작선에서 이어진다.',40));insertion={afterId:'q-child',depth:1};chapterMode=false;}
  if(scenario==='child-chapter')chapterMode=true;
  if(scenario==='deep'){chapters.push(chapter('child','1.1 · 번역기의 장점과 한계',1,30),chapter('deep','1.1.1 · 자기 오류 고치기',2,50));citations.push(citation('q-child','소제목 아래에 저장된 인용문입니다.',40),citation('q-deep','이 문장은 큰 제목과 두 소제목의 하위에 놓이며 마지막 소제목과 같은 시작선에 정렬됩니다.',60));insertion={afterId:'q-deep',depth:2};chapterMode=false;}
  if(scenario==='empty'){chapters=[];citations=[];insertion=null;}
  return {chapters,citations,insertion,chapterMode};
}
function Fixture(){
  const baseline=new URLSearchParams(location.search).get('variant')==='current';
  const store=useMemo(()=>new BookComposerDraftStore(),[]),host=useRef(null),serial=useRef(100),scenarioRef=useRef('root');
  const [chapters,setChapters]=useState([]),[citations,setCitations]=useState([]),[guide,setGuide]=useState(null),[revision,setRevision]=useState(0);
  const [config,setConfig]=useState({matched:true,boundary:'hide-root-out',hideCopy:true,guides:true,theme:'day',scenario:'root',width:1024});
  const desktop=config.width>=1024;
  const draft=useSyncExternalStore(store.subscribe,()=>store.get(bookId));
  const items=useMemo(()=>sortBookViewItems(toBookViewItems(citations,chapters),'date','asc'),[citations,chapters]);
  const target=useMemo(()=>resolveBookInsertion(items,draft?.insertion??{depth:0}),[items,draft?.insertion]);
  const placement=target?getChapterDropPlacement(chapters,'preview',target.position,draft?.insertion?.depth??target.previousDepth??0):null;
  const depth=draft?.chapterMode?placement?.depth??0:target?.previousDepth??0;
  function reset(scenario){scenarioRef.current=scenario;const next=seed(scenario);setChapters(next.chapters);setCitations(next.citations);store.patch(bookId,{values:{text:'',author:base.author,book:base.book,page:''},insertion:next.insertion,chapterMode:next.chapterMode,saving:false,error:''});setRevision(n=>n+1);}
  useEffect(()=>{reset('root');const receive=event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='410pages-writing-config')return;const next=event.data.config;if(!next||!['day','night'].includes(next.theme)||!['hide-root-out','disable'].includes(next.boundary)||typeof next.matched!=='boolean'||typeof next.hideCopy!=='boolean'||typeof next.guides!=='boolean')return;setConfig(next);if(event.data.reset||next.scenario!==scenarioRef.current)reset(next.scenario);};window.addEventListener('message',receive);parent.postMessage({type:'410pages-writing-ready',variant:baseline?'current':'proposed'},location.origin);return()=>window.removeEventListener('message',receive);},[]);
  useEffect(()=>{document.documentElement.dataset.theme=config.theme;document.documentElement.classList.toggle('dark',config.theme==='night');},[config.theme]);
  useLayoutEffect(()=>{
    const root=host.current;if(!root)return;let frame;
    const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const composer=root.querySelector('.book-citation-composer'),textarea=composer?.querySelector('textarea'),scroll=root.querySelector('[data-archive-scroll]');
      if(!composer||!textarea)return;
      const rows=[...root.querySelectorAll('.book-row-content[data-row-kind=sentence]')];
      const row=rows.find(e=>Number(e.dataset.citationDepth)===depth)??rows.at(-1);
      const adjustment=scroll.offsetWidth-scroll.clientWidth;
      const r=e=>{if(!e)return null;const b=e.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width};};
      const text=row?.querySelector('[data-passage-note-trigger].px-1>span:first-child');
      if(testMode&&root.dataset.resizeTransition==='running')root.dataset.resizeIntermediateWidth=String(composer.getBoundingClientRect().width);
      const metrics={variant:baseline?'current':'proposed',depth,mode:draft?.chapterMode?'chapter':'citation',chapterCount:chapters.length,citationCount:citations.length,anchor:draft?.insertion?.afterId??null,previousDepth:target?.previousDepth??null,maxDepth:(target?.previousDepth??-1)+1,composer:r(composer),textarea:r(textarea),citationRow:r(row),citationText:r(text),referenceDepth:row?Number(row.dataset.citationDepth):null,scrollbar:scroll.offsetWidth-scroll.clientWidth,adjustment};
      parent.postMessage({type:'410pages-writing-metrics',metrics,snapshot:baseline?null:{html:composer.outerHTML,text:textarea.value,kind:draft?.chapterMode?'chapter':'citation',width:composer.parentElement.getBoundingClientRect().width+24,indentStep:getComputedStyle(root.querySelector('.book-writing-surface')).getPropertyValue('--chapter-indent-step'),indentLimit:getComputedStyle(root.querySelector('.book-writing-surface')).getPropertyValue('--chapter-indent-limit'),height:composer.offsetHeight+24,marginInlineStart:getComputedStyle(composer).marginInlineStart,theme:config.theme,adjustment,matched:config.matched,hideCopy:config.hideCopy}},location.origin);
      const inputBox=textarea.getBoundingClientRect(),referenceBox=text?.getBoundingClientRect();
      const nextGuide=config.guides&&referenceBox&&Number(row?.dataset.citationDepth)===depth?{left:inputBox.left,right:inputBox.right,top:Math.max(0,referenceBox.top),bottom:inputBox.bottom}:null;
      setGuide(previous=>JSON.stringify(previous)===JSON.stringify(nextGuide)?previous:nextGuide);
    });};
    const observer=new ResizeObserver(measure);observer.observe(root);const text=root.querySelector('textarea');if(text)observer.observe(text);const scroll=root.querySelector('[data-archive-scroll]');if(scroll){observer.observe(scroll);scroll.addEventListener('scroll',measure);}measure();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);scroll?.removeEventListener('scroll',measure);};
  },[baseline,config,depth,draft,chapters,citations,revision]);
  const makeChapter=async data=>{const item={...data,id:'chapter-'+serial.current++,createdAt:Date.now()};setChapters(old=>[...old,item]);return item;};
  const makeCitation=async data=>{const item={...base,...data,id:'citation-'+serial.current++,createdAt:Date.now(),notes:[]};setCitations(old=>[...old,item]);return {ok:true,citationId:item.id};};
  function trackResize(event,phase){if(!testMode||!event.target.classList.contains('book-citation-composer')||!event.propertyName.startsWith('margin'))return;event.currentTarget.dataset.resizeTransition=phase;if(phase==='completed')event.currentTarget.dataset.resizeDuration=String(event.elapsedTime);}
  return <div onTransitionRun={event=>trackResize(event,'running')} onTransitionEnd={event=>trackResize(event,'completed')} ref={host} className="fixture" data-proposed={!baseline} data-desktop={desktop} data-matched={!baseline&&config.matched} data-copy={baseline||!config.hideCopy}>
    <ArchiveScreen composerDrafts={store} isMobileApp={!desktop} title="순서대로 기록하기" showEditor username="Preview" editorPrefill={prefill} isBookView authorName={base.author}
      sortField="date" dateDirection="asc" pageDirection="asc" onAddCitation={makeCitation} onCreateChapterBlock={makeChapter}
      citations={citations} allCitations={citations} chapterBlocks={chapters} projects={[]} loading={false} loadError={null} searchTerm="" selectedIds={new Set()} selectedFilter={selectedFilter} isCopying={false}
      onBackToAuthor={noop} onRetryCitationSave={noop} onRetryLoad={noop} onDateSortClick={noop} onPageSortClick={noop} onSelectAll={noop} onCopy={noop} onDeleteRequest={noop} onCancelSelection={noop} onAddToProject={noop} onCreateAndAddToProject={noop} onToggleSelect={noop} onAddNote={noop} onUpdateNote={noop} onDeleteNote={noop} onDeleteCitation={noop} onUpdateCitation={noop} />
    {guide&&<svg className="width-guides" width="100%" height="100%" aria-hidden="true"><line x1={guide.left} x2={guide.left} y1={guide.top} y2={guide.bottom}/><line x1={guide.right} x2={guide.right} y1={guide.top} y2={guide.bottom}/></svg>}
  </div>;
}
createRoot(document.getElementById('fixture-root')).render(<Fixture/>);
