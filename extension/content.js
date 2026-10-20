chrome.storage.local.get('x-batch-v1').then(initial => {
const GM_getValue = (key, fallback) => initial[key] || fallback;
const GM_setValue = (key, value) => { chrome.storage.local.set({[key]:value}).catch(e => console.error('[X Batch] 保存失败',e)); };
const GM_download = options => {
  chrome.runtime.sendMessage({type:'X_BATCH_DOWNLOAD', url:options.url, name:options.name}, reply => {
    if (chrome.runtime.lastError) options.onerror({error:chrome.runtime.lastError.message});
    else if (reply?.ok) options.onload();
    else options.onerror({error:reply?.error || '下载失败'});
  });
};
const GM_saveText = (text,name) => new Promise((resolve,reject) => {
  chrome.runtime.sendMessage({type:'X_BATCH_SAVE_TEXT',text,name},reply=>{
    if(chrome.runtime.lastError)reject(new Error(chrome.runtime.lastError.message));
    else if(reply?.ok)resolve();else reject(new Error(reply?.error || '正文保存失败'));
  });
});
// ==UserScript==
// @name         X 批量保存与媒体下载
// @namespace    local.x.batch.tool
// @version      1.2.0
// @description  本地整理帖子、导出 JSON/CSV、下载原图与最高可用 MP4
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      pbs.twimg.com
// @connect      video.twimg.com
// @noframes
// ==/UserScript==

(() => {
  'use strict';
  const KEY = 'x-batch-v1';
  let storageWarning = '';
  let saved = { posts: [], history: [] };
  try { saved = GM_getValue(KEY, saved) || saved; }
  catch (e) { storageWarning = '本地存储读取失败，本次使用临时记录'; console.warn('[X Batch]', e); }
  if (!Array.isArray(saved.posts)) saved.posts = [];
  if (!Array.isArray(saved.history)) saved.history = [];
  const defaults={inline:true,skipSaved:true,saveText:false,naming:'author',theme:'auto',interval:750,maxRounds:100};
  const settings={...defaults,...saved.settings};
  settings.interval=Math.max(300,Math.min(10000,Number(settings.interval)||750));
  settings.maxRounds=Math.max(1,Math.min(300,Number(settings.maxRounds)||100));
  const posts=new Map(saved.posts.map(p=>[p.id,p]));
  const history=new Set(saved.history);
  const mediaCache=new Map();
  let tasks=Array.isArray(saved.tasks)?saved.tasks.filter(t=>t.post && Array.isArray(t.errors)).map(t=>({...t,state:['queued','running'].includes(t.state)?'interrupted':t.state})):[];
  let panel,list,status,search,launcher,toast,busy=false,stop=false,collecting=false,sequence=0,currentTab='posts',filter='all',toastTimer;
  const tabs={},views={};
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const say=(text,tone='info')=>{
    if(status){status.textContent=text;status.dataset.tone=tone;}
    if(toast && panel?.hidden){toast.textContent=text;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,6000);}
  };
  const persist=()=>{try{GM_setValue(KEY,{posts:[...posts.values()],history:[...history],settings,tasks:[...tasks.filter(t=>['queued','running'].includes(t.state)),...tasks.filter(t=>!['queued','running'].includes(t.state)).slice(-100)]});}catch(e){say('本地存储失败：请先导出备份。'+e.message,'error');}};
  const safeName=s=>s.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,160);
  function original(src) {
    let u; try { u = new URL(src); } catch (_) { return null; }
    if (u.hostname !== 'pbs.twimg.com' || !u.pathname.startsWith('/media/')) return null;
    const format = u.searchParams.get('format') || u.pathname.match(/\.(jpe?g|png|webp)$/i)?.[1] || 'jpg';
    u.searchParams.set('format', format); u.searchParams.set('name', 'orig');
    return { url: u.href, ext: format, type: 'photo' };
  }
  function bestVideo(m) {
    return (m.video_info?.variants || []).filter(v => v.content_type === 'video/mp4' && /^https:\/\/video\.twimg\.com\//.test(v.url))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  }
  function extract(root) {
    const stack = [root]; let count = 0;
    while (stack.length && ++count < 100000) {
      const v = stack.pop(); if (!v || typeof v !== 'object') continue;
      const legacy = v.legacy || v;
      const id = v.rest_id || legacy.id_str;
      const entities = legacy.extended_entities?.media;
      if (/^\d+$/.test(id || '') && Array.isArray(entities)) {
        const media = entities.flatMap(m => {
          if (m.type === 'photo') { const p = original(m.media_url_https || 'https://invalid/'); return p ? [p] : []; }
          const best = bestVideo(m);
          return best ? [{ url: best.url, ext: 'mp4', type: m.type, bitrate: best.bitrate || 0 }] : [];
        });
        mediaCache.set(id, media);
        if (posts.has(id)) { posts.get(id).media = media; posts.get(id).videoPending = entities.some(m => m.type !== 'photo') && !media.some(m => m.ext === 'mp4'); }
      }
      for (const x of Object.values(v)) if (x && typeof x === 'object') stack.push(x);
    }
  }

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.type !== 'X_BATCH_MEDIA_V1') return;
    const {id, media} = event.data;
    if (!/^\d{1,30}$/.test(id) || !Array.isArray(media) || media.length > 20) return;
    const clean = media.filter(m => {
      try { const u = new URL(m.url); return u.protocol === 'https:' &&
        ((m.ext === 'mp4' && u.hostname === 'video.twimg.com') ||
         (['jpg','jpeg','png','webp'].includes(m.ext) && u.hostname === 'pbs.twimg.com' && u.pathname.startsWith('/media/'))); }
      catch (_) { return false; }
    }).map(m => ({url:m.url, ext:m.ext, type:m.type, bitrate:Number(m.bitrate)||0}));
    mediaCache.set(id, clean);
    if (posts.has(id)) { const p = posts.get(id); p.media = clean; p.videoPending = p.videoPending && !clean.some(m => m.ext === 'mp4'); }
  });
  window.postMessage({type:'X_BATCH_READY_V1'},location.origin);

  function scan() {
    let added = 0;
    document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
      const p = readPost(article); if (!p) return;
      if (!posts.has(p.id)) added++;
      posts.set(p.id, p);
    });
    persist(); render(); return added;
  }
  function readPost(article) {
    const time = article.querySelector('time');
    const match = time?.closest('a')?.getAttribute('href')?.match(/^\/([^/]+)\/status\/(\d+)/);
    if (!match) return null;
    const [,author,id] = match, previous = posts.get(id);
    const belongs = element => {
      const link = element.closest('a[href*="/status/"]');
      return !link || link.getAttribute('href').includes(`/status/${id}/`);
    };
    const photos = [...article.querySelectorAll('[data-testid="tweetPhoto"] img')].filter(belongs).map(i => original(i.currentSrc || i.src)).filter(Boolean);
    const text = article.querySelector('[data-testid="tweetText"]')?.innerText || '';
    const hasVideo = !!article.querySelector('video,[data-testid="videoPlayer"]');
    const media = mediaCache.get(id) || (photos.length ? [...new Map(photos.map(m=>[m.url,m])).values()] : previous?.media || []);
    return {...previous,id,author,url:`https://x.com/${author}/status/${id}`,date:time.dateTime,
      text:text.length >= (previous?.text?.length || 0) ? text : previous.text,
      media,videoPending:hasVideo && !media.some(m=>m.ext==='mp4'),selected:previous?.selected || false};
  }
  function element(tag, text, parent, attrs = {}) {
    const el = document.createElement(tag); if (text) el.textContent = text;
    for (const [key,value] of Object.entries(attrs)) el.setAttribute(key,value);
    if (parent) parent.append(el); return el;
  }
  function action(parent, text, handler, cls = '', attrs = {}) {
    const b = element('button',text,parent,{type:'button',...attrs}); b.className = cls;
    b.onclick = e => { e.stopPropagation(); Promise.resolve().then(handler).catch(e=>say(e.message,'error')); };
    return b;
  }
  const selected = () => [...posts.values()].filter(p=>p.selected);
  const csv = value => '"'+String(value ?? '').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
  const historyKey = (p,m) => `${p.id}:${new URL(m.url).origin}${new URL(m.url).pathname}`;
  function wasSaved(p,m) { return history.has(historyKey(p,m)) || history.has(`${p.id}:${m.url}`); }
  function filename(p,index,ext) {
    const date = (p.date || '').slice(0,10) || 'undated';
    const prefix = settings.naming === 'id' ? p.id : settings.naming === 'date' ? `${p.author}_${date}_${p.id}` : `${p.author}_${p.id}`;
    return `${safeName(prefix).slice(0,130)}_${index}.${ext}`;
  }
  function exportFile(ext,content,type,name) {
    const url = URL.createObjectURL(new Blob(['\ufeff',content],{type}));
    const a = element('a','',document.body,{href:url,download:name || `x-posts-${Date.now()}.${ext}`});
    a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function download(url,name) {
    return new Promise((resolve,reject)=>GM_download({url,name,saveAs:false,timeout:180000,
      onload:resolve,onerror:e=>reject(new Error(e.error || '下载失败')),ontimeout:()=>reject(new Error('下载超时'))}));
  }
  async function savePostText(p) {
    const text = `@${p.author}\n${p.date || ''}\n${p.url}\n\n${p.text || '（无正文）'}\n`;
    const name = filename(p,'text','txt');
    if (typeof GM_saveText === 'function') { await GM_saveText(text,name); return true; }
    exportFile('txt',text,'text/plain;charset=utf-8',name); return false;
  }
  function eligible(p,mode) { return (p.media || []).filter(m=>mode==='photos' ? m.type==='photo' : mode==='videos' ? m.ext==='mp4' : true); }
  function enqueue(items,mode='all',force=false) {
    if (busy && stop) return say('当前文件正在收尾，请稍后再开始。');
    if (!items.length) return say('先选择帖子，再开始下载。');
    let count = 0, duplicates = 0;
    for (const item of items) {
      const p = {...item,media:mediaCache.get(item.id) || item.media || []};
      posts.set(p.id,p);
      if (tasks.some(t=>t.post.id===p.id && t.mode===mode && ['queued','running'].includes(t.state))) { duplicates++; continue; }
      tasks.push({id:`${Date.now()}-${++sequence}`,post:p,mode,force,state:'queued',done:0,total:0,skipped:0,errors:[],created:Date.now(),withText:settings.saveText}); count++;
    }
    persist(); render();
    say(count ? `已加入 ${count} 个帖子任务${duplicates ? `，${duplicates} 个正在排队，未重复添加` : ''}。` : '该帖子已在队列中。');
    void processQueue();
  }
  async function processQueue() {
    if (busy) return;
    busy = true; stop = false;
    try {
      let t;
      while (!stop && (t=tasks.find(t=>t.state==='queued'))) {
        t.state='running'; t.done=0; t.skipped=0; t.errors=[]; render();
        const p=t.post;
        if (p.videoPending && t.mode!=='photos' && t.mode!=='text' && !mediaCache.has(p.id)) {
          t.phase='resolving';render();
          for(let i=0;i<8 && !stop && !mediaCache.has(p.id);i++)await sleep(250);
        }
        t.phase='downloading';
        if (mediaCache.has(p.id)) p.media=mediaCache.get(p.id);
        if (p.media.some(m=>m.ext==='mp4')) p.videoPending=false;
        const media = eligible(p,t.mode); t.total=media.length;
        if (t.mode !== 'text' && t.mode !== 'photos' && p.videoPending) t.errors.push('视频尚未解析：打开原帖刷新，等待视频加载后重试');
        if (t.mode !== 'text' && !media.length && !t.errors.length) t.errors.push('未发现这种媒体；可通过菜单保存正文及链接');
        if (t.mode !== 'text') for (const m of media) {
          if (stop) break;
          if (settings.skipSaved && !t.force && wasSaved(p,m)) { t.skipped++; continue; }
          const index=p.media.indexOf(m)+1; let error;
          t.current=filename(p,index,m.ext); render();
          for (let attempt=0;attempt<2 && !stop;attempt++) {
            try { await download(m.url,t.current); error=null; break; }
            catch(e) { error=e; if (!attempt && !stop) await sleep(1200); }
          }
          if (!error) { history.add(historyKey(p,m)); t.done++; }
          else if (error) t.errors.push(`${t.current}：${error.message}`);
          persist(); render(); if (!stop) await sleep(settings.interval);
        }
        if (!stop && (t.mode==='text' || t.withText)) {
          try { t.textVerified=await savePostText(p); t.textSaved=true; } catch(e) { t.errors.push(`正文保存失败：${e.message}`); }
        }
        t.current='';
        t.state=stop ? 'cancelled' : t.errors.length ? 'failed' : t.done || t.textSaved ? 'complete' : 'skipped';
        if (t.state==='failed') say(t.errors[0],'error');
        else if (t.state==='skipped') say('这些媒体已下载过；可在该帖菜单选择“重新下载全部”。');
        else if (t.state==='complete') say(`@${p.author}：${t.mode==='text' ? '正文保存已发起' : `已完成 ${t.done} 个媒体${t.skipped ? `，跳过 ${t.skipped} 个重复文件` : ''}`}。`,'success');
        persist(); render();
      }
    } finally { busy=false; persist(); render(); }
  }
  function stopQueue() {
    stop=true; tasks.filter(t=>t.state==='queued').forEach(t=>t.state='cancelled');
    persist(); render(); say('已停止等待任务；当前文件完成或超时后停止。');
  }
  function retryFailed() {
    if (busy && stop) return say('当前文件正在收尾，请稍后再重试。');
    const failed=tasks.filter(t=>t.state==='failed' || t.state==='interrupted' || t.state==='cancelled');
    if (!failed.length) return say('没有需要重试的任务。');
    for (const t of failed) {
      t.state='queued'; t.errors=[]; t.force=false;
      t.post=posts.get(t.post.id) || t.post;
    }
    persist(); render(); void processQueue();
  }
  function visiblePosts() {
    const q=search?.value.trim().toLowerCase() || '';
    return [...posts.values()].filter(p=>(!q || `${p.author} ${p.text} ${p.id}`.toLowerCase().includes(q)) &&
      (filter==='selected' ? p.selected : filter==='media' ? p.media.length || p.videoPending : true));
  }
  function showPanel(tab='posts') { currentTab=tab; panel.hidden=false; render(); }
  function render() {
    if (!panel) return;
    const count=selected().length, pending=tasks.filter(t=>['queued','running'].includes(t.state)).length;
    launcher.textContent = pending ? `↓ 下载中 · ${pending} 帖` : count ? `↓ 批量工具 · 已选 ${count}` : '↓ X 下载工具';
    launcher.setAttribute('aria-expanded',String(!panel.hidden));
    panel.querySelector('#count').textContent=`本地 ${posts.size} 帖 · 已选 ${count} 帖`;
    panel.querySelector('#selection').textContent=`下载选中${count ? `（${count}）` : ''}`;
    panel.querySelector('#selection').disabled=!count;
    for (const [name,view] of Object.entries(views)) view.hidden=name!==currentTab;
    for (const [name,b] of Object.entries(tabs)) b.setAttribute('aria-selected',String(name===currentTab));
    if (currentTab==='posts' && !panel.hidden) renderPosts();
    if (currentTab==='tasks' && !panel.hidden) renderTasks();
    updateInline();
  }
  function renderPosts() {
    list.replaceChildren(); const items=visiblePosts();
    if (!items.length) {
      element('div',posts.size ? '没有符合筛选条件的帖子。' : '还没有收集帖子',list,{class:'empty'});
      if (!posts.size) element('p','点击“收集当前页面”，或在帖子下方勾选“加入批量”。',list,{class:'muted'});
    }
    for (const p of items.slice(0,300)) {
      const row=element('div','',list,{class:'row'});
      const cb=element('input','',row,{type:'checkbox','aria-label':`选择 @${p.author} 的帖子 ${p.id}`}); cb.checked=p.selected;
      cb.onchange=()=>{p.selected=cb.checked;persist();render();};
      const body=element('div','',row,{class:'row-body'});
      element('a',`@${p.author}`,body,{href:p.url,target:'_blank',rel:'noopener noreferrer'});
      element('small',(p.date || '').slice(0,10),body,{class:'date'});
      element('p',(p.text || '（无正文）').slice(0,140),body,{class:'excerpt'});
      element('small',`${p.media.length} 个媒体${p.videoPending ? ' · 视频待解析' : ''}`,body,{class:'muted'});
      action(row,'下载',()=>enqueue([p]),'quiet',{'aria-label':`下载 @${p.author} 的帖子 ${p.id}`});
    }
    if (items.length>300) element('p',`显示前 300 / ${items.length} 帖，请筛选缩小范围；批量操作仍针对全部筛选结果。`,list,{class:'muted'});
  }
  const stateLabel={queued:'等待中',running:'下载中',complete:'已完成',failed:'需要重试',skipped:'已下载过',cancelled:'已停止',interrupted:'上次中断'};
  function renderTasks() {
    const wrap=panel.querySelector('#task-list'); wrap.replaceChildren();
    const counts = ['complete','failed','queued'].map(s=>`${stateLabel[s]} ${tasks.filter(t=>t.state===s).length}`).join(' · ');
    panel.querySelector('#task-summary').textContent=counts;
    if (!tasks.length) element('div','还没有下载任务。每帖点“下载”就会出现在这里。',wrap,{class:'empty'});
    for (const t of [...tasks].reverse().slice(0,100)) {
      const card=element('div','',wrap,{class:`task ${t.state}`});
      const top=element('div','',card,{class:'spread'});
      element('a',`@${t.post.author}`,top,{href:t.post.url,target:'_blank',rel:'noopener noreferrer'});
      element('span',stateLabel[t.state],top,{class:'badge'});
      element('p',`${t.mode==='photos' ? '仅图片' : t.mode==='videos' ? '仅视频' : t.mode==='text' ? '正文及链接' : '全部媒体'} · 完成 ${t.done}/${t.total} · 跳过 ${t.skipped}${t.textSaved ? t.textVerified ? ' · 正文已保存' : ' · 正文已发起保存' : ''}`,card,{class:'muted'});
      if (t.state==='running') {
        const progress=element('progress','',card,{max:String(Math.max(1,t.total)),value:String(t.done+t.skipped)}); progress.setAttribute('aria-label','当前帖子下载进度');
        element('small',t.phase==='resolving' ? '正在读取网页已加载的媒体信息…' : t.current || '准备中…',card,{class:'muted filename'});
      }
      for (const error of t.errors) element('p',error,card,{class:'error-text'});
      if (['failed','interrupted','cancelled'].includes(t.state)) action(card,'重试这条',()=>{t.state='queued';t.force=false;t.post=posts.get(t.post.id)||t.post;persist();void processQueue();render();},'quiet');
      if (t.state==='skipped') action(card,'仍然重新下载',()=>enqueue([posts.get(t.post.id)||t.post],t.mode,true),'quiet');
    }
  }
  async function collect() {
    if (collecting) { collecting=false; return; }
    collecting=true; const button=panel.querySelector('#scroll'); button.textContent='停止滚动收集';
    let round=0,idle=0;
    try {
      while (collecting && round<settings.maxRounds && idle<8) {
        const n=scan();idle=n?0:idle+1; say(`正在滚动收集 ${++round}/${settings.maxRounds} 轮 · 本地 ${posts.size} 帖`);
        window.scrollBy(0,Math.max(400,innerHeight*.8));await sleep(1800);
      }
    } finally {collecting=false;button.textContent='滚动收集';scan();say('收集结束，仅包含网页实际加载的帖子。');}
  }
  function enhance() {
    if (!settings.inline) { document.querySelectorAll('x-batch-inline').forEach(h=>h.remove());return; }
    document.querySelectorAll('article[data-testid="tweet"]').forEach(article=>{
      const p=readPost(article);if (!p)return;
      let host=article.querySelector('x-batch-inline');
      if (host?.dataset.postId===p.id) return;
      if (host) host.remove();
      host=document.createElement('x-batch-inline');host.dataset.postId=p.id;
      host.style.cssText='display:block;position:relative;z-index:1;';
      const shadow=host.attachShadow({mode:'open'});
      element('style',INLINE_CSS,shadow);
      const bar=element('div','',shadow,{class:'bar'});
      const latest=()=>{const record=readPost(article);if (!record)throw new Error('帖子已改变，请刷新后重试');return record;};
      const main=action(bar,'↓ 下载',()=>enqueue([latest()]),'main',{'aria-label':'下载这条帖子的全部媒体',title:'下载原图和最高可用 MP4'});main.id='direct';
      const details=element('details','',bar);
      details.ontoggle=()=>{if(details.open)for(const other of document.querySelectorAll('x-batch-inline')){const menu=other.shadowRoot?.querySelector('details');if(menu && menu!==details)menu.open=false;}};
      element('summary','⌄',details,{'aria-label':'更多保存选项',title:'更多保存选项'});
      const menu=element('div','',details,{class:'menu'});
      const menuAction=(label,fn)=>action(menu,label,()=>{details.open=false;fn();});
      menuAction('下载全部媒体',()=>enqueue([latest()]));
      menuAction('仅下载图片',()=>enqueue([latest()],'photos'));
      menuAction('仅下载视频',()=>enqueue([latest()],'videos'));
      menuAction('保存正文及链接',()=>enqueue([latest()],'text'));
      menuAction('重新下载全部',()=>enqueue([latest()],'all',true));
      menuAction('查看下载任务',()=>showPanel('tasks'));
      const label=element('label','',bar,{class:'select'});
      const cb=element('input','',label,{type:'checkbox','aria-label':'将这条帖子加入批量选择'});element('span','加入批量',label);
      cb.onchange=()=>{const p=latest();p.selected=cb.checked;posts.set(p.id,p);persist();render();};
      const note=action(bar,'',()=>showPanel('tasks'),'note-button',{'aria-label':'查看此帖下载状态'});note.id='note';note.hidden=true;
      // Keep controls out of X's own action row to preserve its layout and hit targets.
      host.addEventListener('click',e=>e.stopPropagation());host.addEventListener('keydown',e=>{if(e.key==='Escape'){details.open=false;main.focus();}e.stopPropagation();});
      article.append(host);
    });
    updateInline();
  }
  function updateInline() {
    for (const host of document.querySelectorAll('x-batch-inline')) {
      const root=host.shadowRoot;if (!root)continue;
      const p=posts.get(host.dataset.postId);const relevant=tasks.filter(t=>t.post.id===host.dataset.postId);
      const task=relevant.find(t=>t.state==='running') || relevant.find(t=>t.state==='queued') || relevant.at(-1);
      const button=root.querySelector('#direct'), note=root.querySelector('#note');
      button.textContent=task ? task.state==='running' ? task.phase==='resolving' ? '◌ 解析中' : `↓ 下载中 ${task.done}/${task.total}` : task.state==='queued' ? '↓ 已排队' : task.state==='failed' ? '↻ 重试' : ['complete','skipped'].includes(task.state) ? '✓ 已处理' : '↓ 下载' : '↓ 下载';
      button.disabled=!!task && ['running','queued'].includes(task.state);
      note.textContent=task?.state==='failed' ? '未全部完成 · 查看任务' : task?.state==='skipped' ? '已跳过重复文件' : task?.state==='complete' ? task.mode==='text' ? '正文已处理' : `完成 ${task.done} 个媒体` : '';
      note.hidden=!note.textContent;
      root.querySelector('input').checked=!!p?.selected;
      host.dataset.theme=theme();
    }
  }
  const theme=()=>settings.theme==='auto' ? (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light') : settings.theme;
  function init() {
    if (document.getElementById('x-batch-tool-host'))return;
    const host=element('div','',document.documentElement,{id:'x-batch-tool-host'});
    host.style.cssText='display:block!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
    host.dataset.theme=theme();
    const root=host.attachShadow({mode:'open'});element('style',PANEL_CSS,root);
    launcher=action(root,'↓ X 下载工具',()=>{panel.hidden=!panel.hidden;render();},'launcher',{'aria-label':'打开或收起 X 下载工具','aria-expanded':'false'});
    toast=element('div','',root,{class:'toast',role:'status','aria-live':'polite'});toast.hidden=true;
    panel=element('section','',root,{id:'panel','aria-label':'X 下载工具面板'});panel.hidden=true;
    const header=element('header','',panel);
    const title=element('div','',header);element('span','LOCAL · X MEDIA',title,{class:'eyebrow'});element('h2','保存你想留下的内容',title);element('div','',title,{id:'count',class:'muted'});
    action(header,'×',()=>{panel.hidden=true;render();},'close',{'aria-label':'收起面板'});
    const nav=element('nav','',panel,{role:'tablist','aria-label':'工具栏目'});
    for (const [name,label] of Object.entries({posts:'帖子列表',tasks:'下载任务',settings:'设置'})) {
      tabs[name]=action(nav,label,()=>showPanel(name),'tab',{role:'tab',id:`tab-${name}`,'aria-controls':`view-${name}`});
      tabs[name].onkeydown=e=>{
        if (!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
        e.preventDefault();const names=Object.keys(tabs),i=names.indexOf(name);
        const next=e.key==='Home'?names[0]:e.key==='End'?names.at(-1):names[(i+(e.key==='ArrowRight'?1:2))%3];
        showPanel(next);tabs[next].focus();
      };
    }
    for (const name of ['posts','tasks','settings']) views[name]=element('div','',panel,{id:`view-${name}`,class:'view',role:'tabpanel','aria-labelledby':`tab-${name}`});
    const tools=element('div','',views.posts,{class:'toolbar'});
    action(tools,'收集当前页面',()=>say(`已收集，新增 ${scan()} 帖。`),'primary');
    const scroll=action(tools,'滚动收集',collect);scroll.id='scroll';
    search=element('input','',views.posts,{type:'search',placeholder:'搜索账号、正文或帖子 ID','aria-label':'搜索已收集帖子'});search.oninput=renderPosts;
    const filters=element('div','',views.posts,{class:'toolbar small'});
    const select=element('select','',filters,{'aria-label':'筛选帖子'});
    for(const [value,label]of Object.entries({all:'全部帖子',media:'含媒体',selected:'仅已选'}))element('option',label,select,{value});
    select.onchange=()=>{filter=select.value;renderPosts();};
    action(filters,'全选筛选结果',()=>{visiblePosts().forEach(p=>p.selected=true);persist();render();},'text-button');
    action(filters,'取消全部',()=>{posts.forEach(p=>p.selected=false);persist();render();},'text-button');
    list=element('div','',views.posts,{id:'list',class:'scroll-list'});
    const bulk=element('div','',views.posts,{class:'bulk'});
    const downloadSelected=action(bulk,'下载选中',()=>enqueue(selected()),'primary');downloadSelected.id='selection';
    action(bulk,'JSON',()=>exportSelected('json'));action(bulk,'CSV',()=>exportSelected('csv'));
    const local=element('details','',views.posts,{class:'advanced'});element('summary','本地记录管理',local);
    element('p','仅删除工具内的记录，不会删除 X 帖子或电脑中的文件。',local,{class:'muted'});
    action(local,'删除选中本地记录',()=>{
      if(busy||collecting)return say('请先停止收集和下载，再删除记录。');
      if(!selected().length)return say('请先选择帖子。');
      if(confirm(`删除 ${selected().length} 条本地记录？不会删除 X 帖子或电脑中的文件。`)){selected().forEach(p=>posts.delete(p.id));persist();render();}
    },'danger');
    const taskTools=element('div','',views.tasks,{class:'toolbar'});
    action(taskTools,'重试未完成',retryFailed,'primary');action(taskTools,'停止队列',stopQueue);
    action(taskTools,'清除已结束任务',()=>{tasks=tasks.filter(t=>['running','queued','failed','interrupted','cancelled'].includes(t.state));persist();render();});
    element('p','',views.tasks,{id:'task-summary',class:'muted'});element('div','',views.tasks,{id:'task-list',class:'scroll-list'});
    renderSettings(views.settings,host);
    status=element('div','准备好了。在任意帖子下方点击“下载”，或先收集再批量处理。',panel,{id:'status',role:'status','aria-live':'polite'});
    if(storageWarning)say(storageWarning,'error');
    panel.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;launcher.focus();render();}});
    if(typeof GM_registerMenuCommand==='function')GM_registerMenuCommand('显示 X 下载工具',()=>showPanel());
    render();enhance();
  }
  function exportSelected(format) {
    const items=selected();if(!items.length)return say('请先选择帖子。');
    if(format==='json')exportFile('json',JSON.stringify(items,null,2),'application/json');
    else exportFile('csv',[['id','author','date','url','text','media_urls','video_pending'],...items.map(p=>[p.id,p.author,p.date,p.url,p.text,p.media.map(m=>m.url).join('\n'),p.videoPending])].map(r=>r.map(csv).join(',')).join('\r\n'),'text/csv;charset=utf-8');
    say(`已发起导出 ${items.length} 条帖子。`);
  }
  function renderSettings(container,host) {
    const field=(label,hint)=>{const box=element('div','',container,{class:'setting'});const line=element('label','',box);element('span',label,line);if(hint)element('small',hint,box,{class:'muted'});return line;};
    function check(key,label,hint) {
      const line=field(label,hint),input=element('input','',line,{type:'checkbox','aria-label':label});input.checked=settings[key];
      input.onchange=()=>{settings[key]=input.checked;persist();enhance();render();};
    }
    function choice(key,label,options) {
      const input=element('select','',field(label),{'aria-label':label});
      for(const[value,text]of Object.entries(options))element('option',text,input,{value});input.value=settings[key];
      input.onchange=()=>{settings[key]=input.value;host.dataset.theme=theme();persist();updateInline();};
    }
    check('inline','在每帖下方显示下载按钮','支持新加载的帖子，点一下下载全部媒体。');
    check('skipSaved','跳过已下载的媒体','想再下一次，可在该帖菜单中选择“重新下载全部”。');
    check('saveText','下载媒体时同时保存正文','生成 TXT，包含账号、时间、原帖链接和当前可见正文。');
    choice('naming','文件命名',{author:'账号_帖子ID_序号',date:'账号_日期_帖子ID_序号',id:'帖子ID_序号'});
    choice('theme','界面外观',{auto:'跟随系统',dark:'深色',light:'浅色'});
    const advanced=element('details','',container,{class:'advanced'});element('summary','高级选项',advanced);
    const numeric=(key,label,min,max)=>{
      const line=element('label',label,advanced,{class:'number-field'}),input=element('input','',line,{type:'number',min:String(min),max:String(max),'aria-label':label});input.value=settings[key];
      input.onchange=()=>{const n=Number(input.value);settings[key]=Number.isFinite(n)?Math.round(Math.max(min,Math.min(max,n))):defaults[key];input.value=settings[key];persist();};
    };
    numeric('interval','文件间隔（毫秒）',300,10000);numeric('maxRounds','滚动收集上限（轮）',1,300);
    action(advanced,'清空下载去重历史',()=>{if(busy)return say('请先停止下载');if(confirm('清空去重历史后，已保存的媒体会再次下载。继续？')){history.clear();persist();say('去重历史已清空。');}},'danger');
    element('p','文件保存到 Chrome 下载目录；视频为 X 提供的最高可用 MP4。私密记录仅保存在本机。',container,{class:'help'});
    element('p','v1.2.0 · 本地运行 · 无第三方解析服务',container,{class:'muted version'});
  }
  const INLINE_CSS=`
    :host{--accent:#1d9bf0;--text:#536471;--bg:#fff;--line:#d8e2e9;display:block;font:13px/1.4 system-ui,sans-serif;color:var(--text)}
    :host([data-theme=dark]){--text:#a7b8c5;--bg:#14212c;--line:#344553}
    *{box-sizing:border-box}[hidden]{display:none!important}button,input,summary{font:inherit}button,summary{cursor:pointer}button:disabled{cursor:wait;opacity:.6}button:focus-visible,summary:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.note-button{border:0;background:transparent;color:var(--text);padding:4px;cursor:pointer}.note-button:hover{text-decoration:underline}
    .bar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 0 4px}.main{border:1px solid #1d9bf055;border-radius:999px;background:#1d9bf012;color:var(--accent);padding:6px 12px;font-weight:650}.main:hover{background:#1d9bf028}
    details{position:relative}summary{list-style:none;padding:6px 10px;border:1px solid var(--line);border-radius:999px;color:var(--text)}summary::-webkit-details-marker{display:none}
    .menu{position:absolute;left:0;bottom:36px;z-index:1000;min-width:180px;border:1px solid var(--line);border-radius:12px;padding:5px;background:var(--bg);box-shadow:0 8px 24px #0003}.menu button{display:block;width:100%;text-align:left;color:var(--text);border:0;border-radius:7px;background:transparent;padding:9px}.menu button:hover{background:#1d9bf018}
    .select{display:flex;align-items:center;gap:5px;padding:4px 6px;cursor:pointer;white-space:nowrap}input{accent-color:var(--accent)}#note{font-size:12px;margin-left:3px}
  `;
  const PANEL_CSS=`
    :host{--bg:#fff;--surface:#f5f8fa;--text:#142938;--muted:#647784;--line:#dce5eb;--accent:#087bc4;--accent-soft:#e8f4fd;--error:#b43b4b;--shadow:0 20px 64px #12324c25;color-scheme:light}
    :host([data-theme=dark]){--bg:#101e2a;--surface:#172937;--text:#e9f2f8;--muted:#9eafbd;--line:#2e4354;--accent:#5cbdff;--accent-soft:#173950;--error:#ff97a6;--shadow:0 20px 64px #0008;color-scheme:dark}
    *{box-sizing:border-box}button,input,select{font:inherit}[hidden]{display:none!important}button{cursor:pointer;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);padding:8px 11px;line-height:1.3}button:hover{background:var(--surface)}button:disabled{opacity:.45;cursor:default}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.toast{position:fixed;right:20px;bottom:140px;max-width:min(360px,90vw);padding:12px 16px;border-radius:12px;background:var(--bg);color:var(--text);border:1px solid var(--line);box-shadow:var(--shadow);font:13px/1.6 system-ui;pointer-events:auto}
    .launcher{position:fixed;right:20px;bottom:80px;pointer-events:auto;border:1px solid #ffffff25;border-radius:999px;background:#147fbd;color:#fff;box-shadow:0 6px 24px #0003;font:600 13px system-ui;padding:13px 18px}.launcher:hover{background:#096ca6}
    #panel{position:fixed;right:20px;bottom:138px;width:460px;max-width:calc(100vw - 24px);max-height:min(760px,calc(100dvh - 160px));display:flex;flex-direction:column;pointer-events:auto;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow);font:13px/1.5 system-ui,sans-serif;overflow:hidden}
    header{display:flex;justify-content:space-between;align-items:flex-start;padding:20px 20px 14px}.eyebrow{font-size:10px;letter-spacing:1.5px;font-weight:750;color:var(--accent)}h2{font-size:20px;margin:5px 0;font-weight:700;letter-spacing:-.5px}.close{font-size:23px;border:0;padding:0 7px;color:var(--muted)}nav{display:flex;gap:5px;padding:0 18px;border-bottom:1px solid var(--line)}.tab{border:0;border-radius:9px 9px 0 0;background:transparent;padding:11px 15px;color:var(--muted)}.tab[aria-selected=true]{background:var(--accent-soft);color:var(--accent);font-weight:700;border-bottom:2px solid var(--accent)}
    .view{padding:15px 18px;overflow:auto;min-height:0}.toolbar{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.primary{background:var(--accent);border-color:transparent;color:var(--bg);font-weight:650}.primary:hover{filter:brightness(.93);background:var(--accent)}input[type=search]{width:100%;padding:10px 12px;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:11px;margin-bottom:10px}select{background:var(--bg);color:var(--text);border:1px solid var(--line);padding:7px 9px;border-radius:8px;max-width:230px}.small{gap:8px;margin-bottom:4px}.text-button{border:0;padding:5px 3px;font-size:12px;color:var(--accent)}.scroll-list{max-height:290px;overflow:auto;overscroll-behavior:contain}.row{display:flex;gap:10px;align-items:flex-start;padding:13px 0;border-bottom:1px solid var(--line)}.row-body{min-width:0;flex:1}.row input{margin-top:4px;accent-color:var(--accent)}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}.date{float:right;color:var(--muted);font-size:11px}.excerpt{margin:5px 0;overflow-wrap:anywhere;line-height:1.55}.muted{color:var(--muted);font-size:12px}.quiet{padding:5px 8px;font-size:12px;background:var(--surface)}.bulk{display:flex;gap:7px;padding:14px 0 4px}.bulk .primary{flex:1}.empty{text-align:center;padding:28px 12px;color:var(--muted);font-size:14px}.empty+p{text-align:center;margin-top:-14px}.advanced{margin-top:13px;border-top:1px solid var(--line);padding-top:12px}summary{cursor:pointer;color:var(--muted);font-size:12px}.danger{color:var(--error);font-size:12px}.task{padding:12px;margin:0 0 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.spread{display:flex;justify-content:space-between;gap:8px}.badge{font-size:11px;color:var(--muted)}.failed .badge,.error-text{color:var(--error)}.complete .badge{color:var(--accent)}.task p{margin:7px 0;overflow-wrap:anywhere}.error-text{font-size:12px}.filename{display:block;overflow-wrap:anywhere}progress{width:100%;height:5px;accent-color:var(--accent)}.setting{padding:13px 0;border-bottom:1px solid var(--line)}.setting label{display:flex;justify-content:space-between;align-items:center;gap:10px}.setting small{display:block;margin-top:5px;line-height:1.6}.setting input{accent-color:var(--accent);width:17px;height:17px}.number-field{display:flex;justify-content:space-between;align-items:center;margin:13px 0}.number-field input{width:95px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:7px;padding:6px}.help{font-size:12px;color:var(--muted);line-height:1.8}.version{font-size:10px}#status{padding:11px 18px;background:var(--surface);border-top:1px solid var(--line);color:var(--muted);font-size:12px;line-height:1.6}#status[data-tone=error]{color:var(--error)}
    @media(max-width:520px){#panel{right:12px;bottom:92px;max-height:calc(100dvh - 110px)}.launcher{bottom:32px;right:12px}.scroll-list{max-height:30vh}header{padding:15px}.view{padding:12px}h2{font-size:18px}}
  `;
  const boot=()=>{try{init();enhance();}catch(e){console.error('[X Batch] 启动失败',e);}};
  document.addEventListener('click',e=>{
    if(e.composedPath().some(n=>n.tagName==='X-BATCH-INLINE'))return;
    for(const host of document.querySelectorAll('x-batch-inline')){const menu=host.shadowRoot?.querySelector('details');if(menu)menu.open=false;}
  },true);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{
    if(settings.theme==='auto'){const host=document.getElementById('x-batch-tool-host');if(host)host.dataset.theme=theme();updateInline();}
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  let enhancementTimer;
  const observer=new MutationObserver(records=>{
    if(!records.some(r=>r.type==='childList' && [...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1 && (n.matches?.('article[data-testid="tweet"], [data-testid="tweetText"],time') || n.querySelector?.('article[data-testid="tweet"],time')))))return;
    clearTimeout(enhancementTimer);enhancementTimer=setTimeout(enhance,180);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  const mountTimer=setInterval(()=>{if(!document.getElementById('x-batch-tool-host'))boot();else enhance();},2000);
  window.addEventListener('pagehide',()=>{clearInterval(mountTimer);clearTimeout(enhancementTimer);observer.disconnect();},{once:true});
})();

}).catch(e => console.error('[X Batch] 初始化失败', e));