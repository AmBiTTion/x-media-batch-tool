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
// @name         X Media Batch Tool — X/Twitter Image & Video Downloader
// @name:zh-CN   X Media Batch Tool｜推特/X 图片视频批量下载工具
// @namespace    local.x.batch.tool
// @version      1.3.0
// @description  Download X/Twitter images and MP4 videos. Per-post buttons, batch queues, retries, exports, English / 简体中文.
// @description:zh-CN 推特/X 图片视频批量下载工具，支持每帖下载、队列、重试、导出及中英文界面。
// @license      MIT
// @homepageURL  https://github.com/AmBiTTion/x-media-batch-tool
// @supportURL   https://github.com/AmBiTTion/x-media-batch-tool/issues
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

  const EN={"本地存储读取失败，本次使用临时记录":"Local storage could not be read. Using temporary records.","本地存储失败：请先导出备份。":"Could not save local records. Export a backup first. ","下载失败":"Download failed","下载超时":"Download timed out","（无正文）":"(No text)","当前文件正在收尾，请稍后再开始。":"The current file is finishing. Please try again shortly.","先选择帖子，再开始下载。":"Select some posts before downloading.","已加入 {0} 个帖子任务{1}。":"Post tasks added: {0}{1}.","，{0} 个正在排队，未重复添加":"; {0} already queued and not added again","该帖子已在队列中。":"This post is already in the queue.","视频尚未解析：打开原帖刷新，等待视频加载后重试":"Video metadata is unavailable. Open the original post, refresh, wait for media to load, then retry.","未发现这种媒体；可通过菜单保存正文及链接":"No matching media found. Use the menu to save post text and link.","正文保存失败：{0}":"Could not save post text: {0}","这些媒体已下载过；可在该帖菜单选择“重新下载全部”。":"These media were already downloaded. Choose Download again in the post menu to save another copy.","正文保存已发起":"Text save initiated","已完成 {0} 个媒体{1}":"Media saved: {0}{1}","，跳过 {0} 个重复文件":"; skipped {0} duplicate(s)","已停止等待任务；当前文件完成或超时后停止。":"Waiting tasks cancelled. Stopping after the current file finishes or times out.","当前文件正在收尾，请稍后再重试。":"The current file is finishing. Retry in a moment.","没有需要重试的任务。":"No unfinished tasks to retry.","↓ 下载中 · {0} 帖":"↓ Queued posts: {0}","↓ 批量工具 · 已选 {0}":"↓ Batch tool · {0} selected","↓ X 下载工具":"↓ X Media Tool","本地 {0} 帖 · 已选 {1} 帖":"Local posts: {0} · Selected: {1}","下载选中{0}":"Download selected{0}","没有符合筛选条件的帖子。":"No posts match this filter.","还没有收集帖子":"No posts collected yet","点击“收集当前页面”，或在帖子下方勾选“加入批量”。":"Collect this page, or select Add to batch under any post.","选择 @{0} 的帖子 {1}":"Select post {1} by @{0}","{0} 个媒体{1}":"Media: {0}{1}"," · 视频待解析":" · video metadata pending","下载":"Download","下载 @{0} 的帖子 {1}":"Download post {1} by @{0}","显示前 300 / {0} 帖，请筛选缩小范围；批量操作仍针对全部筛选结果。":"Showing 300 of {0} posts. Refine the filter; batch operations still cover all selected records.","等待中":"Queued","下载中":"Downloading","已完成":"Completed","需要重试":"Needs retry","已下载过":"Already saved","已停止":"Stopped","上次中断":"Interrupted","还没有下载任务。每帖点“下载”就会出现在这里。":"No download tasks yet. Click Download under a post to get started.","{0} · 完成 {1}/{2} · 跳过 {3}{4}":"{0} · saved {1}/{2} · skipped {3}{4}","仅图片":"Images only","仅视频":"Videos only","正文及链接":"Text and link","全部媒体":"All media"," · 正文已保存":" · text saved"," · 正文已发起保存":" · text save initiated","当前帖子下载进度":"Current post download progress","正在读取网页已加载的媒体信息…":"Reading media metadata loaded by the page…","准备中…":"Preparing…","重试这条":"Retry this task","仍然重新下载":"Download another copy","停止滚动收集":"Stop collecting","正在滚动收集 {0}/{1} 轮 · 本地 {2} 帖":"Collecting: round {0}/{1} · {2} local post(s)","滚动收集":"Scroll to collect","收集结束，仅包含网页实际加载的帖子。":"Collection finished. Only posts actually loaded by the page are included.","帖子已改变，请刷新后重试":"This post has changed. Refresh and try again.","↓ 下载":"↓ Download","下载这条帖子的全部媒体":"Download all media in this post","下载原图和最高可用 MP4":"Download original-size images and highest-available MP4","更多保存选项":"More save options","下载全部媒体":"Download all media","仅下载图片":"Download images only","仅下载视频":"Download videos only","保存正文及链接":"Save text and link","重新下载全部":"Download again","查看下载任务":"View download tasks","将这条帖子加入批量选择":"Add this post to batch selection","加入批量":"Add to batch","查看此帖下载状态":"View this post's download status","◌ 解析中":"◌ Resolving","↓ 下载中 {0}/{1}":"↓ Saving {0}/{1}","↓ 已排队":"↓ Queued","↻ 重试":"↻ Retry","✓ 已处理":"✓ Processed","未全部完成 · 查看任务":"Incomplete · view tasks","已跳过重复文件":"Duplicates skipped","正文已处理":"Text processed","完成 {0} 个媒体":"Media saved: {0}","打开或收起 X 下载工具":"Open or collapse X Media Tool","X 下载工具面板":"X Media Tool panel","保存你想留下的内容":"Keep what matters to you","收起面板":"Collapse panel","工具栏目":"Tool sections","帖子列表":"Posts","下载任务":"Tasks","设置":"Settings","收集当前页面":"Collect this page","已收集，新增 {0} 帖。":"Collection finished. Posts added: {0}.","搜索账号、正文或帖子 ID":"Search account, text or post ID","搜索已收集帖子":"Search collected posts","筛选帖子":"Filter posts","全部帖子":"All posts","含媒体":"With media","仅已选":"Selected only","全选筛选结果":"Select filtered","取消全部":"Deselect all","下载选中":"Download selected","本地记录管理":"Manage local records","仅删除工具内的记录，不会删除 X 帖子或电脑中的文件。":"Only tool records are removed. X posts and files on your device are kept.","删除选中本地记录":"Remove selected local records","请先停止收集和下载，再删除记录。":"Stop collection and downloads before removing records.","请先选择帖子。":"Select some posts first.","删除 {0} 条本地记录？不会删除 X 帖子或电脑中的文件。":"Remove {0} local record(s)? X posts and files on your device will be kept.","重试未完成":"Retry unfinished","停止队列":"Stop queue","清除已结束任务":"Clear ended tasks","准备好了。在任意帖子下方点击“下载”，或先收集再批量处理。":"Ready. Download under any post, or collect posts for batch operations.","显示 X 下载工具":"Show X Media Tool","已发起导出 {0} 条帖子。":"Export initiated. Posts: {0}.","在每帖下方显示下载按钮":"Show per-post download buttons","支持新加载的帖子，点一下下载全部媒体。":"Includes newly loaded posts. One click queues all media.","跳过已下载的媒体":"Skip previously downloaded media","想再下一次，可在该帖菜单中选择“重新下载全部”。":"To save another copy, choose Download again in the post menu.","下载媒体时同时保存正文":"Save text alongside media","生成 TXT，包含账号、时间、原帖链接和当前可见正文。":"Creates a TXT with account, time, original link and currently loaded text.","文件命名":"Filename format","账号_帖子ID_序号":"account_postID_index","账号_日期_帖子ID_序号":"account_date_postID_index","帖子ID_序号":"postID_index","界面外观":"Appearance","跟随系统":"Follow system","深色":"Dark","浅色":"Light","高级选项":"Advanced options","文件间隔（毫秒）":"File interval (ms)","滚动收集上限（轮）":"Collection limit (rounds)","清空下载去重历史":"Reset download history","请先停止下载":"Stop downloads first","清空去重历史后，已保存的媒体会再次下载。继续？":"Reset history? Previously saved media will be downloaded again.","去重历史已清空。":"Download history reset.","文件保存到 Chrome 下载目录；视频为 X 提供的最高可用 MP4。私密记录仅保存在本机。":"Files use the browser download folder. Videos are X's highest-available MP4. Private records stay on this device.","[X Batch] 启动失败":"[X Batch] Startup failed","界面语言":"Interface language","跟随浏览器":"Follow browser","首次使用":"Getting started","下载按钮已经出现在帖子下方。可直接下载，或勾选后批量保存。":"Download buttons appear under posts. Save directly or select posts for batch downloads.","查看安装与使用教程":"Installation and usage guide","知道了":"Got it","无效的下载请求":"Invalid download request","下载来源不受支持":"Download source not supported","正文格式无效或长度超过限制":"Invalid text format or text exceeds the size limit","无效的媒体地址":"Invalid media URL","创建下载失败":"Could not start download","下载被中断":"Download interrupted","下载等待超时；请检查Chrome下载列表":"Download wait timed out. Check the browser downloads list.","正文保存失败":"Could not save post text","v1.3.0 · 本地运行 · 无第三方解析服务":"v1.3.0 · Local processing · No third-party parser"};
  const browserLanguage=()=>typeof navigator!=='undefined'?(navigator.languages?.[0]||navigator.language||'en'):'en';
  let activeLocale=/^zh/i.test(browserLanguage())?'zh-CN':'en';
  function translate(key,values=[]){
    if(activeLocale==='zh-CN' && !EN[key]) key=Object.keys(EN).find(k=>EN[k]===key)||key;
    const text=activeLocale==='en'?(EN[key]||key):key;
    return String(text).replace(/\{(\d+)\}/g,(_,i)=>String(values[i]??'{'+i+'}'));
  }
  const tr=translate;
  function externalError(message){
    const text=String(message||'下载失败'),direct=tr(text);if(direct!==text)return direct;
    const marker=Math.max(text.lastIndexOf('：'),text.lastIndexOf(': '));
    if(marker<0)return direct;
    const width=text[marker]==='：'?1:2;
    return tr(text.slice(0,marker))+': '+tr(text.slice(marker+width));
  }

  const KEY = 'x-batch-v1';
  let storageWarning = '';
  let saved = { posts: [], history: [] };
  try { saved = GM_getValue(KEY, saved) || saved; }
  catch (e) { storageWarning = tr("本地存储读取失败，本次使用临时记录"); console.warn('[X Batch]', e); }
  if (!Array.isArray(saved.posts)) saved.posts = [];
  if (!Array.isArray(saved.history)) saved.history = [];
  const defaults={language:'auto',onboarded:false,inline:true,skipSaved:true,saveText:false,naming:'author',theme:'auto',interval:750,maxRounds:100};
  const settings={...defaults,...saved.settings};
  if(!['auto','en','zh-CN'].includes(settings.language))settings.language='auto';
  activeLocale=settings.language==='auto'?(/^zh/i.test(browserLanguage())?'zh-CN':'en'):settings.language;
  settings.interval=Math.max(300,Math.min(10000,Number(settings.interval)||750));
  settings.maxRounds=Math.max(1,Math.min(300,Number(settings.maxRounds)||100));
  const posts=new Map(saved.posts.map(p=>[p.id,p]));
  const history=new Set(saved.history);
  const mediaCache=new Map();
  let tasks=Array.isArray(saved.tasks)?saved.tasks.filter(t=>t.post && Array.isArray(t.errors)).map(t=>({...t,state:['queued','running'].includes(t.state)?'interrupted':t.state})):[];
  let panel,list,status,search,launcher,toast,busy=false,stop=false,collecting=false,sequence=0,currentTab='posts',filter='all',toastTimer,menuRegistered=false;
  const tabs={},views={};
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const say=(text,tone='info')=>{
    if(status){status.textContent=text;status.dataset.tone=tone;}
    if(toast && panel?.hidden){toast.textContent=text;toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,6000);}
  };
  const persist=()=>{try{GM_setValue(KEY,{posts:[...posts.values()],history:[...history],settings,tasks:[...tasks.filter(t=>['queued','running'].includes(t.state)),...tasks.filter(t=>!['queued','running'].includes(t.state)).slice(-100)]});}catch(e){say(tr("本地存储失败：请先导出备份。")+e.message,'error');}};
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
      onload:resolve,onerror:e=>reject(new Error(externalError(e.error))),ontimeout:()=>reject(new Error(tr("下载超时")))}));
  }
  async function savePostText(p) {
    const text = `@${p.author}\n${p.date || ''}\n${p.url}\n\n${p.text || tr("（无正文）")}\n`;
    const name = filename(p,'text','txt');
    if (typeof GM_saveText === 'function') { await GM_saveText(text,name); return true; }
    exportFile('txt',text,'text/plain;charset=utf-8',name); return false;
  }
  function eligible(p,mode) { return (p.media || []).filter(m=>mode==='photos' ? m.type==='photo' : mode==='videos' ? m.ext==='mp4' : true); }
  function enqueue(items,mode='all',force=false) {
    if (busy && stop) return say(tr("当前文件正在收尾，请稍后再开始。"));
    if (!items.length) return say(tr("先选择帖子，再开始下载。"));
    let count = 0, duplicates = 0;
    for (const item of items) {
      const p = {...item,media:mediaCache.get(item.id) || item.media || []};
      posts.set(p.id,p);
      if (tasks.some(t=>t.post.id===p.id && t.mode===mode && ['queued','running'].includes(t.state))) { duplicates++; continue; }
      tasks.push({id:`${Date.now()}-${++sequence}`,post:p,mode,force,state:'queued',done:0,total:0,skipped:0,errors:[],created:Date.now(),withText:settings.saveText}); count++;
    }
    persist(); render();
    say(count ? tr("已加入 {0} 个帖子任务{1}。",[count,duplicates ? tr("，{0} 个正在排队，未重复添加",[duplicates]) : '']) : tr("该帖子已在队列中。"));
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
        if (t.mode !== 'text' && t.mode !== 'photos' && p.videoPending) t.errors.push(tr("视频尚未解析：打开原帖刷新，等待视频加载后重试"));
        if (t.mode !== 'text' && !media.length && !t.errors.length) t.errors.push(tr("未发现这种媒体；可通过菜单保存正文及链接"));
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
          try { t.textVerified=await savePostText(p); t.textSaved=true; } catch(e) { t.errors.push(tr("正文保存失败：{0}",[e.message])); }
        }
        t.current='';
        t.state=stop ? 'cancelled' : t.errors.length ? 'failed' : t.done || t.textSaved ? 'complete' : 'skipped';
        if (t.state==='failed') say(t.errors[0],'error');
        else if (t.state==='skipped') say(tr("这些媒体已下载过；可在该帖菜单选择“重新下载全部”。"));
        else if (t.state==='complete') say(`@${p.author}: ${t.mode==='text' ? tr("正文保存已发起") : tr("已完成 {0} 个媒体{1}",[t.done,t.skipped ? tr("，跳过 {0} 个重复文件",[t.skipped]) : ''])}`,'success');
        persist(); render();
      }
    } finally { busy=false; persist(); render(); }
  }
  function stopQueue() {
    stop=true; tasks.filter(t=>t.state==='queued').forEach(t=>t.state='cancelled');
    persist(); render(); say(tr("已停止等待任务；当前文件完成或超时后停止。"));
  }
  function retryFailed() {
    if (busy && stop) return say(tr("当前文件正在收尾，请稍后再重试。"));
    const failed=tasks.filter(t=>t.state==='failed' || t.state==='interrupted' || t.state==='cancelled');
    if (!failed.length) return say(tr("没有需要重试的任务。"));
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
    launcher.textContent = pending ? tr("↓ 下载中 · {0} 帖",[pending]) : count ? tr("↓ 批量工具 · 已选 {0}",[count]) : tr("↓ X 下载工具");
    launcher.setAttribute('aria-expanded',String(!panel.hidden));
    panel.querySelector('#count').textContent=tr("本地 {0} 帖 · 已选 {1} 帖",[posts.size,count]);
    panel.querySelector('#selection').textContent=tr("下载选中{0}",[count ? ` (${count})` : '']);
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
      element('div',posts.size ? tr("没有符合筛选条件的帖子。") : tr("还没有收集帖子"),list,{class:'empty'});
      if (!posts.size) element('p',tr("点击“收集当前页面”，或在帖子下方勾选“加入批量”。"),list,{class:'muted'});
    }
    for (const p of items.slice(0,300)) {
      const row=element('div','',list,{class:'row'});
      const cb=element('input','',row,{type:'checkbox','aria-label':tr("选择 @{0} 的帖子 {1}",[p.author,p.id])}); cb.checked=p.selected;
      cb.onchange=()=>{p.selected=cb.checked;persist();render();};
      const body=element('div','',row,{class:'row-body'});
      element('a',`@${p.author}`,body,{href:p.url,target:'_blank',rel:'noopener noreferrer'});
      element('small',(p.date || '').slice(0,10),body,{class:'date'});
      element('p',(p.text || tr("（无正文）")).slice(0,140),body,{class:'excerpt'});
      element('small',tr("{0} 个媒体{1}",[p.media.length,p.videoPending ? tr(" · 视频待解析") : '']),body,{class:'muted'});
      action(row,tr("下载"),()=>enqueue([p]),'quiet',{'aria-label':tr("下载 @{0} 的帖子 {1}",[p.author,p.id])});
    }
    if (items.length>300) element('p',tr("显示前 300 / {0} 帖，请筛选缩小范围；批量操作仍针对全部筛选结果。",[items.length]),list,{class:'muted'});
  }
  const stateLabel=new Proxy({queued:'等待中',running:'下载中',complete:'已完成',failed:'需要重试',skipped:'已下载过',cancelled:'已停止',interrupted:'上次中断'},{get:(target,key)=>tr(target[key]||String(key))});
  function renderTasks() {
    const wrap=panel.querySelector('#task-list'); wrap.replaceChildren();
    const counts = ['complete','failed','queued'].map(s=>`${stateLabel[s]} ${tasks.filter(t=>t.state===s).length}`).join(' · ');
    panel.querySelector('#task-summary').textContent=counts;
    if (!tasks.length) element('div',tr("还没有下载任务。每帖点“下载”就会出现在这里。"),wrap,{class:'empty'});
    for (const t of [...tasks].reverse().slice(0,100)) {
      const card=element('div','',wrap,{class:`task ${t.state}`});
      const top=element('div','',card,{class:'spread'});
      element('a',`@${t.post.author}`,top,{href:t.post.url,target:'_blank',rel:'noopener noreferrer'});
      element('span',stateLabel[t.state],top,{class:'badge'});
      element('p',tr("{0} · 完成 {1}/{2} · 跳过 {3}{4}",[t.mode==='photos' ? tr("仅图片") : t.mode==='videos' ? tr("仅视频") : t.mode==='text' ? tr("正文及链接") : tr("全部媒体"),t.done,t.total,t.skipped,t.textSaved ? t.textVerified ? tr(" · 正文已保存") : tr(" · 正文已发起保存") : '']),card,{class:'muted'});
      if (t.state==='running') {
        const progress=element('progress','',card,{max:String(Math.max(1,t.total)),value:String(t.done+t.skipped)}); progress.setAttribute('aria-label',tr("当前帖子下载进度"));
        element('small',t.phase==='resolving' ? tr("正在读取网页已加载的媒体信息…") : t.current || tr("准备中…"),card,{class:'muted filename'});
      }
      for (const error of t.errors) element('p',externalError(error),card,{class:'error-text'});
      if (['failed','interrupted','cancelled'].includes(t.state)) action(card,tr("重试这条"),()=>{t.state='queued';t.force=false;t.post=posts.get(t.post.id)||t.post;persist();void processQueue();render();},'quiet');
      if (t.state==='skipped') action(card,tr("仍然重新下载"),()=>enqueue([posts.get(t.post.id)||t.post],t.mode,true),'quiet');
    }
  }
  async function collect() {
    if (collecting) { collecting=false; return; }
    collecting=true; const button=panel.querySelector('#scroll'); button.textContent=tr("停止滚动收集");
    let round=0,idle=0;
    try {
      while (collecting && round<settings.maxRounds && idle<8) {
        const n=scan();idle=n?0:idle+1; say(tr("正在滚动收集 {0}/{1} 轮 · 本地 {2} 帖",[++round,settings.maxRounds,posts.size]));
        window.scrollBy(0,Math.max(400,innerHeight*.8));await sleep(1800);
      }
    } finally {collecting=false;const current=panel.querySelector('#scroll');if(current)current.textContent=tr("滚动收集");scan();say(tr("收集结束，仅包含网页实际加载的帖子。"));}
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
      const latest=()=>{const record=readPost(article);if (!record)throw new Error(tr("帖子已改变，请刷新后重试"));return record;};
      const main=action(bar,tr("↓ 下载"),()=>enqueue([latest()]),'main',{'aria-label':tr("下载这条帖子的全部媒体"),title:tr("下载原图和最高可用 MP4")});main.id='direct';
      const details=element('details','',bar);
      details.ontoggle=()=>{if(details.open)for(const other of document.querySelectorAll('x-batch-inline')){const menu=other.shadowRoot?.querySelector('details');if(menu && menu!==details)menu.open=false;}};
      element('summary','⌄',details,{'aria-label':tr("更多保存选项"),title:tr("更多保存选项")});
      const menu=element('div','',details,{class:'menu'});
      const menuAction=(label,fn)=>action(menu,label,()=>{details.open=false;fn();});
      menuAction(tr("下载全部媒体"),()=>enqueue([latest()]));
      menuAction(tr("仅下载图片"),()=>enqueue([latest()],'photos'));
      menuAction(tr("仅下载视频"),()=>enqueue([latest()],'videos'));
      menuAction(tr("保存正文及链接"),()=>enqueue([latest()],'text'));
      menuAction(tr("重新下载全部"),()=>enqueue([latest()],'all',true));
      menuAction(tr("查看下载任务"),()=>showPanel('tasks'));
      const label=element('label','',bar,{class:'select'});
      const cb=element('input','',label,{type:'checkbox','aria-label':tr("将这条帖子加入批量选择")});element('span',tr("加入批量"),label);
      cb.onchange=()=>{const p=latest();p.selected=cb.checked;posts.set(p.id,p);persist();render();};
      const note=action(bar,'',()=>showPanel('tasks'),'note-button',{'aria-label':tr("查看此帖下载状态")});note.id='note';note.hidden=true;
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
      button.textContent=task ? task.state==='running' ? task.phase==='resolving' ? tr("◌ 解析中") : tr("↓ 下载中 {0}/{1}",[task.done,task.total]) : task.state==='queued' ? tr("↓ 已排队") : task.state==='failed' ? tr("↻ 重试") : ['complete','skipped'].includes(task.state) ? tr("✓ 已处理") : tr("↓ 下载") : tr("↓ 下载");
      button.disabled=!!task && ['running','queued'].includes(task.state);
      note.textContent=task?.state==='failed' ? tr("未全部完成 · 查看任务") : task?.state==='skipped' ? tr("已跳过重复文件") : task?.state==='complete' ? task.mode==='text' ? tr("正文已处理") : tr("完成 {0} 个媒体",[task.done]) : '';
      note.hidden=!note.textContent;
      root.querySelector('input').checked=!!p?.selected;
      host.dataset.theme=theme();host.lang=activeLocale;
    }
  }
  const theme=()=>settings.theme==='auto' ? (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light') : settings.theme;
  function init() {
    if (document.getElementById('x-batch-tool-host'))return;
    const host=element('div','',document.documentElement,{id:'x-batch-tool-host'});
    host.style.cssText='display:block!important;position:fixed!important;inset:0!important;z-index:2147483647!important;pointer-events:none!important;';
    host.dataset.theme=theme();host.lang=activeLocale;
    const root=host.attachShadow({mode:'open'});element('style',PANEL_CSS,root);
    launcher=action(root,tr("↓ X 下载工具"),()=>{panel.hidden=!panel.hidden;render();},'launcher',{'aria-label':tr("打开或收起 X 下载工具"),'aria-expanded':'false'});
    toast=element('div','',root,{class:'toast',role:'status','aria-live':'polite'});toast.hidden=true;
    panel=element('section','',root,{id:'panel','aria-label':tr("X 下载工具面板")});panel.hidden=true;
    const header=element('header','',panel);
    const title=element('div','',header);element('span','LOCAL · X MEDIA',title,{class:'eyebrow'});element('h2',tr("保存你想留下的内容"),title);element('div','',title,{id:'count',class:'muted'});
    action(header,'×',()=>{panel.hidden=true;render();},'close',{'aria-label':tr("收起面板")});
    const nav=element('nav','',panel,{role:'tablist','aria-label':tr("工具栏目")});
    for (const [name,label] of Object.entries({posts:tr("帖子列表"),tasks:tr("下载任务"),settings:tr("设置")})) {
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
    action(tools,tr("收集当前页面"),()=>say(tr("已收集，新增 {0} 帖。",[scan()])),'primary');
    const scroll=action(tools,tr(collecting ? "停止滚动收集" : "滚动收集"),collect);scroll.id='scroll';
    search=element('input','',views.posts,{type:'search',placeholder:tr("搜索账号、正文或帖子 ID"),'aria-label':tr("搜索已收集帖子")});search.oninput=renderPosts;
    const filters=element('div','',views.posts,{class:'toolbar small'});
    const select=element('select','',filters,{'aria-label':tr("筛选帖子")});
    for(const [value,label]of Object.entries({all:tr("全部帖子"),media:tr("含媒体"),selected:tr("仅已选")}))element('option',label,select,{value});
    select.onchange=()=>{filter=select.value;renderPosts();};
    action(filters,tr("全选筛选结果"),()=>{visiblePosts().forEach(p=>p.selected=true);persist();render();},'text-button');
    action(filters,tr("取消全部"),()=>{posts.forEach(p=>p.selected=false);persist();render();},'text-button');
    list=element('div','',views.posts,{id:'list',class:'scroll-list'});
    const bulk=element('div','',views.posts,{class:'bulk'});
    const downloadSelected=action(bulk,tr("下载选中"),()=>enqueue(selected()),'primary');downloadSelected.id='selection';
    action(bulk,'JSON',()=>exportSelected('json'));action(bulk,'CSV',()=>exportSelected('csv'));
    const local=element('details','',views.posts,{class:'advanced'});element('summary',tr("本地记录管理"),local);
    element('p',tr("仅删除工具内的记录，不会删除 X 帖子或电脑中的文件。"),local,{class:'muted'});
    action(local,tr("删除选中本地记录"),()=>{
      if(busy||collecting)return say(tr("请先停止收集和下载，再删除记录。"));
      if(!selected().length)return say(tr("请先选择帖子。"));
      if(confirm(tr("删除 {0} 条本地记录？不会删除 X 帖子或电脑中的文件。",[selected().length]))){selected().forEach(p=>posts.delete(p.id));persist();render();}
    },'danger');
    const taskTools=element('div','',views.tasks,{class:'toolbar'});
    action(taskTools,tr("重试未完成"),retryFailed,'primary');action(taskTools,tr("停止队列"),stopQueue);
    action(taskTools,tr("清除已结束任务"),()=>{tasks=tasks.filter(t=>['running','queued','failed','interrupted','cancelled'].includes(t.state));persist();render();});
    element('p','',views.tasks,{id:'task-summary',class:'muted'});element('div','',views.tasks,{id:'task-list',class:'scroll-list'});
    renderSettings(views.settings,host);
    status=element('div',tr("准备好了。在任意帖子下方点击“下载”，或先收集再批量处理。"),panel,{id:'status',role:'status','aria-live':'polite'});
    if(!settings.onboarded){
      const welcome=element('div','',panel,{class:'welcome'});
      element('strong',tr('首次使用'),welcome);
      element('p',tr('下载按钮已经出现在帖子下方。可直接下载，或勾选后批量保存。'),welcome);
      element('a',tr('查看安装与使用教程'),welcome,{href:`https://github.com/AmBiTTion/x-media-batch-tool/blob/main/docs/${activeLocale==='en'?'INSTALL.en.md':'INSTALL.zh-CN.md'}`,target:'_blank',rel:'noopener noreferrer'});
      action(welcome,tr('知道了'),()=>{settings.onboarded=true;welcome.remove();persist();},'quiet');
    }
    if(storageWarning)say(storageWarning,'error');
    panel.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;launcher.focus();render();}});
    if(!menuRegistered && typeof GM_registerMenuCommand==='function'){GM_registerMenuCommand('X Media Batch Tool / X 下载工具',()=>showPanel());menuRegistered=true;}
    render();enhance();
  }
  function exportSelected(format) {
    const items=selected();if(!items.length)return say(tr("请先选择帖子。"));
    if(format==='json')exportFile('json',JSON.stringify(items,null,2),'application/json');
    else exportFile('csv',[['id','author','date','url','text','media_urls','video_pending'],...items.map(p=>[p.id,p.author,p.date,p.url,p.text,p.media.map(m=>m.url).join('\n'),p.videoPending])].map(r=>r.map(csv).join(',')).join('\r\n'),'text/csv;charset=utf-8');
    say(tr("已发起导出 {0} 条帖子。",[items.length]));
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
      input.onchange=()=>{
        settings[key]=input.value;
        if(key==='language'){
          const open=!panel.hidden,q=search.value;
          activeLocale=settings.language==='auto'?(/^zh/i.test(browserLanguage())?'zh-CN':'en'):settings.language;
          clearTimeout(toastTimer);host.remove();document.querySelectorAll('x-batch-inline').forEach(n=>n.remove());
          init();panel.hidden=!open;search.value=q;panel.querySelector('select[aria-label="'+tr('筛选帖子')+'"]').value=filter;render();persist();
          views.settings.querySelector('select').focus();
        }else{host.dataset.theme=theme();persist();updateInline();}
      };
    }
    choice('language',tr('界面语言'),{auto:tr('跟随浏览器'),'zh-CN':'简体中文',en:'English'});
    check('inline',tr("在每帖下方显示下载按钮"),tr("支持新加载的帖子，点一下下载全部媒体。"));
    check('skipSaved',tr("跳过已下载的媒体"),tr("想再下一次，可在该帖菜单中选择“重新下载全部”。"));
    check('saveText',tr("下载媒体时同时保存正文"),tr("生成 TXT，包含账号、时间、原帖链接和当前可见正文。"));
    choice('naming',tr("文件命名"),{author:tr("账号_帖子ID_序号"),date:tr("账号_日期_帖子ID_序号"),id:tr("帖子ID_序号")});
    choice('theme',tr("界面外观"),{auto:tr("跟随系统"),dark:tr("深色"),light:tr("浅色")});
    const advanced=element('details','',container,{class:'advanced'});element('summary',tr("高级选项"),advanced);
    const numeric=(key,label,min,max)=>{
      const line=element('label',label,advanced,{class:'number-field'}),input=element('input','',line,{type:'number',min:String(min),max:String(max),'aria-label':label});input.value=settings[key];
      input.onchange=()=>{const n=Number(input.value);settings[key]=Number.isFinite(n)?Math.round(Math.max(min,Math.min(max,n))):defaults[key];input.value=settings[key];persist();};
    };
    numeric('interval',tr("文件间隔（毫秒）"),300,10000);numeric('maxRounds',tr("滚动收集上限（轮）"),1,300);
    action(advanced,tr("清空下载去重历史"),()=>{if(busy)return say(tr("请先停止下载"));if(confirm(tr("清空去重历史后，已保存的媒体会再次下载。继续？"))){history.clear();persist();say(tr("去重历史已清空。"));}},'danger');
    element('p',tr("文件保存到 Chrome 下载目录；视频为 X 提供的最高可用 MP4。私密记录仅保存在本机。"),container,{class:'help'});
    element('p',tr("v1.3.0 · 本地运行 · 无第三方解析服务"),container,{class:'muted version'});
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
    *{box-sizing:border-box}button,input,select{font:inherit}[hidden]{display:none!important}button{cursor:pointer;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--text);padding:8px 11px;line-height:1.3}button:hover{background:var(--surface)}button:disabled{opacity:.45;cursor:default}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}.welcome{padding:12px 18px;border-top:1px solid var(--line);background:var(--accent-soft);font-size:12px}.welcome p{margin:5px 0}.welcome a{margin-right:12px}.toast{position:fixed;right:20px;bottom:140px;max-width:min(360px,90vw);padding:12px 16px;border-radius:12px;background:var(--bg);color:var(--text);border:1px solid var(--line);box-shadow:var(--shadow);font:13px/1.6 system-ui;pointer-events:auto}
    .launcher{position:fixed;right:20px;bottom:80px;pointer-events:auto;border:1px solid #ffffff25;border-radius:999px;background:#147fbd;color:#fff;box-shadow:0 6px 24px #0003;font:600 13px system-ui;padding:13px 18px}.launcher:hover{background:#096ca6}
    #panel{position:fixed;right:20px;bottom:138px;width:460px;max-width:calc(100vw - 24px);max-height:min(760px,calc(100dvh - 160px));display:flex;flex-direction:column;pointer-events:auto;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:20px;box-shadow:var(--shadow);font:13px/1.5 system-ui,sans-serif;overflow:hidden}
    header{display:flex;justify-content:space-between;align-items:flex-start;padding:20px 20px 14px}.eyebrow{font-size:10px;letter-spacing:1.5px;font-weight:750;color:var(--accent)}h2{font-size:20px;margin:5px 0;font-weight:700;letter-spacing:-.5px}.close{font-size:23px;border:0;padding:0 7px;color:var(--muted)}nav{display:flex;gap:5px;padding:0 18px;border-bottom:1px solid var(--line)}.tab{border:0;border-radius:9px 9px 0 0;background:transparent;padding:11px 15px;color:var(--muted)}.tab[aria-selected=true]{background:var(--accent-soft);color:var(--accent);font-weight:700;border-bottom:2px solid var(--accent)}
    .view{padding:15px 18px;overflow:auto;min-height:0}.toolbar{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.primary{background:var(--accent);border-color:transparent;color:var(--bg);font-weight:650}.primary:hover{filter:brightness(.93);background:var(--accent)}input[type=search]{width:100%;padding:10px 12px;border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:11px;margin-bottom:10px}select{background:var(--bg);color:var(--text);border:1px solid var(--line);padding:7px 9px;border-radius:8px;max-width:230px}.small{gap:8px;margin-bottom:4px}.text-button{border:0;padding:5px 3px;font-size:12px;color:var(--accent)}.scroll-list{max-height:290px;overflow:auto;overscroll-behavior:contain}.row{display:flex;gap:10px;align-items:flex-start;padding:13px 0;border-bottom:1px solid var(--line)}.row-body{min-width:0;flex:1}.row input{margin-top:4px;accent-color:var(--accent)}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}.date{float:right;color:var(--muted);font-size:11px}.excerpt{margin:5px 0;overflow-wrap:anywhere;line-height:1.55}.muted{color:var(--muted);font-size:12px}.quiet{padding:5px 8px;font-size:12px;background:var(--surface)}.bulk{display:flex;gap:7px;padding:14px 0 4px}.bulk .primary{flex:1}.empty{text-align:center;padding:28px 12px;color:var(--muted);font-size:14px}.empty+p{text-align:center;margin-top:-14px}.advanced{margin-top:13px;border-top:1px solid var(--line);padding-top:12px}summary{cursor:pointer;color:var(--muted);font-size:12px}.danger{color:var(--error);font-size:12px}.task{padding:12px;margin:0 0 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}.spread{display:flex;justify-content:space-between;gap:8px}.badge{font-size:11px;color:var(--muted)}.failed .badge,.error-text{color:var(--error)}.complete .badge{color:var(--accent)}.task p{margin:7px 0;overflow-wrap:anywhere}.error-text{font-size:12px}.filename{display:block;overflow-wrap:anywhere}progress{width:100%;height:5px;accent-color:var(--accent)}.setting{padding:13px 0;border-bottom:1px solid var(--line)}.setting label{display:flex;justify-content:space-between;align-items:center;gap:10px}.setting small{display:block;margin-top:5px;line-height:1.6}.setting input{accent-color:var(--accent);width:17px;height:17px}.number-field{display:flex;justify-content:space-between;align-items:center;margin:13px 0}.number-field input{width:95px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:7px;padding:6px}.help{font-size:12px;color:var(--muted);line-height:1.8}.version{font-size:10px}#status{padding:11px 18px;background:var(--surface);border-top:1px solid var(--line);color:var(--muted);font-size:12px;line-height:1.6}#status[data-tone=error]{color:var(--error)}
    @media(max-width:520px){#panel{right:12px;bottom:92px;max-height:calc(100dvh - 110px)}.launcher{bottom:32px;right:12px}.scroll-list{max-height:30vh}header{padding:15px}.view{padding:12px}h2{font-size:18px}}
  `;
  const boot=()=>{try{init();enhance();}catch(e){console.error(tr("[X Batch] 启动失败"),e);}};
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
  const watchDocument=()=>{if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});};
  if(document.documentElement)watchDocument();else document.addEventListener('DOMContentLoaded',watchDocument,{once:true});
  const mountTimer=setInterval(()=>{if(!document.getElementById('x-batch-tool-host'))boot();else enhance();},2000);
  window.addEventListener('pagehide',()=>{clearInterval(mountTimer);clearTimeout(enhancementTimer);observer.disconnect();},{once:true});
})();

}).catch(e => console.error('[X Batch] 初始化失败', e));