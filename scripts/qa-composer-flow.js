// Run with playwright-cli run-code --filename scripts/qa-composer-flow.js on the isolated QA server at port 3107.
// Use ?qa=large for the night theme with 24pt text. All data and writes are mocked locally.
async page => {
  page.setDefaultTimeout(10000);
  await page.unrouteAll({behavior: "ignoreErrors"});
  const origin = new URL(page.url()).origin;
  const preferences = page.url().includes('qa=large') ? {theme:'night',baseFontPt:24} : {theme:'day',baseFontPt:14};
  if (origin !== 'http://127.0.0.1:3107') throw new Error('Use isolated QA server 3107');
  await page.goto('about:blank');
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const user = {id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'qa@example.invalid',user_metadata:{username:'검토용 독자'},created_at:'2026-09-01T00:00:00Z'};
  const session = {access_token:'qa-only-token',refresh_token:'qa-only-refresh',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+86400,expires_in:86400,user};
  const author = {id:'a1',name:'검토 저자',sort_index:0,is_self:false,created_at:'2026-09-01T00:00:00Z'};
  const book = {id:'b1',title:'삽입 검토용 책',memo:'',sort_index:0,created_at:'2026-09-01T00:00:00Z',author};
  const chapters = [ ['root',0,10,'큰 장'],['child',1,30,'하위 장'],['deep',2,50,'세부 장'],['sibling',1,70,'다음 절'],['last',0,90,'마지막 장'] ].map(([id,depth,n,label])=>({id,depth,label,book_id:'b1',created_at_sort:n,created_at:'2026-09-01T00:00:00Z'}));
  const citations = [20,40,60,80].map(n=>({id:'c'+n,text:'기존 인용문 '+n,kind:'sentence',page:String(100-n),page_sort:100-n,created_at:new Date(n).toISOString(),notes:[],highlights:[],book,author}));
  for(let i=0;i<30;i++) citations.push({...citations[0], id:'extra'+i, text:'긴 목록에서 저장 위치를 확인하는 문장 '+i+' 내용입니다. '.repeat(8), created_at:new Date(100+i).toISOString()});
  const writes=[];
  let failNext=false;
  await page.route('**/*',async route=>{
    const req=route.request(), raw=req.url(), url={origin:raw.split('/').slice(0,3).join('/'),pathname:'/'+raw.split('/').slice(3).join('/').split('?')[0]};
    if(url.origin!==origin)return route.abort();
    const reply=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
    if(url.pathname.startsWith('/auth/v1/')) return reply(url.pathname.endsWith('/user')?user:session);
    if(url.pathname==='/api/book-metadata') return reply({metadata:null});
    if(url.pathname.startsWith('/rest/v1/')) {
      const table=url.pathname.split('/').pop();
      if(req.method()==='POST' && ['citations','chapter_blocks'].includes(table)) {
        const body=req.postDataJSON(); writes.push({table,body});
        if(failNext){failNext=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA failure'})});}
        const row={...body,id:body.id||'new-chapter-'+writes.length,created_at:new Date().toISOString(),book,author,notes:[],highlights:[]};
        const collection=table==='citations'?citations:chapters;
        const prior=collection.findIndex(r=>r.id===row.id);if(prior<0)collection.push(row);else collection[prior]=row;
        return reply(row);
      }
      if(table==='citations' && req.method()==='GET' && new URL(raw).searchParams.has('id')) { const id=new URL(raw).searchParams.get('id').slice(3); const found=citations.filter(c=>c.id===id); return reply(req.headers().accept?.includes('object') ? found[0]??null : found); }
      if(table==='profiles') return reply({username:'검토용 독자',preferences});
      if(req.method()!=='GET') throw new Error('Unexpected write '+req.method()+' '+table);
      const single=req.headers().accept?.includes('object'); if(!single && Number(new URL(raw).searchParams.get('offset')||0)>0) return reply([]);
      return reply({profiles:{username:'검토용 독자',preferences},authors:single?author:[author],books:single?book:[book],citations,chapter_blocks:chapters,projects:[],author_folders:[],author_folder_memberships:[]}[table]??[]);
    }
    return route.continue();
  });
  await page.addInitScript(s=>{localStorage.clear();localStorage.setItem('autoLoginEnabled','true');localStorage.setItem('sb-127-auth-token',JSON.stringify(s));},session);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(origin+'/?author=a1&book=b1');
  await page.getByRole('heading',{name:'하위 장',exact:true}).waitFor();

  const input=page.locator('.book-citation-composer textarea');
  const scroll=page.locator('[data-archive-scroll]');
  const modes=page.getByRole('radiogroup',{name:'입력 종류'});
  const chapter=page.getByRole('radio',{name:'챕터',exact:true});
  const quote=page.getByRole('radio',{name:'인용문',exact:true});
  await input.fill('보존할 문장');
  await input.evaluate(e=>e.setSelectionRange(2,2));
  await page.getByRole('textbox',{name:'페이지',exact:true}).fill('67');
  await chapter.locator('..').click();
  check(await input.evaluate(e=>e===document.activeElement && e.selectionStart===2),'kind click restores the draft caret');
  await page.keyboard.insertText('새');
  check(await input.inputValue()==='보존새할 문장','typing immediately after a kind click edits the draft');
  await quote.locator('..').click();
  check(await input.evaluate(e=>e===document.activeElement),'returning to quote entry restores focus');
  check(await page.getByRole('textbox',{name:'페이지',exact:true}).inputValue()==='67','kind changes preserve the page');
  await quote.focus();
  await quote.press('ArrowRight');
  check(await chapter.isChecked() && await chapter.evaluate(e=>e===document.activeElement),'keyboard arrows keep focus in the kind group');
  await chapter.press('ArrowLeft');
  check(await quote.isChecked() && await quote.evaluate(e=>e===document.activeElement),'keyboard arrows return to the quote control');
  await input.fill('');
  await page.getByRole('textbox',{name:'페이지',exact:true}).fill('');
  const rows=[];
  await page.locator('[data-book-row="c60"]').getByRole('button',{name:'여기에 삽입',exact:true}).click();
  for (const width of [1800,1440,1366,1280,1024,768,390,375,320]) {
    await page.setViewportSize({width,height:900});
    await chapter.check();
    const inward=page.getByRole('button',{name:'한 단계 하위로'}); if(await inward.isEnabled()) await inward.click();
    const controls=page.getByRole('group',{name:'챕터 단계 변경'});
    const a=await modes.boundingBox(), b=await controls.boundingBox();
    const centerA=a.y+a.height/2,centerB=b.y+b.height/2;
    check(Math.abs(centerA-centerB)<2,'aligned chapter controls at '+width);
    const overflow=await page.locator('.book-citation-composer').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
    check(overflow.scroll<=overflow.width+1,'composer overflow at '+width+': '+JSON.stringify(overflow));
    rows.push({width,delta:Math.abs(centerA-centerB)});
    check(await controls.getByRole('button').count()===2,'both depth arrows remain available');
    await quote.check();
    const quoteOverflow=await page.locator('.book-citation-composer').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
    check(quoteOverflow.scroll<=quoteOverflow.width+1,'quote composer overflow at '+width+': '+JSON.stringify(quoteOverflow));
  }
  await page.setViewportSize({width:1366,height:768});
  await page.locator('.chapter-end-divider').getByRole('button',{name:'여기에 삽입',exact:true}).click();
  await input.fill('맨 아래 새 인용문');
  await page.getByRole('button',{name:'문장 저장',exact:true}).click();
  const saved=page.getByText('맨 아래 새 인용문',{exact:true});
  await saved.waitFor();
  await page.waitForTimeout(200);
  check(await input.evaluate(e=>e===document.activeElement),'input retains focus after save');
  const bottom=await saved.boundingBox(), viewport=await scroll.boundingBox(), composer=await page.locator('.book-citation-composer').boundingBox();
  check(bottom.y>=viewport.y && bottom.y+bottom.height<=viewport.y+viewport.height+1,'saved quote visible');
  check(composer.y-(bottom.y+bottom.height)<130,'last quote directly above composer');
  const marker=page.getByTestId('book-insertion-preview');
  check(await marker.count()===0,'append needs no separate insertion marker');
  await page.screenshot({path:'/tmp/book-flow-bottom.png'});
  await page.locator('[data-book-row="c20"]').getByRole('button',{name:'여기에 삽입',exact:true}).click();
  await input.fill('중간에 새 인용문');
  await page.getByRole('button',{name:'문장 저장',exact:true}).click();
  const middle=page.getByText('중간에 새 인용문',{exact:true});
  await middle.waitFor();
  await page.waitForTimeout(250);
  check(await input.evaluate(e=>e===document.activeElement),'input retains focus after middle save');
  const middleBox=await middle.boundingBox(), middleView=await scroll.boundingBox();
  check(await marker.evaluate(e=>e.getBoundingClientRect().height===0 && !e.querySelector('svg') && getComputedStyle(e,'::before').borderTopStyle==='dashed'),'middle insertion uses only a dashed boundary');
  check(middleBox.y>=middleView.y && middleBox.y+middleBox.height<=middleView.y+middleView.height+1,'middle quote visible');
  await input.fill('연속 입력 확인');
  await input.press('Enter');
  check(await page.getByRole('textbox',{name:'페이지',exact:true}).evaluate(e=>e===document.activeElement),'Enter advances to page');
  await page.getByRole('textbox',{name:'페이지',exact:true}).press('Enter');
  await page.getByText('연속 입력 확인',{exact:true}).waitFor();
  await page.waitForTimeout(250);
  check(await input.evaluate(e=>e===document.activeElement),'Enter save returns to next input');
  await chapter.check();
  const title=page.getByRole('textbox',{name:'챕터 제목 입력'});
  await title.fill('실패해도 남길 제목');
  failNext=true;
  await page.getByRole('button',{name:'챕터 저장',exact:true}).click();
  await page.getByText('저장하지 못했습니다. 내용과 삽입 위치를 유지했습니다. 다시 시도해 주세요.',{exact:true}).waitFor();
  check(await title.inputValue()==='실패해도 남길 제목','failure retains chapter title');
  await page.getByRole('button',{name:'챕터 저장',exact:true}).click();
  await page.getByRole('heading',{name:'실패해도 남길 제목',exact:true}).waitFor();
  check(await quote.isChecked(),'chapter save returns to quote entry');
  await page.screenshot({path:'/tmp/book-flow-chapter.png'});
  console.log(JSON.stringify({alignment:rows,bottomGap:composer.y-(bottom.y+bottom.height),checks:'append, middle insertion, dashed boundary, continued typing, page and Enter save, chapter failure and retry'}));
}
