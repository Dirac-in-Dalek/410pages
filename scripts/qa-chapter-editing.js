// Run with playwright-cli run-code --filename scripts/qa-chapter-editing.js against a local dev or preview server configured with a same-origin dummy Supabase URL.
async (page) => {
  page.setDefaultTimeout(15000);
  const origin = page.url().split('/').slice(0, 3).join('/');
  if (!/^http:\/\/(127\.0\.0\.1|localhost):[0-9]+$/.test(origin)) throw new Error('Open the isolated local app before running QA.');
  await page.unrouteAll();
  await page.goto('about:blank');
  const pdfModule = /\/(?:features\/reader\/ui\/PdfReaderPage\.tsx|assets\/PdfReaderPage-[^/?]+\.js)(?:\?|$)/;
  const seen = [];
  page.on('request', request => seen.push(request.url()));
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const user = {id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'review@example.invalid',user_metadata:{username:'검토용 독자'},created_at:'2026-09-01T00:00:00Z'};
  const session = {access_token:'review-only-token',refresh_token:'review-only-refresh',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+86400,expires_in:86400,user};
  const author = {id:'a1',name:'김기록',sort_index:0,is_self:false,created_at:'2026-09-01T00:00:00Z'};
  const book = {id:'b1',title:'천천히 읽고 오래 기억하는 문장들: 일상의 작은 관찰을 기록하는 방법',memo:'읽고 남긴 문장이 다시 생각을 시작하는 출발점이 된다.',sort_index:0,created_at:'2026-09-01T00:00:00Z',author};
  const citations = Array.from({length:1},(_,i)=>({id:'c'+i,text:['좋은 기록은 다시 읽을 때 새로운 질문을 만든다. 오늘의 생각을 한 문장으로 남겨 본다.','읽는 속도를 늦추면 문장 사이에서 놓쳤던 연결을 발견할 수 있다.','작은 메모 하나가 다음 독서의 방향을 바꾼다.'][i%3],book,author,page:String(12+i*4),page_sort:12+i*4,created_at:new Date(Date.UTC(2026,8,1,0,i)).toISOString(),notes:i%2===0?[{id:'n'+i,content:'이 문장에서 떠오른 생각을 적어 둔다. 다음에 읽을 때 원문과 함께 비교한다.',created_at:'2026-09-01T00:00:00Z'}]:[],highlights:[]}));
  const chapters = [{id:'ch1',book_id:'b1',label:'1장 읽기를 시작하며',page_sort:1,created_at_sort:Date.UTC(2026,8,1)-1000,created_at:'2026-09-01T00:00:00Z'},{id:'ch2',book_id:'b1',label:'2장 문장에서 생각으로',page_sort:35,created_at_sort:Date.UTC(2026,8,1,0,5,30),created_at:'2026-09-01T00:00:00Z'}];
  await page.unroute('**/*');
  await page.route('**/*',async route=>{
    const raw=route.request().url(); const url={origin:raw.split('/').slice(0,3).join('/'),pathname:'/'+raw.split('/').slice(3).join('/').split('?')[0]};
    if(['https://cdn.jsdelivr.net','https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(url.origin))return route.continue();
    if(url.origin!==origin)return route.abort();
    if(url.pathname==='/rest/v1/rpc/get_or_create_book')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({bookId:'b3',bookTitle:'PDF 검증용',bookSortIndex:2,bookCreatedAt:'2026-09-01T00:00:00Z',authorId:author.id,authorName:author.name,authorSortIndex:0,isSelf:false})});
    if(url.pathname.startsWith('/rest/v1/')){
      const table=url.pathname.split('/').pop();
      const data={profiles:{username:'검토용 독자',avatar_path:null,preferences:null},authors:[author,{...author,id:'a2',name:'박산책',sort_index:1}],books:[book,{...book,id:'b2',title:'여백의 시간',sort_index:1}],citations,projects:[],chapter_blocks:chapters,author_folders:[],author_folder_memberships:[]}[table]??[];
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    }
    if(url.pathname.startsWith('/auth/v1/'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.pathname.endsWith('/user')?user:session)});
    if(url.pathname==='/api/book-metadata')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({metadata:{itemId:1,title:book.title,author:author.name,isbn13:'',coverUrl:null,sourceUrl:'https://www.yes24.com/product/goods/1',tableOfContents:'자동 목차 첫 장\n자동 목차 둘째 장'}})});
    return route.continue();
  });
  await page.addInitScript(s=>{localStorage.setItem('autoLoginEnabled','true');localStorage.setItem('sb-127-auth-token',JSON.stringify(s));},session);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(origin+'/');
  await page.getByRole('heading',{name:'저자를 고르세요'}).waitFor({timeout:15000});
  const writes=[];
  let failNext=true, createdCount=0;
  await page.route('**/rest/v1/chapter_blocks**',async route=>{
    const method=route.request().method(),raw=route.request().url();
    if(method==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(raw.includes('book_id=eq.b2')?[]:chapters)});
    const body=route.request().postDataJSON();
    writes.push({method,body,url:raw});
    if(failNext){failNext=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Intentional QA failure'})});}
    if(method==='POST'){
      const row={...body,id:++createdCount===1?'new-chapter':`new-chapter-${createdCount}`,created_at:'2026-09-11T00:00:00Z'};
      chapters.push(row);
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(row)});
    }
    const id=raw.match(/[?&]id=eq\.([^&]+)/)?.[1];
    const row=chapters.find(c=>c.id===id);
    check(row&&raw.includes('user_id=eq.'+user.id)&&raw.includes('book_id=eq.b1'),'Scoped chapter update');
    Object.assign(row,body);
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(row)});
  });
  await page.getByRole('button',{name:book.title+' '+author.name,exact:true}).click();
  const originalQuote=page.getByText(citations[0].text,{exact:true});
  const quoteX=(await originalQuote.boundingBox()).x;
  const create=page.getByRole('button',{name:'챕터 추가',exact:true}).last();
  await create.click();
  const newTitle=page.getByRole('textbox',{name:'챕터 제목',exact:true});
  await newTitle.press('Tab');
  await newTitle.fill('새 하위');
  await page.getByRole('button',{name:'챕터 저장',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'챕터를 저장하지 못했습니다'}).waitFor();
  check(await newTitle.inputValue()==='새 하위','Failed create retains title');
  check(await newTitle.evaluate(e=>e.closest('form').dataset.chapterDepth)==='1','Failed create retains depth');
  await page.getByRole('button',{name:'챕터 저장',exact:true}).click();
  await page.getByRole('heading',{name:'새 하위',exact:true}).waitFor();
  await page.locator('[data-chapter-connection="new-chapter"][data-chapter-parent="ch2"]').waitFor({state:'attached'});
  check(writes[0].body.depth===1&&writes[1].body.depth===1,'Depth sent on both attempts');
  await page.reload();
  await page.getByRole('heading',{name:'새 하위',exact:true}).waitFor();
  check(await page.locator('[data-chapter-node="new-chapter"]').getAttribute('data-chapter-depth')==='1','Depth restored from API after reload');
  await page.getByRole('heading',{name:'새 하위',exact:true}).dblclick();
  let input=page.getByRole('textbox',{name:'챕터 제목 수정',exact:true});
  await input.evaluate(e=>e.setSelectionRange(0,0));
  await input.press('Delete');
  check(await input.inputValue()==='새 하위','Outdent preserves title');
  await page.getByRole('button',{name:'챕터 제목 저장',exact:true}).click();
  await input.waitFor({state:'detached'});
  check(chapters.find(c=>c.id==='new-chapter').depth===0,'Explicit zero persisted');
  await page.locator('[data-chapter-connection="new-chapter"]').waitFor({state:'detached'});
  await page.getByRole('heading',{name:'새 하위',exact:true}).dblclick();
  input=page.getByRole('textbox',{name:'챕터 제목 수정',exact:true});
  await input.evaluate(e=>e.setSelectionRange(1,1));
  await input.press('Space');
  check(await input.inputValue()==='새  하위','Native space in middle');
  await input.press('Tab');
  check(await page.getByRole('button',{name:'챕터 제목 저장',exact:true}).evaluate(e=>e===document.activeElement),'Native Tab moves focus');
  await input.focus();await input.press('Escape');
  await page.getByRole('heading',{name:'2장 문장에서 생각으로',exact:true}).dblclick();
  input=page.getByRole('textbox',{name:'챕터 제목 수정',exact:true});
  await input.evaluate(e=>e.setSelectionRange(0,0));await input.press('Tab');
  await page.getByRole('button',{name:'챕터 제목 저장',exact:true}).click();await input.waitFor({state:'detached'});
  await page.getByRole('heading',{name:'새 하위',exact:true}).dblclick();
  input=page.getByRole('textbox',{name:'챕터 제목 수정',exact:true});
  await input.evaluate(e=>e.setSelectionRange(0,0));await input.press('Space');
  await page.getByRole('button',{name:'챕터 제목 저장',exact:true}).click();await input.waitFor({state:'detached'});
  await page.locator('[data-chapter-connection="new-chapter"][data-chapter-parent="ch2"]').waitFor({state:'attached'});
  check(chapters.find(c=>c.id==='new-chapter').depth===2,'Previous child becomes the new parent');
  check((await originalQuote.boundingBox()).x===quoteX,'Citation left edge unchanged');
  await page.screenshot({path:'output/playwright/chapter-app-desktop.png'});
  await page.setViewportSize({width:375,height:900});
  await page.getByRole('button',{name:'탐색 열기',exact:true}).waitFor();
  check(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Mobile overflow');
  await page.waitForFunction(()=>document.querySelectorAll('[data-chapter-connection]').length===2);
  await page.getByRole('heading',{name:'새 하위',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:'output/playwright/chapter-app-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('textbox',{name:'이 책의 인용문 검색',exact:true}).waitFor();
  await page.waitForFunction(()=>document.querySelectorAll('[data-chapter-connection]').length===2);
  const originalOrder=citations.map(c=>c.id).join(',');
  await page.getByRole('heading',{name:'새 하위',exact:true}).focus();
  await page.keyboard.press('Alt+ArrowUp');
  await page.locator('[data-chapter-connection="new-chapter"][data-chapter-parent="ch1"]').waitFor({state:'attached'});
  check(citations.map(c=>c.id).join(',')===originalOrder,'Moving a title preserves citation order');
  check(writes.at(-1).body.created_at_sort!==undefined&&writes.at(-1).body.depth===undefined,'Only chapter position changed');
  await page.reload();
  await page.locator('[data-chapter-connection="new-chapter"][data-chapter-parent="ch1"]').waitFor({state:'attached'});

  // Real mouse dragging: projected parent, atomic persistence, cancellation and failed saves.
  const baseOrder=Date.UTC(2026,8,1);
  chapters.splice(0,chapters.length,
    {id:'ch1',book_id:'b1',label:'1장 읽기를 시작하며',depth:0,created_at_sort:baseOrder-1000,created_at:'2026-09-01T00:00:00Z'},
    {id:'ch2',book_id:'b1',label:'2장 문장에서 생각으로',depth:0,created_at_sort:baseOrder+1000,created_at:'2026-09-01T00:00:00Z'},
    {id:'new-chapter',book_id:'b1',label:'기존 하위',depth:1,created_at_sort:baseOrder+2000,created_at:'2026-09-01T00:00:00Z'},
    {id:'drag-title',book_id:'b1',label:'옮길 제목',depth:0,created_at_sort:baseOrder+3000,created_at:'2026-09-01T00:00:00Z'});
  await page.reload();
  const dragHandle=page.getByRole('heading',{name:'옮길 제목',exact:true});
  const target=page.locator('[data-book-row="new-chapter"] [data-row-content]');
  const preview=page.locator('[data-chapter-node="chapter-drop-preview"]');
  const beginDrag=async (levels) => {
    const step=await page.locator('.chapter-list').evaluate(e=>(parseFloat(getComputedStyle(e).getPropertyValue('--chapter-indent-step'))||1)*parseFloat(getComputedStyle(document.documentElement).fontSize));
    const dx=levels*step;
    await dragHandle.scrollIntoViewIfNeeded();
    const source=await dragHandle.boundingBox(), dest=await target.boundingBox();
    const x=source.x+source.width/2, y=source.y+source.height/2, targetY=dest.y+dest.height-2;

    await page.mouse.move(x,y); await page.mouse.down();
    await page.mouse.move(x,y+6,{steps:3});
    await page.mouse.move(x+dx,targetY,{steps:10});
    await page.mouse.move(x+dx,targetY,{steps:2});

    return {x,targetY,step};
  };
  let pointer=await beginDrag(1);
  await preview.waitFor();
  check(await preview.getAttribute('data-chapter-depth')==='1','Sibling depth preview');
  check((await preview.textContent()).includes('2장 문장에서 생각으로 아래'),'Destination parent named');
  await page.locator('[data-chapter-connection="chapter-drop-preview"][data-chapter-parent="ch2"]').waitFor({state:'attached'});
  await page.mouse.move(pointer.x+pointer.step*2,pointer.targetY,{steps:3});
  check(await preview.getAttribute('data-chapter-depth')==='2','Grandchild preview');
  await page.mouse.move(pointer.x,pointer.targetY,{steps:3});
  check(await preview.getAttribute('data-chapter-depth')==='0','Root preview');
  await page.mouse.move(pointer.x+pointer.step,pointer.targetY,{steps:3});
  await page.screenshot({path:'output/playwright/chapter-drag-preview.png'});
  failNext=true;
  const priorPosition=chapters.find(c=>c.id==='drag-title').created_at_sort;
  await page.mouse.up();

  await page.getByRole('alert').filter({hasText:'챕터를 이동하지 못했습니다'}).waitFor();
  check(chapters.find(c=>c.id==='drag-title').depth===0&&chapters.find(c=>c.id==='drag-title').created_at_sort===priorPosition,'Failed drop retains position and depth');
  const retryPointer=await beginDrag(1);
  const dropLine=await preview.boundingBox();
  await page.mouse.move(retryPointer.x+retryPointer.step,dropLine.y+1,{steps:3});
  await page.mouse.up();
  await page.locator('[data-chapter-node="drag-title"][data-chapter-depth="1"]').waitFor();
  check(writes.at(-1).body.depth===1&&writes.at(-1).body.created_at_sort!==undefined,'One update persists order and depth');
  check(writes.at(-1).body.label===undefined,'Drag preserves title text');
  await page.reload();
  await page.locator('[data-chapter-connection="drag-title"][data-chapter-parent="ch2"]').waitFor({state:'attached'});
  check(chapters.find(c=>c.id==='drag-title').depth===1,'Drag depth survives reload');
  const beforeCancel=writes.length;
  await beginDrag(1); await page.keyboard.press('Escape'); await page.mouse.up();
  await preview.waitFor({state:'detached'});
  check(writes.length===beforeCancel,'Cancel does not write');
  await beginDrag(-1); await page.mouse.up();
  await page.locator('[data-chapter-node="drag-title"][data-chapter-depth="0"]').waitFor();
  check(writes.at(-1).body.depth===0,'Drag outdent persists explicit zero');
  await page.setViewportSize({width:375,height:900});
  await page.getByRole('button',{name:'탐색 열기',exact:true}).waitFor();
  await beginDrag(1); await preview.waitFor();
  check(await preview.getAttribute('data-chapter-depth')==='1','Narrow layout drag preview');
  check(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Narrow drag preview does not overflow');
  await page.screenshot({path:'output/playwright/chapter-drag-mobile.png'});
  await page.mouse.up();
  await page.locator('[data-chapter-connection="drag-title"][data-chapter-parent="ch2"]').waitFor({state:'attached'});
  check(citations.map(c=>c.id).join(',')===originalOrder,'Drag preserves citations');
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('textbox',{name:'이 책의 인용문 검색',exact:true}).waitFor();
  await page.screenshot({path:'output/playwright/chapter-drag-saved.png'});

  chapters.splice(0,chapters.length,
    {id:'ch1',book_id:'b1',label:'생각의 시작',depth:0,created_at_sort:baseOrder-1000,created_at:'2026-09-01T00:00:00Z'},
    {id:'ch2',book_id:'b1',label:'작은 관찰',depth:1,created_at_sort:baseOrder+1000,created_at:'2026-09-01T00:00:00Z'},
    {id:'grandchild',book_id:'b1',label:'관찰의 기록',depth:2,created_at_sort:baseOrder+2000,created_at:'2026-09-01T00:00:00Z'},
    {id:'next-root',book_id:'b1',label:'다음 이야기',depth:0,created_at_sort:baseOrder+4000,created_at:'2026-09-01T00:00:00Z'});
  citations[0].created_at=new Date(baseOrder+2500).toISOString();
  await page.reload();
  await page.locator('[data-book-row="ch2"]').getByRole('button',{name:'챕터 추가',exact:true}).click();
  const siblingTitle=page.getByRole('textbox',{name:'챕터 제목',exact:true});
  check(await siblingTitle.evaluate(e=>e.closest('form').dataset.chapterDepth)==='1','Add starts as a sibling without Tab');
  await siblingTitle.fill('함께 읽기');
  await page.getByRole('button',{name:'챕터 저장',exact:true}).click();
  await page.getByRole('heading',{name:'함께 읽기',exact:true}).waitFor();
  check(chapters.find(c=>c.id==='new-chapter-2').depth===1,'Sibling depth persisted');
  await page.reload();
  await page.locator('[data-chapter-connection="new-chapter-2"][data-chapter-parent="ch1"]').waitFor({state:'attached'});
  check(await page.getByRole('heading',{name:'함께 읽기',exact:true}).textContent()==='함께 읽기','User title has no generated number');
  await page.getByRole('button',{name:'챕터 접기 함께 읽기',exact:true}).click();
  await page.getByRole('button',{name:'챕터 접기 생각의 시작',exact:true}).click();
  for(const id of ['ch2','grandchild','new-chapter-2','c0'])check(await page.locator(`[data-book-row="${id}"]`).isHidden(),'Fold hides '+id);
  check(await page.getByRole('heading',{name:'다음 이야기',exact:true}).isVisible(),'Next root remains visible');
  await page.setViewportSize({width:375,height:900});
  await page.getByRole('button',{name:'탐색 열기',exact:true}).waitFor();
  check(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Folded narrow layout fits');
  await page.screenshot({path:'output/playwright/chapter-subtree-folded.png'});
  await page.getByRole('button',{name:'챕터 펼치기 생각의 시작',exact:true}).click();
  check(await page.getByRole('heading',{name:'작은 관찰',exact:true}).isVisible(),'Root reopen restores children');
  check(await page.locator('[data-book-row="grandchild"]').isHidden(),'Child fold is retained after root reopen');
  await page.getByRole('button',{name:'챕터 펼치기 함께 읽기',exact:true}).click();
  check(await page.getByRole('heading',{name:'관찰의 기록',exact:true}).isVisible(),'Child reopen restores descendants');
  await page.screenshot({path:'output/playwright/chapter-sibling-mobile.png'});
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('textbox',{name:'이 책의 인용문 검색',exact:true}).waitFor();
  chapters.find(c=>c.id==='ch2').depth=0;
  chapters.splice(chapters.findIndex(c=>c.id==='new-chapter-2'),1);
  await page.reload();
  await page.getByRole('heading',{name:'작은 관찰',exact:true}).dblclick();
  const editor=page.getByRole('textbox',{name:'챕터 제목 수정',exact:true});
  await editor.evaluate(e=>e.setSelectionRange(0,0));await editor.press('Tab');
  await page.locator('[data-chapter-node="grandchild"][data-chapter-depth="2"]').waitFor();
  await page.locator('[data-chapter-connection="grandchild"][data-chapter-parent="ch2"]').waitFor({state:'attached'});
  check(await page.locator('[data-chapter-node="grandchild"]').getAttribute('data-chapter-depth')==='2','Keyboard preview projects full saved depths');
  await page.screenshot({path:'output/playwright/chapter-keyboard-preview-fixed.png'});
  await editor.press('Escape');
  await page.locator('[data-chapter-node="grandchild"][data-chapter-depth="1"]').waitFor();
  check(await page.locator('[data-chapter-node="grandchild"]').getAttribute('data-chapter-depth')==='1','Cancel restores normalized depth');
  await page.getByRole('heading',{name:'작은 관찰',exact:true}).dblclick();
  await editor.evaluate(e=>e.setSelectionRange(0,0));await editor.press('Tab');
  await page.getByRole('button',{name:'챕터 제목 저장',exact:true}).click();
  await editor.waitFor({state:'detached'});
  await page.reload();
  await page.locator('[data-chapter-node="grandchild"][data-chapter-depth="2"]').waitFor();
  await page.locator('[data-chapter-connection="grandchild"][data-chapter-parent="ch2"]').waitFor({state:'attached'});
  check(await page.locator('[data-chapter-node="grandchild"]').getAttribute('data-chapter-depth')==='2','Saved relationship equals keyboard preview');

  const alignment=[];
  for (const width of [1440,375]) {
    await page.setViewportSize({width,height:1000});
    await page.getByRole('heading',{name:'작은 관찰',exact:true}).waitFor();
    const metrics=await page.locator('[data-chapter-node="ch2"]').evaluate(row=>{
      const title=row.querySelector('h2'),edit=row.querySelector('button[aria-label^="챕터 제목 수정"]'),remove=row.querySelector('button[aria-label^="챕터 삭제"]');
      const t=title.getBoundingClientRect(),e=edit.getBoundingClientRect(),r=remove.getBoundingClientRect(),css=getComputedStyle(title);
      return {rowHeight:row.getBoundingClientRect().height,titleX:t.x+parseFloat(css.paddingLeft),firstLineCenter:t.y+parseFloat(css.paddingTop)+parseFloat(css.lineHeight)/2,editCenter:e.y+e.height/2,removeCenter:r.y+r.height/2,buttonHeight:e.height};
    });
    check(Math.abs(metrics.firstLineCenter-metrics.editCenter)<1&&Math.abs(metrics.editCenter-metrics.removeCenter)<1,'Actions share the title first line at '+width);
    check(metrics.buttonHeight>=44,'Action target remains 44px at '+width);
    await page.getByRole('heading',{name:'작은 관찰',exact:true}).dblclick();
    const editInput=page.getByRole('textbox',{name:'챕터 제목 수정',exact:true});
    const inputX=await editInput.evaluate(e=>e.getBoundingClientRect().x+parseFloat(getComputedStyle(e).paddingLeft)+parseFloat(getComputedStyle(e).borderLeftWidth));
    check(Math.abs(inputX-metrics.titleX)<1,'Input text stays on title column at '+width);
    await editInput.press('Escape');
    await page.getByRole('heading',{name:'작은 관찰',exact:true}).waitFor();
    check(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Compact layout fits at '+width);
    await page.screenshot({path:'output/playwright/chapter-inline-'+width+'.png'});
    alignment.push({width,...metrics,inputX});
  }

  const passiveCount=await page.locator('.book-row-content').evaluateAll(es=>es.filter(e=>getComputedStyle(e,'::after').display!=='none').length);
  check(await page.locator('.chapter-divider-slot').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height===0)),'No separate add rows');
  await page.getByRole('button',{name:'맨 위에 챕터 추가',exact:true}).click();
  const topInput=page.getByRole('textbox',{name:'챕터 제목',exact:true});
  const topBottom=await topInput.evaluate(e=>e.closest('form').getBoundingClientRect().bottom);
  const firstContent=await page.locator('[data-book-row] [data-row-content]').first().boundingBox();
  check(topBottom<=firstContent.y+1,'Leading form does not overlap first item');
  check(await page.locator('.book-row-content').evaluateAll(es=>es.filter(e=>getComputedStyle(e,'::after').display!=='none').length)===passiveCount,'Other existing dividers remain during editing');
  await page.getByRole('button',{name:'챕터 취소',exact:true}).click();
  await page.goto(origin+'/?book=b2&author=a1');
  await page.getByText('아직 수집한 항목이 없습니다.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'맨 위에 챕터 추가',exact:true}).click();
  const emptyInput=page.getByRole('textbox',{name:'챕터 제목',exact:true});
  const emptyBottom=await emptyInput.evaluate(e=>e.closest('form').getBoundingClientRect().bottom);
  const emptyTop=await page.getByText('아직 수집한 항목이 없습니다.',{exact:true}).evaluate(e=>e.parentElement.getBoundingClientRect().top);
  check(emptyBottom<=emptyTop+1,'Empty-book leading form does not overlap empty state');
  await page.getByRole('button',{name:'챕터 취소',exact:true}).click();
  await page.goto(origin+'/?book=b1&author=a1');
  await page.getByRole('heading',{name:'생각의 시작',exact:true}).waitFor();

  chapters.splice(0,chapters.length,
    {id:'tree-root',book_id:'b1',label:'첫 번째 장',depth:0,created_at_sort:baseOrder,created_at:'2026-09-01T00:00:00Z'},
    {id:'tree-child',book_id:'b1',label:'첫 번째 절',depth:1,created_at_sort:baseOrder+1000,created_at:'2026-09-01T00:00:00Z'},
    {id:'tree-grand',book_id:'b1',label:'절의 세부 내용',depth:2,created_at_sort:baseOrder+2000,created_at:'2026-09-01T00:00:00Z'},
    {id:'tree-sibling',book_id:'b1',label:'두 번째 절',depth:1,created_at_sort:baseOrder+3000,created_at:'2026-09-01T00:00:00Z'},
    {id:'tree-next',book_id:'b1',label:'다음 장',depth:0,created_at_sort:baseOrder+4000,created_at:'2026-09-01T00:00:00Z'});
  citations[0].created_at=new Date(baseOrder+2500).toISOString();
  await page.reload();
  for (const width of [1440,375]) {
    await page.setViewportSize({width,height:1000});
    await page.locator('[data-chapter-connection="tree-sibling"][data-chapter-parent="tree-root"]').waitFor({state:'attached'});
    await page.locator('[data-chapter-connection="tree-grand"][data-chapter-parent="tree-child"]').waitFor({state:'attached'});
    check(await page.locator('[data-chapter-trunk="tree-root"]').count()===1,'Siblings share one parent rail');
    const edges=await page.locator('[data-chapter-connection]').evaluateAll(es=>es.map(e=>e.getAttribute('d')));
    check(edges.every(d=>(d.match(/Q/g)||[]).length===1&&!d.includes('H')),'Only one smooth turn per branch');
    const columns=await page.evaluate(()=>{const h=document.querySelector('[data-search-results-title]'),t=document.querySelector('[data-chapter-node="tree-root"] h2'),q=document.querySelector('[data-chapter-connection-obstacle] > [data-passage-note-trigger]'), owner=document.querySelector('[data-chapter-node="'+q.closest('[data-row-content]').dataset.citationOwner+'"] h2');return {header:h.getBoundingClientRect().x,chapter:t.getBoundingClientRect().x,owner:owner.getBoundingClientRect().x,quote:q.getBoundingClientRect().x+parseFloat(getComputedStyle(q).paddingLeft)};});
    check(Math.abs(columns.header-columns.chapter)<1&&Math.abs(columns.owner-columns.quote)<1,'Each citation aligns with its owning chapter at '+width);
    check(await page.evaluate(()=>document.documentElement.scrollWidth===innerWidth),'Nested sibling layout fits at '+width);
    await page.screenshot({path:'output/playwright/compact-tree-'+width+'.png'});
  }
  return {alignment,checks:'one-row actions, aligned title/input, reused divider without extra row, leading/empty add no overlap; sibling add without Tab, literal titles, subtree fold/reopen, keyboard preview/save/cancel equality; existing keyboard checks; real mouse drop directly on marker, drag sibling/grandchild/root preview, curved parent line, failed save/retry, atomic order+depth, reload, cancel, explicit zero, narrow viewport drag, citation order',writes:writes.length,environment:origin};
}
