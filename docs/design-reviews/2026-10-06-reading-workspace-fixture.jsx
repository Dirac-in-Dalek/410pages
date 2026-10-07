import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PanelLeftClose, PanelLeftOpen, Search, UserCircle, MessageCircle, NotebookPen } from 'lucide-react';
import { BookMemoPanel } from '../../features/archive/ui/BookMemoPanel';
import { PassageNotesPanel } from '../../features/archive/ui/PassageNotesPanel';
import { CitationEditor } from '../../features/citation-entry/ui/CitationEditor';
import { removeBookMemoDraft } from '../../features/archive/logic/bookMemoDraftStorage';

const variant=new URLSearchParams(location.search).get('variant')==='current'?'current':'proposed';
const qa=new URLSearchParams(parent.location.search).has('qa');
const userId='local-workspace-design-'+variant+(qa?'-qa':''),bookId='local-workspace-design-book';
const title='읽는 동안 생각을 붙잡는 법';
const memoText=`읽기는 문장을 모으는 일에서 끝나지 않는다. 내가 왜 이 문장을 남겼는지, 무엇을 새롭게 알게 되었는지까지 이어서 적어야 기록이 내 생각이 된다.

이 책을 읽으며 가장 자주 떠올린 질문은 “내가 이해했다고 생각하는 순간에 무엇을 놓치고 있는가”였다. 처음에는 좋은 문장을 많이 모으면 이해도 함께 깊어질 것이라고 생각했다. 그러나 며칠 뒤 다시 읽어 보니 문장은 남아 있었지만 선택한 이유는 사라져 있었다.

그래서 구절 옆에는 그 문장이 불러온 짧은 생각을 적고, 여기에는 책 전체를 읽으며 연결된 질문을 길게 적으려 한다. 구절 메모는 특정 문장과의 대화이고, 책 전체 메모는 그 대화들이 어떤 방향으로 이어졌는지 살피는 자리다.

한 가지 결론을 서둘러 정리하기보다 처음의 생각과 이후의 변화를 함께 남기는 것이 좋겠다. 읽다가 생각이 바뀌었다면 앞 문장을 지우기보다 무엇이 달라졌는지 이어 쓰자. 그렇게 쌓인 기록을 보면 나의 이해가 어디에서 멈췄고 어디에서 다시 움직였는지 알 수 있다.

다음 독서에서는 질문을 먼저 적어 보고 싶다. 같은 주제를 다른 저자는 어떤 말로 설명하는지, 서로 동의하지 않는 부분은 무엇인지 비교할 것이다. 인용문과 내 생각을 함께 읽을 수 있으면 단편적인 문장이 하나의 질문으로 연결될 수 있다.

아직 남은 생각

기록을 다시 읽는 시점도 중요하다. 책을 다 읽은 다음에만 정리하면 읽는 도중의 작은 의문은 놓치기 쉽다. 오늘 읽은 부분을 짧게 되짚고 내일의 질문을 남기는 방식으로 시도해 보자. 이 메모는 완성된 요약보다 생각이 계속 이어지는 글로 남겨 두려고 한다.`;
const texts=[
 ['독자는 문장을 받아들이는 순간에도 자기 경험과 질문을 함께 가져온다. 이해는 글 속에 완성된 채 놓여 있는 것이 아니라 읽는 동안 만들어진다.','처음 읽었을 때는 이해가 저자의 설명을 정확하게 받아들이는 일이라고 생각했다. 내 질문이 달라지면 같은 문장도 다르게 읽힌다는 점을 기억하고 싶다.'],
 ['좋은 기록은 무엇을 읽었는가뿐 아니라 그 문장이 어떤 생각을 움직였는지 보여 준다.','왜 남겼는지를 짧게라도 붙여 두자. 며칠 뒤 다시 읽을 때 이 한 줄이 선택한 맥락을 되돌려 준다.'],
 ['질문이 남아 있다는 것은 읽기에 실패했다는 뜻이 아니다. 다음 문장으로 이어 갈 이유가 생겼다는 뜻이다.','모르는 것을 바로 정리하려 하지 않고 질문으로 남길 수 있겠다.\n\n“왜 이런 결론이 나왔을까?”와 “다른 조건에서도 맞을까?”는 서로 다른 질문이다. 둘을 구분해서 적어 보자.'],
 ['기억에 남기고 싶은 문장을 골랐다면, 그 옆에 지금의 생각을 먼저 적어 보자. 정확한 결론은 조금 뒤에 도착할 수도 있다.','책 전체 메모와 구절 메모를 나누는 이유가 분명해진다. 한쪽에는 그 문장을 읽은 순간의 생각을, 다른 쪽에는 여러 문장이 이어진 흐름을 남긴다.'],
 ['다시 읽기는 처음의 이해를 반복하는 일이 아니라 달라진 질문으로 같은 문장을 만나는 일이다.','이전에 적은 메모를 지우기보다 생각이 바뀐 이유를 덧붙이고 싶다.'],
 ['기록이 쌓이면 문장 사이의 관계가 드러난다. 서로 다른 장에서 만난 두 문장이 같은 질문을 향하고 있을 수도 있다.','같은 질문이 반복되는 부분을 책 전체 메모에서 묶어 보자.'],
];
const seed=()=>texts.map(([text,note],i)=>({id:'demo-quote-'+i,text,kind:'sentence',book:title,author:'시안용 예제',bookId,page:String(24+i*7),tags:[],createdAt:i+1,notes:[{id:'demo-note-'+i,content:note,createdAt:i+1}]}));
const start={bodyWidth:592,commentWidth:240,memoWidth:360,gap:40,anchor:'group',width:1024,theme:'day',fontSize:18.6667,library:'auto',comments:true,memo:true,scenario:'long',failure:false};
function fit(desired,minimum,available){const total=desired.reduce((a,b)=>a+b,0),floor=minimum.reduce((a,b)=>a+b,0);if(available>=total)return desired;if(available<=floor)return minimum.map(v=>v*available/floor);const t=(available-floor)/(total-floor);return desired.map((v,i)=>minimum[i]+(v-minimum[i])*t);}
function Demo(){
 const [config,setConfig]=useState(start),[citations,setCitations]=useState(seed),[book,setBook]=useState({id:bookId,title,author:'시안용 예제',memo:memoText}),[memoOpen,setMemoOpen]=useState(true),[commentsOpen,setCommentsOpen]=useState(true),[active,setActive]=useState(null),[revision,setRevision]=useState(0);
 const host=useRef(null),scroll=useRef(null),openMemoButton=useRef(null),serial=useRef(100);const prefill=useMemo(()=>({author:book.author,book:title,bookId}),[]);
 const desired=[config.commentWidth,config.gap,config.bodyWidth,config.gap,config.memoWidth];
 const libraryOpen=config.library==='open'||(config.library==='auto'&&config.width>=(variant==='current'?1552:desired.reduce((a,b)=>a+b,0)+280));const libraryWidth=libraryOpen?232:0;
 let columns=fit(desired,[180,24,384,24,280],config.width-libraryWidth-48),sideReserve=null;
 if(config.anchor==='body'&&variant!=='current') {const side=Math.max(config.commentWidth,config.memoWidth),s=fit([side,config.gap,config.bodyWidth,config.gap,side],[280,24,384,24,280],config.width-libraryWidth-48);sideReserve=s[0];columns=[Math.min(config.commentWidth,s[0]),s[1],s[2],s[3],Math.min(config.memoWidth,s[4])];}
 if(variant==='current'){const referenceWidth=config.width-232-320,body=Math.min(592,Math.max(240,referenceWidth-48));columns=[232-libraryWidth+(referenceWidth-body)/2,0,body,0,0];}
 const [left,gap,bodyWidth,rightGap,memoWidth]=columns,total=columns.reduce((a,b)=>a+b,0);
 const alignment=variant==='current'?{marginInlineStart:0}:sideReserve===null?{}:{marginInlineStart:((config.width-libraryWidth-(2*sideReserve+2*gap+bodyWidth))/2+sideReserve-left)+'px',marginInlineEnd:0};
 useEffect(()=>{const receive=e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='410pages-workspace-config')return;const next=e.data.config;if(!next||!['day','night'].includes(next.theme)||![1024,1440,1920,3840].includes(next.width))return;setConfig(next);setMemoOpen(next.memo);setCommentsOpen(next.comments);if(e.data.reset){removeBookMemoDraft(userId,bookId);setCitations(seed());setBook({id:bookId,title,author:'시안용 예제',memo:next.scenario==='empty'?'':memoText});setActive(null);setRevision(n=>n+1);}};window.addEventListener('message',receive);parent.postMessage({type:'410pages-workspace-ready',variant},location.origin);return()=>window.removeEventListener('message',receive);},[]);
 useEffect(()=>{document.documentElement.dataset.theme=config.theme;document.documentElement.classList.toggle('dark',config.theme==='night');},[config.theme]);

 useLayoutEffect(()=>{
  if(variant==='current')return;
  const root=host.current,region=root?.querySelector('.memo-region'),input=region?.querySelector('textarea'),quote=root?.querySelector('.pair-quote p'),pairScroll=root?.querySelector('.paired-scroll');
  if(!region||!input||!quote||!pairScroll)return;
  const alignStart=()=>{
   const gap=parseFloat(root.style.getPropertyValue('--memo-start-gap'))||0;
   const quoteTop=quote.getBoundingClientRect().top+pairScroll.scrollTop;
   const memoBaseTop=input.getBoundingClientRect().top+region.scrollTop-gap;
   const next=Math.max(0,quoteTop-memoBaseTop);
   if(Math.abs(next-gap)>.5)root.style.setProperty('--memo-start-gap',next+'px');
   root.style.setProperty('--memo-prelude-height',Math.max(0,memoBaseTop-region.getBoundingClientRect().top)+'px');
  };
  const grow=()=>{const top=input.scrollTop;input.style.height='auto';input.style.height=Math.max(360,input.scrollHeight)+'px';input.scrollTop=top;alignStart();};
  grow();input.addEventListener('input',grow);
  const observer=new ResizeObserver(grow);
  observer.observe(input.parentElement);
  const heading=root.querySelector('.paired-header'),memoHeading=region.querySelector('header');
  if(heading)observer.observe(heading);if(memoHeading)observer.observe(memoHeading);
  return()=>{input.removeEventListener('input',grow);observer.disconnect();};
 },[memoOpen,config.scenario,revision,book.memo,memoWidth]);
 useLayoutEffect(()=>{const root=host.current;if(!root)return;let raf;const measure=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{const bounds=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width,height:r.height};};const q=root.querySelector('.pair-quote'),c=root.querySelector('.pair-comment'),m=root.querySelector('[data-book-memo-panel] textarea');parent.postMessage({type:'410pages-workspace-metrics',variant,snapshot:{html:root.outerHTML,width:config.width,height:config.width===1024?768:config.width===1440?900:config.width===1920?1080:2160,groupLeft:root.querySelector('.reading-group').getBoundingClientRect().left,groupWidth:total,theme:config.theme,values:[...root.querySelectorAll('textarea')].map(t=>t.value)},metrics:{columns:{comment:left,gap,body:bodyWidth,rightGap,memo:memoWidth},workspace:bounds(root.querySelector('.reading-group')),quote:bounds(q),quoteText:bounds(q?.querySelector('p')),comment:commentsOpen?bounds(c):null,commentText:commentsOpen?bounds(c?.querySelector('p')):null,memo:memoOpen?bounds(m):null,libraryOpen,memoOpen,commentsOpen,available:config.width-libraryWidth-48,viewport:config.width,overflow:document.documentElement.scrollWidth>config.width}},location.origin);});};measure();const o=new ResizeObserver(measure);o.observe(root);root.addEventListener('input',measure);const changes=new MutationObserver(measure);changes.observe(root,{childList:true,subtree:true,attributes:true});return()=>{o.disconnect();changes.disconnect();root.removeEventListener('input',measure);cancelAnimationFrame(raf);};},[config,columns.join(','),citations,memoOpen,commentsOpen,book.memo]);
 const updateNotes=(id,fn)=>setCitations(old=>old.map(c=>c.id===id?{...c,notes:fn(c.notes)}:c));
 const syncToggle=(id,value)=>{try{const control=parent.document.getElementById(id);if(control?.type==='checkbox'&&control.checked!==value){control.checked=value;control.dispatchEvent(new parent.Event('change',{bubbles:true}));}}catch{}};
 const closeMemo=()=>{setMemoOpen(false);syncToggle('memo',false);requestAnimationFrame(()=>openMemoButton.current?.focus({preventScroll:true}));};
 const openMemo=()=>{setMemoOpen(true);syncToggle('memo',true);requestAnimationFrame(()=>host.current?.querySelector('[data-book-memo-panel] textarea')?.focus({preventScroll:true}));};
 const memo=<BookMemoPanel key={revision} userId={userId} book={book} onClose={closeMemo} onSave={async(_,value)=>{if(config.failure)return false;setBook(old=>({...old,memo:value}));return true;}}/>;
 return <div ref={host} className="workspace-demo" data-variant={variant} data-comments={commentsOpen} style={{'--left':left+'px','--gap':gap+'px','--body':bodyWidth+'px','--memo':memoWidth+'px','--total':total+'px','--demo-text-size':config.fontSize+'px'}}>
 <header className="demo-topbar"><button aria-label={libraryOpen?'서재 접기':'서재 펼치기'} onClick={()=>setConfig(c=>({...c,library:libraryOpen?'closed':'open'}))}>{libraryOpen?<PanelLeftClose size={17}/>:<PanelLeftOpen size={17}/>}서재</button><span className="demo-wordmark">410pages</span><div className="demo-search"><Search size={16}/>이 책의 인용문 검색</div>{(variant!=='current'||!memoOpen)&&<button ref={openMemoButton} data-passage-note-trigger onClick={memoOpen?closeMemo:openMemo} aria-label={variant==='current'?'책 전체 메모 열기':'책 메모 표시 전환'} aria-expanded={memoOpen}><NotebookPen size={17}/>메모</button>}<UserCircle size={26}/></header>
 <div className="demo-content">{libraryOpen&&<aside className="demo-library" aria-label="서재 예제"><p>⌂ 홈</p><small>최근 기록한 책</small><p>읽는 동안 생각을 붙잡는 법<small>시안용 예제</small></p><p>언어와 생각<small>시안용 예제</small></p><small>서재 정리</small><p>⌄ 저자와 책</p><p>　읽기 기록</p></aside>}<main className="demo-main"><div className="reading-group" style={alignment}>
 <section className="quote-comment-scroll" aria-label="인용문과 구절 메모"><header className="paired-header"><div><h1>{title}</h1><p>시안용 예제</p><button className="reading-action" onClick={()=>{const next=!commentsOpen;setCommentsOpen(next);syncToggle('comments',next);}} aria-expanded={commentsOpen}>인용문 메모 모두 {commentsOpen?'접기':'펼치기'}</button></div></header>
 <div className="paired-scroll" ref={scroll} data-archive-scroll>{citations.map(c=><div className="pair-row" key={c.id}><div className="pair-comment">{commentsOpen&&<PassageNotesPanel inline citation={c} readOnly={active!==c.id} onActivate={()=>setActive(c.id)} onClose={()=>setActive(null)} onAddNote={async(id,content)=>{updateNotes(id,notes=>[...notes,{id:'demo-note-'+serial.current++,content,createdAt:Date.now()}]);return true;}} onUpdateNote={async(id,nid,content)=>{updateNotes(id,notes=>notes.map(n=>n.id===nid?{...n,content}:n));return true;}} onDeleteNote={async(id,nid)=>{updateNotes(id,notes=>notes.filter(n=>n.id!==nid));return true;}}/>}</div><article className="pair-quote"><p>{c.text}</p><button data-passage-note-trigger onClick={()=>{setCommentsOpen(true);syncToggle('comments',true);setActive(active===c.id?null:c.id);}}><span>{c.page}쪽</span><MessageCircle size={13}/>이 문장 메모 {c.notes.length}</button></article></div>)}</div>
 <footer className="demo-entry"><div><CitationEditor key={revision} username="Preview" prefillData={prefill} hideSourceFields bookDepth={0} onAddCitation={async data=>{setCitations(old=>[...old,{...data,id:'demo-quote-'+serial.current++,createdAt:Date.now(),notes:[]}]);return {ok:true};}}/></div></footer>
 </section>{variant!=='current'&&<aside className="memo-region" data-passage-note-trigger aria-label="책 전체 메모 읽기 열" aria-hidden={!memoOpen} inert={!memoOpen} style={{visibility:memoOpen?'visible':'hidden'}}><div className="memo-initial-offset" aria-hidden="true" style={{height:'var(--memo-start-gap,0px)'}}/>{memo}</aside>}
 </div></main>{variant==='current'&&<aside className="memo-edge" aria-hidden={!memoOpen} inert={!memoOpen} style={{width:memoOpen?320:0,overflow:'hidden'}}>{memo}</aside>}</div></div>;
}
const renderRoot=import.meta.hot?.data.renderRoot??createRoot(document.getElementById('workspace-root'));
if(import.meta.hot)import.meta.hot.data.renderRoot=renderRoot;
renderRoot.render(<Demo/>);
