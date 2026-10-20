const fs = require('fs');
const path = require('path');
const dir = path.resolve('extension');
fs.mkdirSync(dir, { recursive: true });
let source = fs.readFileSync('userscript/x-batch-tool.user.js', 'utf8');
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
const translations=JSON.parse(fs.readFileSync('src/i18n/en.json','utf8'));
source=source.replace(/  const EN=.*;\r?\n/,'  const EN='+JSON.stringify(translations)+';\n');
source=source.replace(/(^\/\/ @version\s+)\S+/m,'$1'+version);
fs.writeFileSync('userscript/x-batch-tool.user.js',source);
const hookStart = source.indexOf('  // Only inspect responses');
const hookEnd = source.indexOf('\n  function scan()', hookStart);
const helpers = source.slice(source.indexOf('  function original('), hookStart);
let hook = source.slice(hookStart, hookEnd).replace("const page = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;", 'const page = window;');
const main = `(() => { 'use strict';
  const posts = new Map();
  const recent = new Map();
  const mediaCache = { set(id, media) {
    recent.set(id,media); if (recent.size > 500) recent.delete(recent.keys().next().value);
    window.postMessage({type:'X_BATCH_MEDIA_V1', id, media}, location.origin);
  } };
  window.addEventListener('message', event => {
    if (event.source === window && event.origin === location.origin && event.data?.type === 'X_BATCH_READY_V1')
      for (const [id,media] of recent) window.postMessage({type:'X_BATCH_MEDIA_V1',id,media},location.origin);
  });
${helpers}\n${hook}\n})();`;
fs.writeFileSync(path.join(dir,'capture.js'), main);
const bridge = `
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.type !== 'X_BATCH_MEDIA_V1') return;
    const {id, media} = event.data;
    if (!/^\\d{1,30}$/.test(id) || !Array.isArray(media) || media.length > 20) return;
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
`;
source = source.slice(0,hookStart) + bridge + source.slice(hookEnd);
const wrapper = `chrome.storage.local.get('x-batch-v1').then(initial => {
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
${source}
}).catch(e => console.error('[X Batch] 初始化失败', e));`;
fs.writeFileSync(path.join(dir, 'content.js'), wrapper);
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({
  manifest_version:3, name:'__MSG_extensionName__', version, minimum_chrome_version:'111', default_locale:'en',
  description:'__MSG_extensionDescription__',
  permissions:['storage','downloads'],
  background:{service_worker:'background.js'},
  content_scripts:[
    {matches:['https://x.com/*','https://twitter.com/*'], js:['capture.js'],run_at:'document_start',world:'MAIN'},
    {matches:['https://x.com/*','https://twitter.com/*'], js:['content.js'],run_at:'document_start',world:'ISOLATED'}
  ]
}, null,2));
fs.copyFileSync('src/extension-background.js', path.join(dir,'background.js'));
for(const [locale,messages]of Object.entries({
  en:{extensionName:{message:'X Media Batch Tool — X/Twitter Image & Video Downloader'},extensionDescription:{message:'Download X/Twitter images and MP4 videos. Per-post buttons, batch queues, retries, exports. English and 简体中文.'}},
  zh_CN:{extensionName:{message:'X Media Batch Tool｜推特/X 图片视频批量下载工具'},extensionDescription:{message:'推特/X 图片视频批量下载工具。支持每帖下载、队列、重试、去重、JSON/CSV导出及中英文界面。'}}
})){
  const target=path.join(dir,'_locales',locale);fs.mkdirSync(target,{recursive:true});fs.writeFileSync(path.join(target,'messages.json'),JSON.stringify(messages,null,2)+'\n');
}
console.log(dir);
