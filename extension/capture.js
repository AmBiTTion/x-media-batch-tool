(() => { 'use strict';
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

  // Only inspect responses already requested by the page. Do not collect credentials.
  function capture(text) { try { extract(JSON.parse(text)); } catch (_) {} }
  try {
    const page = window;
    const oldFetch = page.fetch;
    page.fetch = function (...args) {
      const promise = oldFetch.apply(this, args);
      promise.then(r => {
        if (/\/i\/api\/|\/graphql\//.test(r.url) && /json/.test(r.headers.get('content-type') || ''))
          r.clone().text().then(capture).catch(() => {});
      }).catch(() => {});
      return promise;
    };
    const oldOpen = page.XMLHttpRequest.prototype.open;
    page.XMLHttpRequest.prototype.open = function (...args) {
      this.addEventListener('load', () => {
        if (!/\/i\/api\/|\/graphql\//.test(this.responseURL || '')) return;
        try {
          if (this.responseType === 'json') extract(this.response);
          else if (!this.responseType || this.responseType === 'text') capture(this.responseText);
        } catch (_) {}
      }, { once: true });
      return oldOpen.apply(this, args);
    };
  } catch (_) { /* Photos and exports still work when page instrumentation is unavailable. */ }

})();