const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const locale of ['en-US','zh-TW']){
   const context=await browser.newContext({locale,viewport:{width:390,height:844}});
   await context.route('https://x.com/**',r=>r.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"require-trusted-types-for 'script'"},body:'<!doctype html><html><body><article data-testid="tweet"><a href="/demo/status/123"><time datetime="2026-10-20T00:00:00Z">Today</time></a><div data-testid="tweetText">Test post</div><div data-testid="tweetPhoto"><img src="https://pbs.twimg.com/media/test.jpg?name=small"></div></article></body></html>'}));
   await context.route('https://pbs.twimg.com/**',r=>r.fulfill({body:''}));
   await context.addInitScript({content:`
    const GM_getValue=(k,f)=>JSON.parse(localStorage.getItem(k)||'null')||f;
    const GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
    const unsafeWindow=window;window.mockCount=0;window.failDownload=false;
    const GM_download=o=>{window.mockCount++;setTimeout(()=>window.failDownload?o.onerror({error:'下载来源不受支持'}):o.onload(),400);};
    ${fs.readFileSync('userscript/x-batch-tool.user.js','utf8')}`});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('https://x.com/home');
   const initial=locale==='en-US'?'en':'zh-CN';
   await page.locator('#x-batch-tool-host').waitFor();
   assert.equal(await page.locator('#x-batch-tool-host').getAttribute('lang'),initial);
   const open=()=>page.locator('#x-batch-tool-host').locator('.launcher').click();
   await open();
   if(initial==='en'){
    await page.getByText('Getting started',{exact:true}).waitFor();
    assert.equal(await page.getByRole('link',{name:'Installation and usage guide'}).getAttribute('href'),'https://github.com/AmBiTTion/x-media-batch-tool/blob/main/docs/INSTALL.en.md');
    await page.getByRole('button',{name:'Got it',exact:true}).click();
    await page.getByRole('tab',{name:'Settings',exact:true}).click();await page.getByLabel('Interface language',{exact:true}).selectOption('zh-CN');
   }else{
    await page.getByRole('button',{name:'知道了',exact:true}).click();await page.getByRole('tab',{name:'设置',exact:true}).click();
   }
   await page.getByLabel('界面语言',{exact:true}).selectOption('en');
   await page.getByRole('button',{name:'Collapse panel',exact:true}).click();
   await page.getByRole('checkbox',{name:'Add this post to batch selection',exact:true}).check();
   await page.getByRole('button',{name:'Download all media in this post',exact:true}).click();
   await open();await page.getByRole('tab',{name:'Settings',exact:true}).click();await page.getByLabel('Interface language',{exact:true}).selectOption('zh-CN');
   await page.getByRole('tab',{name:'下载任务',exact:true}).click();await page.getByText('已完成',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>window.mockCount),1);
   await page.getByRole('tab',{name:'设置',exact:true}).click();await page.getByLabel('界面语言',{exact:true}).selectOption('en');
   await page.getByRole('tab',{name:'Tasks',exact:true}).click();await page.getByText('Completed',{exact:true}).waitFor();
   await page.reload();await open();await page.getByText('Local posts: 1 · Selected: 1',{exact:true}).waitFor();
   assert.equal(await page.getByText('Getting started',{exact:true}).count(),0);
   await page.getByRole('tab',{name:'Settings',exact:true}).click();assert.equal(await page.getByLabel('Interface language',{exact:true}).inputValue(),'en');
   await page.getByLabel('Interface language',{exact:true}).selectOption('auto');
   assert.equal(await page.locator('#x-batch-tool-host').getAttribute('lang'),initial);
   if(initial==='en'){
    await page.getByRole('button',{name:'Collapse panel',exact:true}).click();
    await page.evaluate(()=>window.failDownload=true);
    await page.getByLabel('More save options',{exact:true}).click();await page.getByRole('button',{name:'Download again',exact:true}).click();
    await page.getByText('Incomplete · view tasks',{exact:true}).waitFor();
    await page.getByRole('button',{name:"View this post's download status",exact:true}).click();
    await page.getByText('demo_123_1.jpg：Download source not supported',{exact:true}).count();
    assert.ok((await page.locator('.error-text').last().textContent()).includes('Download source not supported'));
    await page.getByRole('tab',{name:'Settings',exact:true}).click();await page.getByLabel('Interface language',{exact:true}).selectOption('zh-CN');await page.getByRole('tab',{name:'下载任务',exact:true}).click();
    assert.ok((await page.locator('.error-text').last().textContent()).includes('下载来源不受支持'));
    await page.getByRole('tab',{name:'设置',exact:true}).click();await page.locator('details.advanced').last().locator('summary').click();
    let confirmation='';page.once('dialog',async d=>{confirmation=d.message();await d.dismiss();});await page.getByRole('button',{name:'清空下载去重历史',exact:true}).click();
    assert.ok(confirmation.includes('清空去重历史'));
   }
   await page.locator('#x-batch-tool-host').locator('#panel').evaluate(el=>{if(el.scrollWidth>el.clientWidth+1)throw Error('Panel horizontal overflow');});
   assert.deepEqual(errors,[]);await context.close();
  }
  // Extension chrome metadata and runtime dictionary must stay in sync.
  const manifest=JSON.parse(fs.readFileSync('extension/manifest.json','utf8'));assert.equal(manifest.default_locale,'en');assert.equal(manifest.version,'1.3.0');
  for(const locale of ['en','zh_CN']){const m=JSON.parse(fs.readFileSync(`extension/_locales/${locale}/messages.json`,'utf8'));assert.ok(m.extensionName.message.length<=75);assert.ok(m.extensionDescription.message.length<=132);}
  console.log('PASS i18n: browser language detection, saved override and auto reset, immediate live switch during active download, selection/task preservation, onboarding dismissal, localized task states, mobile layout, manifest locales.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
