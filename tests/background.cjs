const vm=require('vm'), fs=require('fs'), assert=require('node:assert/strict');
let handler, change, downloads=0, nextState='complete', pendingReply, expectedName='demo_1.mp4';
const chrome={runtime:{id:'extension-test',onMessage:{addListener(f){handler=f}}},downloads:{
  onChanged:{addListener(f){change=f}},
  download(opts,cb){downloads++; assert.equal(opts.filename,expectedName); cb(7)},
  search(q,cb){cb([{state:nextState,error:nextState==='interrupted'?'NETWORK_FAILED':undefined}])}
}};
vm.runInNewContext(fs.readFileSync('src/extension-background.js','utf8'),{chrome,URL,Map,setTimeout,clearTimeout});
const sender={id:'extension-test',url:'https://x.com/home'};
handler({type:'X_BATCH_DOWNLOAD',url:'https://evil.example/file',name:'demo_1.mp4'},sender,r=>pendingReply=r);
assert.equal(pendingReply.ok,false); assert.equal(downloads,0);
handler({type:'X_BATCH_DOWNLOAD',url:'https://video.twimg.com/v.mp4',name:'demo_1.mp4'},sender,r=>pendingReply=r);
assert.equal(pendingReply.ok,true); assert.equal(downloads,1);
nextState='interrupted';
handler({type:'X_BATCH_DOWNLOAD',url:'https://video.twimg.com/v.mp4',name:'demo_1.mp4'},sender,r=>pendingReply=r);
assert.equal(pendingReply.ok,false); assert.equal(pendingReply.error,'NETWORK_FAILED');
nextState='in_progress';
handler({type:'X_BATCH_DOWNLOAD',url:'https://video.twimg.com/v.mp4',name:'demo_1.mp4'},sender,r=>pendingReply=r);
change({id:7,state:{current:'complete'}}); assert.equal(pendingReply.ok,true);
nextState='complete';expectedName='demo_text.txt';
handler({type:'X_BATCH_SAVE_TEXT',text:'local post text',name:'demo_text.txt'},sender,r=>pendingReply=r);assert.equal(pendingReply.ok,true);
handler({type:'X_BATCH_SAVE_TEXT',text:'text',name:'bad.exe'},sender,r=>pendingReply=r);assert.equal(pendingReply.ok,false);
handler({type:'X_BATCH_DOWNLOAD',url:'https://video.twimg.com/v.mp4',name:'demo_1.mp4'},{id:'other-extension',url:'https://x.com/home'},r=>pendingReply=r);assert.equal(pendingReply.ok,false);
console.log('PASS: rejected foreign host, completed-file acknowledgement, interrupted-file error, asynchronous completion event.');
