import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { MainLayout } from '../../components/MainLayout';
import { BookMemoPanel } from '../../features/archive/ui/BookMemoPanel';
import { ArchiveScreen } from '../../features/archive/ui/ArchiveScreen';
import { BookComposerDraftStore } from '../../features/citation-entry/logic/bookComposerDrafts';
import { sortBookViewItems, toBookViewItems } from '../../lib/bookViewItems';
import { getChapterDropPlacement } from '../../features/archive/logic/chapterHierarchy';
import { resolveBookInsertion } from '../../features/archive/logic/bookInsertion';
import { removeBookMemoDraft } from '../../features/archive/logic/bookMemoDraftStorage';

const readingWorkspace=new URLSearchParams(location.search).has('workspace');
const testMode=new URLSearchParams(parent.location.search).has('qa');
const bookId='local-writing-review',noop=()=>{},base={author:'비교용 저자',book:'순서대로 기록하기',bookId,kind:'sentence',notes:[],tags:[]};
const fixtureUserId='local-reading-production-qa';
const initialMemo=('읽는 동안 남은 질문과 내 생각을 여기에 이어 적습니다. 인용문과 구절 메모를 함께 보며 다시 생각해 봅니다.\n\n').repeat(12);
const fixtureBooks={a:{key:'a',id:bookId,title:base.book,author:base.author,memo:initialMemo},b:{key:'b',id:'local-writing-review-short',title:'짧은 메모로 돌아오기',author:base.author,memo:'이 책에는 다음에 확인할 질문 하나만 짧게 남겨 둡니다.'}};
const bookBase=book=>({author:book.author,book:book.title,bookId:book.id,kind:'sentence',notes:[],tags:[]});
const chapter=(book,id,label,depth,createdAtSort)=>({id,label,depth,createdAtSort,createdAt:createdAtSort,bookId:book.id});
const citation=(book,id,text,createdAtSort,page='67')=>({...bookBase(book),id,text,createdAtSort,createdAt:createdAtSort,page});
function seed(scenario,book=fixtureBooks.a){
  let chapters=[chapter(book,'root','1장 · 기계번역과 언어 학습',0,10)],citations=[citation(book,'q-root','기계번역의 도움: 단어, 표현, 문장구조를 점검하며 새로운 언어 표현에 주목한다.',20)];
  for(let i=1;i<=4;i++)citations.push(citation(book,'q-root-'+i,'번역기를 활용하며 자기 문장의 구조와 표현을 비교하고 수정한다. 기록한 내용을 다시 읽으며 이해한 점과 남은 질문을 살펴본다.',20+i*2));
  let insertion={afterId:'q-root-4',depth:0},chapterMode=true;
  if(scenario==='child'||scenario==='child-chapter'){chapters.push(chapter(book,'child','1.1 · 번역기의 장점과 한계',1,30));citations.push(citation(book,'q-child','소제목 아래에서는 이 문장과 다음 문장이 같은 시작선에서 이어진다.',40));insertion={afterId:'q-child',depth:1};chapterMode=false;}
  if(scenario==='child-chapter')chapterMode=true;
  if(scenario==='deep'){chapters.push(chapter(book,'child','1.1 · 번역기의 장점과 한계',1,30),chapter(book,'deep','1.1.1 · 자기 오류 고치기',2,50));citations.push(citation(book,'q-child','소제목 아래에 저장된 인용문입니다.',40),citation(book,'q-deep','이 문장은 큰 제목과 두 소제목의 하위에 놓이며 마지막 소제목과 같은 시작선에 정렬됩니다.',60));insertion={afterId:'q-deep',depth:2};chapterMode=false;}
  if(scenario==='empty'){chapters=[];citations=[];insertion=null;}
  return {chapters,citations,insertion,chapterMode};
}
function Fixture(){
  const baseline=new URLSearchParams(location.search).get('variant')==='current';
  const store=useMemo(()=>new BookComposerDraftStore(),[]),host=useRef(null),serial=useRef(100),scenarioRef=useRef('root'),bookKeyRef=useRef('a');
  const [chapters,setChapters]=useState([]),[citations,setCitations]=useState([]),[guide,setGuide]=useState(null),[revision,setRevision]=useState(0);
  const [homeOpen,setHomeOpen]=useState(true),[memoOpen,setMemoOpen]=useState(true),[commentsOpen,setCommentsOpen]=useState(true),[activeNote,setActiveNote]=useState(null);
  const [activeBookKey,setActiveBookKey]=useState('a'),[memos,setMemos]=useState({a:fixtureBooks.a.memo,b:fixtureBooks.b.memo}),[memoRevision,setMemoRevision]=useState(0);
  const [config,setConfig]=useState({matched:true,boundary:'hide-root-out',hideCopy:true,guides:true,theme:'day',scenario:'root',width:1024,bookKey:'a'});
  const activeBook=readingWorkspace?fixtureBooks[activeBookKey]:fixtureBooks.a;
  const activeBase=useMemo(()=>bookBase(activeBook),[activeBook]);
  const activePrefill=useMemo(()=>({author:activeBook.author,book:activeBook.title,bookId:activeBook.id}),[activeBook]);
  const activeFilter=useMemo(()=>({type:'book',value:activeBook.title,author:activeBook.author,bookId:activeBook.id}),[activeBook]);
  const desktop=config.width>=1024;
  const draft=useSyncExternalStore(store.subscribe,()=>store.get(activeBook.id));
  const items=useMemo(()=>sortBookViewItems(toBookViewItems(citations,chapters),'date','asc'),[citations,chapters]);
  const target=useMemo(()=>resolveBookInsertion(items,draft?.insertion??{depth:0}),[items,draft?.insertion]);
  const placement=target?getChapterDropPlacement(chapters,'preview',target.position,draft?.insertion?.depth??target.previousDepth??0):null;
  const depth=draft?.chapterMode?placement?.depth??0:target?.previousDepth??0;
  function reset(scenario,clearMemo=false,targetKey=bookKeyRef.current){const targetBook=readingWorkspace?fixtureBooks[targetKey]:fixtureBooks.a;bookKeyRef.current=targetBook.key;setActiveBookKey(targetBook.key);scenarioRef.current=scenario;const next=seed(scenario,targetBook);setChapters(next.chapters);setCitations(readingWorkspace?next.citations.map((c,i)=>({...c,notes:i===0?[{id:'demo-note',content:'인용문을 읽으며 떠오른 질문을 옆에 남깁니다. 문장과 함께 보며 내 생각을 이어 적어 봅니다.',createdAt:1}]:[]})):next.citations);store.patch(targetBook.id,{values:{text:'',author:targetBook.author,book:targetBook.title,page:''},insertion:next.insertion,chapterMode:next.chapterMode,saving:false,error:''});setActiveNote(null);if(clearMemo){for(const book of Object.values(fixtureBooks))removeBookMemoDraft(fixtureUserId,book.id);setMemos({a:fixtureBooks.a.memo,b:fixtureBooks.b.memo});setMemoRevision(n=>n+1);}setRevision(n=>n+1);}
  useEffect(()=>{reset('root');const receive=event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='410pages-writing-config')return;const next=event.data.config;if(!next||!['day','night'].includes(next.theme)||!['hide-root-out','disable'].includes(next.boundary)||typeof next.matched!=='boolean'||typeof next.hideCopy!=='boolean'||typeof next.guides!=='boolean')return;const nextBookKey=readingWorkspace&&['a','b'].includes(next.bookKey)?next.bookKey:bookKeyRef.current;setConfig({...next,bookKey:nextBookKey});if(event.data.reset||next.scenario!==scenarioRef.current||nextBookKey!==bookKeyRef.current)reset(next.scenario,Boolean(event.data.reset),nextBookKey);};window.addEventListener('message',receive);parent.postMessage({type:'410pages-writing-ready',variant:baseline?'current':'proposed'},location.origin);return()=>window.removeEventListener('message',receive);},[]);
  useEffect(()=>{document.documentElement.dataset.theme=config.theme;document.documentElement.classList.toggle('dark',config.theme==='night');if(readingWorkspace)document.documentElement.style.setProperty('--font-base-pt',config.largeFont?'18pt':'14pt');},[config.theme,config.largeFont]);
  useLayoutEffect(()=>{
    const root=host.current;if(!root)return;let frame;
    const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const frame=root.querySelector('.book-composer-frame'),composer=root.querySelector('.book-citation-composer'),textarea=composer?.querySelector('textarea'),scroll=root.querySelector('[data-archive-scroll]');
      if(!composer||!textarea)return;
      const rows=[...root.querySelectorAll('.book-row-content[data-row-kind=sentence]')];
      const row=rows.find(e=>Number(e.dataset.citationDepth)===depth)??rows.at(-1);
      const adjustment=scroll.offsetWidth-scroll.clientWidth;
      const r=e=>{if(!e)return null;const b=e.getBoundingClientRect();return {left:b.left,right:b.right,width:b.width};};
      const text=row?.querySelector('[data-passage-note-trigger].px-1>span:first-child');
      if(testMode&&root.dataset.resizeTransition==='running')root.dataset.resizeIntermediateWidth=String(composer.getBoundingClientRect().width);
      const metrics={variant:baseline?'current':'proposed',bookKey:activeBook.key,bookId:activeBook.id,depth,mode:draft?.chapterMode?'chapter':'citation',chapterCount:chapters.length,citationCount:citations.length,anchor:draft?.insertion?.afterId??null,previousDepth:target?.previousDepth??null,maxDepth:(target?.previousDepth??-1)+1,composer:r(composer),textarea:r(textarea),citationRow:r(row),citationText:r(text),referenceDepth:row?Number(row.dataset.citationDepth):null,scrollbar:scroll.offsetWidth-scroll.clientWidth,adjustment};
      parent.postMessage({type:'410pages-writing-metrics',metrics,snapshot:baseline?null:{html:frame.outerHTML,text:textarea.value,kind:draft?.chapterMode?'chapter':'citation',rail:composer.getBoundingClientRect().left-composer.parentElement.getBoundingClientRect().left,width:frame.parentElement.getBoundingClientRect().width+composer.getBoundingClientRect().left-composer.parentElement.getBoundingClientRect().left+24,indentStep:getComputedStyle(root.querySelector('.book-writing-surface')).getPropertyValue('--chapter-indent-step'),indentLimit:getComputedStyle(root.querySelector('.book-writing-surface')).getPropertyValue('--chapter-indent-limit'),height:frame.offsetHeight+24,marginInlineStart:getComputedStyle(composer).marginInlineStart,theme:config.theme,adjustment,matched:config.matched,hideCopy:config.hideCopy}},location.origin);
      const inputBox=textarea.getBoundingClientRect(),referenceBox=text?.getBoundingClientRect();
      const nextGuide=config.guides&&referenceBox&&Number(row?.dataset.citationDepth)===depth?{left:inputBox.left,right:inputBox.right,top:Math.max(0,referenceBox.top),bottom:inputBox.bottom}:null;
      setGuide(previous=>JSON.stringify(previous)===JSON.stringify(nextGuide)?previous:nextGuide);
    });};
    const observer=new ResizeObserver(measure);observer.observe(root);const text=root.querySelector('textarea');if(text)observer.observe(text);const scroll=root.querySelector('[data-archive-scroll]');if(scroll){observer.observe(scroll);scroll.addEventListener('scroll',measure);}measure();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);scroll?.removeEventListener('scroll',measure);};
  },[baseline,config,activeBook,depth,draft,chapters,citations,revision]);
  const makeChapter=async data=>{const item={...data,bookId:activeBook.id,id:'chapter-'+serial.current++,createdAt:Date.now()};setChapters(old=>[...old,item]);return item;};
  const makeCitation=async data=>{const item={...activeBase,...data,bookId:activeBook.id,id:'citation-'+serial.current++,createdAt:Date.now(),notes:[]};setCitations(old=>[...old,item]);return {ok:true,citationId:item.id};};
  function trackResize(event,phase){if(!testMode||!event.target.classList.contains('book-composer-frame')||!event.propertyName.startsWith('margin'))return;event.currentTarget.dataset.resizeTransition=phase;if(phase==='completed')event.currentTarget.dataset.resizeDuration=String(event.elapsedTime);}
  const archive = <ArchiveScreen composerDrafts={store} isMobileApp={!desktop} title={activeBook.title} showEditor username="Preview" editorPrefill={activePrefill} isBookView authorName={activeBook.author}
      sortField="date" dateDirection="asc" pageDirection="asc" onAddCitation={makeCitation} onCreateChapterBlock={makeChapter}
      citations={citations} allCitations={citations} chapterBlocks={chapters} projects={[]} loading={false} loadError={null} searchTerm="" selectedIds={new Set()} selectedFilter={activeFilter} isCopying={false}
      showAllPassageNotes={readingWorkspace&&commentsOpen} onToggleAllPassageNotes={()=>setCommentsOpen(v=>!v)} passageNoteCitationId={activeNote} onPassageNoteCitationChange={setActiveNote}
      onBackToAuthor={noop} onRetryCitationSave={noop} onRetryLoad={noop} onDateSortClick={noop} onPageSortClick={noop} onSelectAll={noop} onCopy={noop} onDeleteRequest={noop} onCancelSelection={noop} onAddToProject={noop} onCreateAndAddToProject={noop} onToggleSelect={noop}
      onAddNote={async(id,content)=>{setCitations(old=>old.map(c=>c.id===id?{...c,notes:[...c.notes,{id:'demo-note-'+serial.current++,content,createdAt:Date.now()}]}:c));return true;}} onUpdateNote={async(id,nid,content)=>setCitations(old=>old.map(c=>c.id===id?{...c,notes:c.notes.map(n=>n.id===nid?{...n,content}:n)}:c))} onDeleteNote={async(id,nid)=>setCitations(old=>old.map(c=>c.id===id?{...c,notes:c.notes.filter(n=>n.id!==nid)}:c))} onDeleteCitation={noop} onUpdateCitation={noop} />;
  return <div onTransitionRun={event=>trackResize(event,'running')} onTransitionEnd={event=>trackResize(event,'completed')} ref={host} className="fixture" data-proposed={!baseline} data-desktop={desktop&&!readingWorkspace} data-matched={!baseline&&config.matched} data-copy={baseline||!config.hideCopy}>
    {readingWorkspace ? <MainLayout bookReadingWorkspace resizeStorageKeyPrefix="410pages.reading-fixture." selectedBookId={activeBook.id} isHomeView={false} projects={[]} books={[]} citations={citations}
      leftPanel={<aside className="p-4">서재 예제</aside>} homePanelOpen={homeOpen} onHomePanelOpenChange={setHomeOpen} rightPanelOpen={memoOpen} onRightPanelOpenChange={setMemoOpen} onOpenSettings={noop}
      rightPanel={<BookMemoPanel key={memoRevision} reading readingCollapsed={!memoOpen} onToggleReading={()=>setMemoOpen(open=>!open)} userId={fixtureUserId} book={{id:activeBook.id,title:activeBook.title,author:activeBook.author,memo:memos[activeBook.key]}} onSave={async(id,value)=>{if(config.failure)return false;setMemos(current=>({...current,[id===fixtureBooks.a.id?'a':'b']:value}));return true;}}/>}>{archive}</MainLayout> : archive}
    {readingWorkspace&&<div className="fixed top-16 left-4 z-[200] flex items-center gap-3 rounded bg-[var(--bg-card)] px-2 py-1 text-xs">
      <label>예제 책 <select aria-label="읽기 위치 확인용 예제 책" value={activeBookKey} onChange={e=>{const key=e.target.value;setConfig(c=>({...c,bookKey:key}));reset(config.scenario,false,key);}}><option value="a">A · 긴 메모</option><option value="b">B · 짧은 메모</option></select></label>
      <label>예제 글자 <select aria-label="예제 본문 글자 크기" value={config.largeFont?'18':'14'} onChange={e=>setConfig(c=>({...c,largeFont:e.target.value==='18'}))}><option value="14">14pt</option><option value="18">18pt</option></select></label>
      <label><input type="checkbox" aria-label="예제 저장 실패" checked={Boolean(config.failure)} onChange={e=>setConfig(c=>({...c,failure:e.target.checked}))}/>저장 실패</label>
    </div>}
    {guide&&<svg className="width-guides" width="100%" height="100%" aria-hidden="true"><line x1={guide.left} x2={guide.left} y1={guide.top} y2={guide.bottom}/><line x1={guide.right} x2={guide.right} y1={guide.top} y2={guide.bottom}/></svg>}
  </div>;
}
const renderRoot=import.meta.hot?.data.renderRoot??createRoot(document.getElementById('fixture-root'));
if(import.meta.hot)import.meta.hot.data.renderRoot=renderRoot;
renderRoot.render(<Fixture/>);
