'use strict';
const active = new Map();
function settle(id, error) {
  const task = active.get(id); if (!task) return;
  active.delete(id); clearTimeout(task.timer);
  task.respond(error ? {ok:false,error} : {ok:true});
}
chrome.downloads.onChanged.addListener(delta => {
  if (delta.state?.current === 'complete') settle(delta.id);
  if (delta.state?.current === 'interrupted') settle(delta.id, delta.error?.current || '下载被中断');
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!['X_BATCH_DOWNLOAD','X_BATCH_SAVE_TEXT'].includes(message?.type)) return;
  let url, origin;
  try { origin = new URL(sender.url).origin; }
  catch (_) { respond({ok:false,error:'无效的下载请求'}); return; }
  if (!['https://x.com','https://twitter.com'].includes(origin) || sender.id !== chrome.runtime.id) {
    respond({ok:false,error:'下载来源不受支持'}); return;
  }
  if(message.type==='X_BATCH_SAVE_TEXT') {
    if(typeof message.text!=='string' || message.text.length>1000000 || !String(message.name).endsWith('.txt')) {
      respond({ok:false,error:'正文格式无效或长度超过限制'});return;
    }
    url={href:'data:text/plain;charset=utf-8,'+encodeURIComponent('\ufeff'+message.text)};
  } else {
    try {url=new URL(message.url);}catch(_){respond({ok:false,error:'无效的媒体地址'});return;}
    if(url.protocol!=='https:' || !['pbs.twimg.com','video.twimg.com'].includes(url.hostname)) {
      respond({ok:false,error:'下载来源不受支持'});return;
    }
  }
  const filename = String(message.name || 'x-media').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,160);
  chrome.downloads.download({url:url.href,filename,saveAs:false,conflictAction:'uniquify'}, id => {
    if (chrome.runtime.lastError || !Number.isInteger(id)) {
      respond({ok:false,error:chrome.runtime.lastError?.message || '创建下载失败'}); return;
    }
    active.set(id, {respond,timer:setTimeout(() => settle(id,'下载等待超时；请检查Chrome下载列表'),180000)});
    chrome.downloads.search({id}, items => {
      const item = items?.[0];
      if (item?.state === 'complete') settle(id);
      if (item?.state === 'interrupted') settle(id,item.error || '下载被中断');
    });
  });
  return true;
});
