const fs=require('fs'),acorn=require('acorn'),assert=require('node:assert/strict');
const source=fs.readFileSync('userscript/x-batch-tool.user.js','utf8'),en=JSON.parse(fs.readFileSync('src/i18n/en.json','utf8'));
const ast=acorn.parse(source,{ecmaVersion:'latest'});let count=0;
function walk(node){
 if(!node||typeof node!=='object')return;
 if(node.type==='CallExpression'&&node.callee.type==='Identifier'&&node.callee.name==='tr'&&node.arguments[0]?.type==='Literal'){
  const key=node.arguments[0].value;assert.ok(en[key],'Missing translation: '+key);count++;
 }
 if(node.type==='VariableDeclarator'&&node.id.name==='EN')assert.deepEqual(JSON.parse(source.slice(node.init.start,node.init.end)),en,'Embedded dictionary is stale; rebuild');
 for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);
}walk(ast);
for(const[key,value]of Object.entries(en)){
 assert.ok(value.trim(),'Empty translation: '+key);
 const placeholders=s=>[...s.matchAll(/\{(\d+)\}/g)].map(m=>m[1]).sort();
 assert.deepEqual(placeholders(key),placeholders(value),'Placeholder mismatch: '+key);
}
const version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
assert.ok(source.includes('// @version      '+version));
console.log(`PASS: ${count} translated calls, ${Object.keys(en).length} nonempty dictionary entries, placeholders and release version match.`);
