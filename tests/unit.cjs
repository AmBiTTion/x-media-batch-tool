const fs = require('fs');
const vm = require('vm');
const assert = require('node:assert/strict');
let source = fs.readFileSync('userscript/x-batch-tool.user.js', 'utf8');
source = source.replace(/\}\)\(\);\s*$/, 'globalThis.testAPI = { original, bestVideo, extract, mediaCache, csv, download, posts, history };})();');
let downloads = 0;
const context = { URL, setTimeout, clearTimeout, matchMedia:()=>({matches:false,addEventListener(){}}), MutationObserver:class{observe(){}disconnect(){}}, setInterval:()=>0, clearInterval(){}, window:{addEventListener(){}}, console,
  GM_getValue: (_, fallback) => fallback, GM_setValue() {},
  GM_download: options => { downloads++; options.onload(); },
  unsafeWindow: { fetch() {}, XMLHttpRequest: { prototype: { open() {} } } },
  document: { readyState: 'loading', addEventListener() {} } };
vm.createContext(context); vm.runInContext(source, context);
const api = context.testAPI;
assert.equal(new URL(api.original('https://pbs.twimg.com/media/test?format=png&name=small').url).searchParams.get('name'), 'orig');
assert.equal(api.original('https://evil.example/media/test'), null);
const variants = [{ content_type:'application/x-mpegURL', url:'https://video.twimg.com/a.m3u8' },
  { content_type:'video/mp4', bitrate:256000, url:'https://video.twimg.com/a.mp4' },
  { content_type:'video/mp4', bitrate:2176000, url:'https://video.twimg.com/b.mp4' }];
assert.equal(api.bestVideo({video_info:{variants}}).bitrate,2176000);
api.extract({data:{tweet:{rest_id:'123',legacy:{extended_entities:{media:[{type:'video',video_info:{variants}}]}}}}});
assert.equal(api.mediaCache.get('123')[0].url,'https://video.twimg.com/b.mp4');
assert.equal(api.csv('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
assert.equal(api.csv('hello\nworld'), '"hello\nworld"');
api.download('https://video.twimg.com/b.mp4','a.mp4').then(() => {
  assert.equal(downloads,1); console.log('PASS: original image URL, host restriction, highest MP4 bitrate, nested response parsing, CSV escaping/formula protection, download callback.');
});
