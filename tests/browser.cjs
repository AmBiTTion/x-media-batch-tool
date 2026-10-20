const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const fixture=`<!doctype html><html><head><meta charset="utf-8"><title>X 批量工具测试</title></head><body style="background:#15202b;color:#edf4fa;font:16px/1.6 system-ui;margin:0"><main style="width:620px;max-width:95vw;margin:50px auto"><div style="font-size:12px;color:#74caff;letter-spacing:2px">X MEDIA · LOCAL TEST</div><h1 style="font-size:26px;margin:8px 0 22px">把喜欢的内容，好好留下</h1><article data-testid="tweet" style="border:1px solid #344956;border-radius:18px;padding:24px;margin-bottom:20px"><div style="display:flex;gap:12px;align-items:center"><div style="background:#287ca1;border-radius:50%;width:42px;height:42px;display:grid;place-items:center">D</div><strong>@demo</strong><a style="color:#9badbb;margin-left:auto" href="/demo/status/1234567890"><time datetime="2026-10-18T01:00:00Z">2026-10-18</time></a></div><div data-testid="tweetText" style="margin:20px 0">周末散步，收集一些日常的颜色。<br>这是一条用于验证界面的模拟帖子。</div><div data-testid="tweetPhoto"><a href="/demo/status/1234567890/photo/1"><img style="width:100%;height:200px;object-fit:cover;border-radius:12px" src="https://pbs.twimg.com/media/sample.jpg?format=jpg&name=small"></a></div><div data-testid="videoPlayer"><video style="display:none"></video></div><div role="group" aria-label="帖子操作" style="display:flex;justify-content:space-between;margin-top:15px;color:#9badbb"><span>♡ 128</span><span>↻ 24</span><span>↗ 分享</span></div></article><p style="font-size:12px;color:#8da4b6">模拟页面 · 无真实账号或私人数据</p></main></body></html>`;
const response={data:{tweet:{rest_id:'1234567890',legacy:{extended_entities:{media:[{type:'photo',media_url_https:'https://pbs.twimg.com/media/sample.jpg'},{type:'video',video_info:{variants:[{content_type:'video/mp4',bitrate:256000,url:'https://video.twimg.com/low.mp4'},{content_type:'video/mp4',bitrate:2176000,url:'https://video.twimg.com/high.mp4'}]}}]}}}}};
async function routes(context){
  await context.route('https://x.com/**',r=>r.request().url().includes('/i/api/')?r.fulfill({contentType:'application/json',body:JSON.stringify(response)}):r.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"require-trusted-types-for 'script'"},body:fixture}));
  await context.route('https://pbs.twimg.com/**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="240"><defs><linearGradient id="a"><stop stop-color="#719c8c"/><stop offset="1" stop-color="#eab483"/></linearGradient></defs><rect width="600" height="240" fill="url(#a)"/><circle cx="465" cy="65" r="28" fill="#ffe5b2"/><path d="M0 220L150 70 290 220 400 120 600 240H0" fill="#1e5b61"/><path d="M0 240L130 160 260 240 420 180 600 240" fill="#17383f"/></svg>'}));
}
(async()=>{
 fs.mkdirSync('tests/artifacts',{recursive:true});
 const extension=path.resolve('extension');
 const ext=await chromium.launchPersistentContext(path.resolve('tests/.profiles/v2'),{headless:true,channel:'chromium',locale:'zh-CN',acceptDownloads:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try{
   const worker=ext.serviceWorkers()[0]||await ext.waitForEvent('serviceworker');await worker.evaluate(()=>chrome.storage.local.clear());
   await routes(ext);const page=await ext.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('https://x.com/home');await page.getByRole('button',{name:'下载这条帖子的全部媒体',exact:true}).waitFor();
   assert.equal(await page.getByRole('heading',{name:'保存你想留下的内容'}).isVisible(),false);
   await page.evaluate(()=>fetch('/i/api/test').then(r=>r.json()));
   await page.getByRole('checkbox',{name:'将这条帖子加入批量选择',exact:true}).check();
   await page.getByRole('button',{name:'打开或收起 X 下载工具'}).click();
   await page.getByText('本地 1 帖 · 已选 1 帖',{exact:true}).waitFor();
   const promise=page.waitForEvent('download');await page.getByRole('button',{name:'JSON',exact:true}).click();
   const download=await promise;const data=JSON.parse(fs.readFileSync(await download.path(),'utf8').replace(/^\ufeff/,''));
   assert.equal(data[0].media[1].url,'https://video.twimg.com/high.mp4');
   await page.getByRole('tab',{name:'设置',exact:true}).click();
   await page.getByLabel('界面外观',{exact:true}).selectOption('dark');
   await page.getByLabel('下载媒体时同时保存正文',{exact:true}).check();
   await page.reload();await page.getByRole('button',{name:'打开或收起 X 下载工具'}).click();await page.getByRole('tab',{name:'设置',exact:true}).click();
   assert.equal(await page.getByLabel('界面外观',{exact:true}).inputValue(),'dark');
   assert.equal(await page.getByLabel('下载媒体时同时保存正文',{exact:true}).isChecked(),true);
   await page.getByRole('tab',{name:'帖子列表',exact:true}).click();await page.screenshot({path:'tests/artifacts/v1.2-界面预览.png'});
   await page.getByRole('button',{name:'收起面板',exact:true}).click();
   await page.getByLabel('更多保存选项',{exact:true}).click();await page.screenshot({path:'tests/artifacts/v1.2-单帖菜单预览.png'});await page.getByLabel('更多保存选项',{exact:true}).click();
   await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'打开或收起 X 下载工具'}).click();
   const bounds=await page.getByRole('region',{name:'X 下载工具面板'}).boundingBox();assert.ok(bounds.x>=0 && bounds.x+bounds.width<=390 && bounds.y>=0);
   await page.getByRole('tab',{name:'设置',exact:true}).click();await page.getByLabel('界面外观',{exact:true}).selectOption('light');await page.screenshot({path:'tests/artifacts/v1.2-移动布局预览.png'});
   await page.getByRole('button',{name:'收起面板',exact:true}).click();
   // An article recycled for a different post must get a fresh control binding.
   await page.evaluate(()=>{const a=document.querySelector('article');a.querySelector('a[href*="/status/"]').href='/demo/status/999';a.querySelector('time').textContent='新帖子';});
   await page.waitForFunction(()=>document.querySelector('x-batch-inline')?.dataset.postId==='999');
   assert.equal(await page.locator('article x-batch-inline').count(),1);
   assert.deepEqual(errors,[]);
   console.log('PASS extension: collapsed launcher, per-post controls, MAIN/ISOLATED capture, single selection, real JSON export, settings persistence, recycled article binding, no page errors.');
 }finally{await ext.close()}
 const browser=await chromium.launch({headless:true});
 try{
   const ctx=await browser.newContext({acceptDownloads:true,locale:'zh-CN'});await routes(ctx);
   await ctx.addInitScript({content:`
    const GM_getValue=(key,fallback)=>JSON.parse(localStorage.getItem(key)||'null')||fallback;
    const GM_setValue=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
    const unsafeWindow=window;window.mockDownloads=[];window.mockFail=false;window.mockFailVideo=false;window.mockTexts=[];
    const GM_download=options=>{window.mockDownloads.push(options.name);setTimeout(()=>window.mockFail||(window.mockFailVideo&&options.name.endsWith('.mp4'))?options.onerror({error:'SIMULATED_NETWORK_FAILURE'}):options.onload(),20);};
    const GM_saveText=async(text,name)=>window.mockTexts.push({text,name});
    ${fs.readFileSync('userscript/x-batch-tool.user.js','utf8')}`});
   const page=await ctx.newPage();await page.goto('https://x.com/home');await page.getByRole('button',{name:'下载这条帖子的全部媒体',exact:true}).waitFor();await page.evaluate(()=>fetch('/i/api/test').then(r=>r.json()));
   await page.getByRole('button',{name:'下载这条帖子的全部媒体',exact:true}).click();
   await page.waitForFunction(()=>window.mockDownloads.length===2);await page.waitForFunction(()=>document.querySelector('x-batch-inline').shadowRoot.querySelector('#note').textContent==='完成 2 个媒体');
   await page.getByRole('button',{name:'下载这条帖子的全部媒体',exact:true}).click();
   await page.getByText('已跳过重复文件',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.mockDownloads.length),2);
   await page.getByLabel('更多保存选项',{exact:true}).click();await page.getByRole('button',{name:'重新下载全部',exact:true}).click();
   await page.waitForFunction(()=>window.mockDownloads.length===4);await page.waitForFunction(()=>document.querySelector('x-batch-inline').shadowRoot.querySelector('#note').textContent==='完成 2 个媒体');
   // Select photos-only and force a fresh image identity to exercise failure + retry.
   await page.evaluate(()=>{window.mockFail=true;});
   await page.getByLabel('更多保存选项',{exact:true}).click();await page.getByRole('button',{name:'重新下载全部',exact:true}).click();
   await page.getByText('未全部完成 · 查看任务',{exact:true}).waitFor();
   await page.evaluate(()=>{window.mockFail=false;});
   await page.getByRole('button',{name:'打开或收起 X 下载工具'}).click();await page.getByRole('tab',{name:'下载任务',exact:true}).click();
   await page.getByRole('button',{name:'重试未完成',exact:true}).click();
   await page.getByText('已下载过',{exact:true}).first().waitFor();
   await page.getByRole('tab',{name:'设置',exact:true}).click();await page.getByLabel('下载媒体时同时保存正文',{exact:true}).check();await page.getByLabel('文件命名',{exact:true}).selectOption('date');
   await page.getByRole('button',{name:'收起面板',exact:true}).click();
   await page.getByLabel('更多保存选项',{exact:true}).click();await page.getByRole('button',{name:'保存正文及链接',exact:true}).click();
   await page.waitForFunction(()=>window.mockTexts.length===1);const text=await page.evaluate(()=>window.mockTexts[0]);
   assert.equal(text.name,'demo_2026-10-18_1234567890_text.txt');assert.ok(text.text.includes('https://x.com/demo/status/1234567890'));
   // First media succeeds, second fails: retry only the missing media.
   await page.getByRole('button',{name:'打开或收起 X 下载工具'}).click();await page.getByRole('tab',{name:'设置',exact:true}).click();
   await page.getByLabel('下载媒体时同时保存正文',{exact:true}).uncheck();
   page.once('dialog',d=>d.accept());await page.locator('details.advanced').last().locator('summary').click();await page.getByRole('button',{name:'清空下载去重历史',exact:true}).click();
   await page.getByRole('button',{name:'收起面板',exact:true}).click();
   await page.evaluate(()=>{window.mockDownloads=[];window.mockFailVideo=true;});
   await page.getByRole('button',{name:'下载这条帖子的全部媒体',exact:true}).click();await page.getByText('未全部完成 · 查看任务',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>window.mockDownloads.filter(n=>n.endsWith('.jpg')).length),1);
   await page.evaluate(()=>window.mockFailVideo=false);
   await page.getByRole('button',{name:'查看此帖下载状态',exact:true}).click();
   const failedCard=page.locator('.task.failed').last();await failedCard.getByRole('button',{name:'重试这条',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('x-batch-inline').shadowRoot.querySelector('#note').textContent==='完成 1 个媒体');
   assert.equal(await page.evaluate(()=>window.mockDownloads.filter(n=>n.endsWith('.jpg')).length),1);
   assert.equal(await page.evaluate(()=>window.mockDownloads.filter(n=>n.endsWith('.mp4')).length),3);
   await page.screenshot({path:'tests/artifacts/v1.2-任务预览.png'});
   console.log('PASS userscript: direct per-post queue, duplicate skipping, forced re-download, failure retry, skip previous successes on retry, text saving, filename settings.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
