// Produce transparent, bilingual installation slides + browser usage demonstrations.
// Own routed fixture, synthetic post; native download saves the generated PNG only.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
(async()=>{
 fs.mkdirSync('dist/demo',{recursive:true});fs.mkdirSync('docs/images',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  const draw=await browser.newPage({viewport:{width:600,height:240}});
  await draw.setContent('<svg id="landscape" xmlns="http://www.w3.org/2000/svg" width="600" height="240"><defs><linearGradient id="a"><stop stop-color="#719c8c"/><stop offset="1" stop-color="#eab483"/></linearGradient></defs><rect width="600" height="240" fill="url(#a)"/><circle cx="465" cy="65" r="28" fill="#ffe5b2"/><path d="M0 220L150 70 290 220 400 120 600 240H0" fill="#1e5b61"/><path d="M0 240L130 160 260 240 420 180 600 240" fill="#17383f"/></svg>');
  const image=await draw.locator('#landscape').screenshot();await draw.close();
  for(const language of ['en','zh-CN']){
   const en=language==='en',slug=en?'en':'zh-CN';
   const words=en?{title:'Keep what matters to you',post:'Weekend colors. A synthetic post for this installation and usage demo.',fixture:'Synthetic test page · no personal account data',notice:'Demo: a generated PNG is downloaded; real X video downloads are not shown.'}:{title:'把喜欢的内容，好好留下',post:'周末散步，收集一些日常的颜色。这是一条用于演示安装和使用的模拟帖子。',fixture:'模拟测试页面 · 无真实账号或私人数据',notice:'演示仅下载本机生成的 PNG，不展示真实 X 视频下载。'};
   const context=await browser.newContext({locale:en?'en-US':'zh-CN',viewport:{width:1280,height:820},acceptDownloads:true,recordVideo:{dir:'dist/.videos',size:{width:1280,height:820}}});
   await context.route('https://demo.local/**',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><html><meta charset="utf-8"><body style="margin:0;background:#11212d;color:#edf6ff;font:20px/1.6 system-ui;padding:65px"><div style="color:#79cfff;font-size:13px;letter-spacing:2px">X MEDIA BATCH TOOL · v1.3.0</div><h1>${en?'Install in Chrome, then save a post':'Chrome 安装与单帖下载演示'}</h1><ol style="line-height:2.3"><li>${en?'Download the Chrome ZIP from GitHub Releases and extract it.':'从 GitHub Release 下载 Chrome ZIP 并解压。'}</li><li>${en?'Open chrome://extensions/ and enable Developer mode.':'打开 chrome://extensions/，开启开发者模式。'}</li><li>${en?'Choose Load unpacked → select the extension folder.':'点击“加载已解压的扩展程序”，选择 extension 文件夹。'}</li><li>${en?'Refresh X. Download buttons appear under loaded posts.':'刷新 X，已加载帖子下方会出现下载按钮。'}</li></ol><p style="font-size:15px;color:#a7bac7">${en?'Alternative: import the .user.js file into Tampermonkey.':'油猴版：将 .user.js 文件导入 Tampermonkey 后刷新 X。'}</p><p style="font-size:14px;color:#ffd99e">${en?'Installation steps are illustrated. The next screen is a synthetic browser demo, not a real X account.':'这里展示安装步骤说明；接下来是模拟网页中的真实界面操作，并非真实 X 账号。'}</p></body></html>`}));
   await context.route('https://x.com/**',r=>{let html=fs.readFileSync('tests/fixtures/demo.html','utf8');for(const[key,value]of Object.entries(words))html=html.split('{{'+key+'}}').join(value);return r.fulfill({contentType:'text/html',body:html,headers:{'Content-Security-Policy':"require-trusted-types-for 'script'"}});});
   await context.route('https://pbs.twimg.com/**',r=>r.fulfill({contentType:'image/png',body:image}));
   await context.addInitScript({content:`if(location.hostname==='x.com'){
    const GM_getValue=(k,f)=>JSON.parse(localStorage.getItem(k)||'null')||f;
    const GM_setValue=(k,v)=>localStorage.setItem(k,JSON.stringify(v));const unsafeWindow=window;
    const GM_download=o=>{fetch(o.url).then(r=>r.blob()).then(blob=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=o.name;a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);o.onload()},400)}).catch(e=>o.onerror({error:e.message}));};
    ${fs.readFileSync('userscript/x-batch-tool.user.js','utf8')}
   }`});
   const page=await context.newPage(),video=page.video();
   await page.goto('https://demo.local/install');await page.screenshot({path:`docs/images/install-${slug}.png`});await page.waitForTimeout(6500);
   await page.goto('https://x.com/home');await page.getByRole('button',{name:en?'Download all media in this post':'下载这条帖子的全部媒体',exact:true}).waitFor();await page.waitForTimeout(1600);
   await page.getByRole('button',{name:en?'Open or collapse X Media Tool':'打开或收起 X 下载工具',exact:true}).click();await page.waitForTimeout(1700);
   await page.getByRole('button',{name:en?'Got it':'知道了',exact:true}).click();await page.getByRole('tab',{name:en?'Settings':'设置',exact:true}).click();await page.waitForTimeout(2200);await page.screenshot({path:`docs/images/settings-${slug}.png`});
   await page.getByRole('button',{name:en?'Collapse panel':'收起面板',exact:true}).click();await page.getByLabel(en?'More save options':'更多保存选项',{exact:true}).click();await page.screenshot({path:`docs/images/post-menu-${slug}.png`});await page.waitForTimeout(2000);
   const pending=page.waitForEvent('download');await page.getByRole('button',{name:en?'Download images only':'仅下载图片',exact:true}).click();const dl=await pending;const downloaded=await dl.path();if(!fs.readFileSync(downloaded).equals(image))throw Error('PNG mismatch');
   await page.getByText(en?'Media saved: 1':'完成 1 个媒体',{exact:true}).waitFor();await page.waitForTimeout(1500);
   await page.getByRole('button',{name:en?"View this post's download status":'查看此帖下载状态',exact:true}).click();await page.getByText(en?'Completed':'已完成',{exact:true}).waitFor();await page.screenshot({path:`docs/images/tasks-${slug}.png`});await page.waitForTimeout(2500);
   await page.getByRole('tab',{name:en?'Posts':'帖子列表',exact:true}).click();await page.screenshot({path:`docs/images/panel-${slug}.png`});await page.waitForTimeout(1800);
   await context.close();await video.saveAs(`dist/demo/x-media-batch-tool-${slug}-v1.3.0.webm`);
   console.log('Created installation/usage demo and verified generated PNG download:',language);
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
