// Run using playwright-cli run-code on the isolated QA Vite server (dummy same-origin Supabase).
async page => {
  page.setDefaultTimeout(10000);
  await page.unrouteAll({behavior: "ignoreErrors"});
  const origin = page.url().split('/').slice(0, 3).join('/');
  if (origin !== 'http://127.0.0.1:3107') throw new Error('Use isolated QA server 3107');
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const user = {id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'qa@example.invalid',user_metadata:{username:'검토용 독자'},created_at:'2026-09-01T00:00:00Z'};
  const session = {access_token:'qa-only-token',refresh_token:'qa-only-refresh',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+86400,expires_in:86400,user};
  const author = {id:'a1',name:'검토 저자',sort_index:0,is_self:false,created_at:'2026-09-01T00:00:00Z'};
  const book = {id:'b1',title:'삽입 검토용 책',memo:'',sort_index:0,created_at:'2026-09-01T00:00:00Z',author};
  const chapters = [ ['root',0,10,'큰 장'],['child',1,30,'하위 장'],['deep',2,50,'세부 장'],['sibling',1,70,'다음 절'],['last',0,90,'마지막 장'] ].map(([id,depth,n,label])=>({id,depth,label,book_id:'b1',created_at_sort:n,created_at:'2026-09-01T00:00:00Z'}));
  const citations = [20,40,60,80].map(n=>({id:'c'+n,text:'기존 인용문 '+n,kind:'sentence',page:String(100-n),page_sort:100-n,created_at:new Date(n).toISOString(),notes:[],highlights:[],book,author}));
  const writes=[];
  let failNext=false;
  let holdNext=false, releaseWrite=()=>{};
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
        if(holdNext){holdNext=false;await new Promise(resolve=>{releaseWrite=resolve;});}
        if(failNext){failNext=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'QA failure'})});}
        const row={...body,id:body.id||'new-chapter-'+writes.length,created_at:new Date().toISOString(),book,author,notes:[],highlights:[]};
        const collection=table==='citations'?citations:chapters;
        const prior=collection.findIndex(r=>r.id===row.id);if(prior<0)collection.push(row);else collection[prior]=row;
        return reply(row);
      }
      if(table==='profiles') return reply({username:'검토용 독자',preferences:{theme:'day',baseFontPt:14}});
      if(req.method()!=='GET') throw new Error('Unexpected write '+req.method()+' '+table);
      const single=req.headers().accept?.includes('object');
      return reply({profiles:{username:'검토용 독자',preferences:{theme:'day',baseFontPt:14}},authors:single?author:[author],books:single?book:[book],citations,chapter_blocks:chapters,projects:[],author_folders:[],author_folder_memberships:[]}[table]??[]);
    }
    return route.continue();
  });
  await page.addInitScript(s=>{localStorage.clear();localStorage.setItem('autoLoginEnabled','true');localStorage.setItem('sb-127-auth-token',JSON.stringify(s));},session);
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(origin+'/?author=a1&book=b1');
  await page.getByRole('heading',{name:'하위 장',exact:true}).waitFor();
  const input=page.getByRole('textbox',{name:'인용문 입력',exact:true});
  const marker=page.getByTestId('book-insertion-preview');
  const toggle=page.getByRole('switch',{name:'챕터 입력'});
  check(await toggle.getAttribute('aria-checked')==='false','default citation');
  await page.locator('[data-book-row="c60"]').getByRole('button',{name:'여기에 삽입',exact:true}).click();
  check(await marker.getAttribute('data-insertion-position')==='65','selected boundary');
  await input.fill('새 인용문');
  await input.evaluate(e=>e.setSelectionRange(0,0));
  await input.press('Backspace');
  check(await marker.getAttribute('data-insertion-position')==='45','out to parent direct content');
  check((await marker.innerText()).includes('하위 장 안'),'parent label');
  check(await input.inputValue()==='새 인용문','hierarchy preserves content');
  await input.press('Tab');
  check(await marker.getAttribute('data-insertion-position')==='65','in to child direct content');
  await input.evaluate(e=>e.setSelectionRange(1,1));await input.press('Space');
  check(await input.inputValue()==='새  인용문','ordinary space away from beginning');
  await input.fill('새 인용문');
  await page.getByRole('textbox',{name:'페이지',exact:true}).fill('1');
  await Promise.all([page.waitForResponse(r=>r.url().includes('/rest/v1/citations') && r.request().method()==='POST'),page.getByRole('button',{name:'문장 저장',exact:true}).click()]);
  await marker.waitFor({state:'detached'});
  await page.waitForFunction(()=>!document.querySelector('[data-testid="book-insertion-preview"]'));
  check(writes.at(-1).body.created_at_sort===65 && writes.at(-1).body.page==='1','save uses exact marker and preserves page');
  const added=citations.find(c=>c.text==='새 인용문');
  await page.locator(`[data-book-row="${added.id}"] [data-row-content]`).waitFor();
  check(await page.locator(`[data-book-row="${added.id}"] [data-row-content]`).getAttribute('data-citation-owner')==='deep','saved owner matches preview');
  await page.reload();await page.getByRole('heading',{name:'세부 장',exact:true}).waitFor();
  check(await page.locator(`[data-book-row="${added.id}"] [data-row-content]`).getAttribute('data-citation-owner')==='deep','reload keeps position');
  await page.locator('[data-book-row="child"]').getByRole('button',{name:'여기에 삽입',exact:true}).click();
  await toggle.click();
  const title=page.getByRole('textbox',{name:'챕터 제목 입력'});
  await title.fill('새 챕터');await title.evaluate(e=>e.setSelectionRange(0,0));await title.press('Tab');
  check(await marker.getAttribute('data-chapter-depth')==='2','chapter level preview');
  const pos=Number(await marker.getAttribute('data-insertion-position'));
  failNext=true;await page.getByRole('button',{name:'챕터 저장',exact:true}).click();
  await page.getByText('저장하지 못했습니다. 내용과 삽입 위치를 유지했습니다. 다시 시도해 주세요.').waitFor();
  check(await title.inputValue()==='새 챕터','failed chapter retains draft');
  check(Number(await marker.getAttribute('data-insertion-position'))===pos,'failed chapter retains position');
  await page.getByRole('button',{name:'챕터 저장',exact:true}).click();
  await page.getByRole('heading',{name:'새 챕터',exact:true}).waitFor();
  check(writes.at(-1).body.created_at_sort===pos && writes.at(-1).body.depth===2,'chapter saves preview');
  await page.locator('[data-book-row="c60"]').getByRole('button',{name:'여기에 삽입',exact:true}).click();
  await input.fill('접힌 대상 저장');
  await page.getByRole('button',{name:'챕터 접기 큰 장',exact:true}).click();
  await Promise.all([page.waitForResponse(r=>r.url().includes('/rest/v1/citations') && r.request().method()==='POST'),page.getByRole('button',{name:'문장 저장',exact:true}).click()]);
  await page.getByRole('button',{name:'챕터 접기 큰 장',exact:true}).waitFor();
  await page.getByText('접힌 대상 저장',{exact:true}).waitFor();
  await input.fill('끝에 저장');await Promise.all([page.waitForResponse(r=>r.url().includes('/rest/v1/citations') && r.request().method()==='POST'),page.getByRole('button',{name:'문장 저장',exact:true}).click()]);
  await page.getByText('끝에 저장',{exact:true}).waitFor();
  check(writes.at(-1).body.created_at_sort>90,'default end after last chapter');
  await input.fill('ABC');await input.evaluate(e=>e.setSelectionRange(1,1));await input.press('Delete');
  check(await input.inputValue()==='AC','ordinary forward delete');
  await input.evaluate(e=>e.setSelectionRange(0,1));await input.press('Backspace');
  check(await input.inputValue()==='C','selection deletes normally');
  await input.evaluate(e=>e.setSelectionRange(1,1));await input.press('Tab');
  check(await toggle.evaluate(e=>e===document.activeElement),'Tab outside start moves focus');
  await page.locator('[data-book-row="c20"]').getByRole('button',{name:'여기에 삽입',exact:true}).click();
  await toggle.click();
  await title.fill('화면을 바꿔도 남는 제목');
  const retainedPosition=await marker.getAttribute('data-insertion-position');
  await page.setViewportSize({width:375,height:850});
  await page.waitForFunction(()=>document.querySelector('.citation-composer textarea')?.value==='화면을 바꿔도 남는 제목');
  check(await toggle.getAttribute('aria-checked')==='true' && await marker.getAttribute('data-insertion-position')===retainedPosition,'breakpoint keeps mode and insertion');
  await page.setViewportSize({width:1440,height:1000});
  await page.getByRole('button',{name:author.name+'의 책',exact:true}).click();
  await page.getByRole('button',{name:book.title+' 열기',exact:true}).click();
  check(await title.inputValue()==='화면을 바꿔도 남는 제목','author navigation preserves text');
  check(await marker.getAttribute('data-insertion-position')===retainedPosition,'author navigation preserves marker');
  for(const failure of [false,true]) {
    await title.fill(failure?'실패해도 남는 제목':'이동 중 저장되는 제목');
    holdNext=true;failNext=failure;
    await Promise.all([page.waitForRequest(r=>r.url().includes('/rest/v1/chapter_blocks')&&r.method()==='POST'),page.getByRole('button',{name:'챕터 저장',exact:true}).click()]);
    await page.setViewportSize({width:375,height:850});
    check(await page.getByRole('button',{name:'챕터 저장',exact:true}).isDisabled(),'pending lock survives remount');
    check(await title.getAttribute('readonly')!==null,'pending text remains locked');
    releaseWrite();
    if(failure) {
      await page.getByText('저장하지 못했습니다. 내용과 삽입 위치를 유지했습니다. 다시 시도해 주세요.').waitFor();
      check(await title.inputValue()==='실패해도 남는 제목','failure restores draft after remount');
      check(await marker.count()===1,'failure keeps marker');
    } else {
      await page.getByRole('heading',{name:'이동 중 저장되는 제목',exact:true}).waitFor();
      check(await input.inputValue()==='' && await toggle.getAttribute('aria-checked')==='false','success clears current remount');
    }
    await page.setViewportSize({width:1440,height:1000});
    if(!failure){await page.locator('[data-book-row="c20"]').getByRole('button',{name:'여기에 삽입',exact:true}).click();await toggle.click();}
  }
  await toggle.click();
  await page.setViewportSize({width:375,height:850});
  await page.getByRole('button',{name:'맨 위에 삽입'}).click();
  check(await marker.getAttribute('data-chapter-depth')==='0','top marker depth');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);
  check(!overflow,'mobile width has no horizontal overflow');
  await page.screenshot({path:'/tmp/book-insertion-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'/tmp/book-insertion-desktop.png',fullPage:true});
  console.log(JSON.stringify({checks:'position, in/out, ordinary input, save, page, reload, switch, chapter failure/retry, 375px',writes:writes.map(w=>({table:w.table,position:w.body.created_at_sort,depth:w.body.depth}))}));
}
