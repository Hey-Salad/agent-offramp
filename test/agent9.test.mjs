import assert from 'node:assert/strict';
import {commandIndex, requireTestObject, AGENT9_COMMANDS} from '../src/agent9.ts';
import {stripeWriteRequired} from '../src/toolkit.ts';
assert.equal(commandIndex('refund everything'),-1);
assert.equal(commandIndex({text:'restock'}),-1);
assert.equal(commandIndex('  RESTOCK  '),0);
assert.equal(new Set(AGENT9_COMMANDS).size,9);
for(const object of [{id:'pi_live',livemode:true},{id:'pi_unknown'},{livemode:false},null]) assert.throws(()=>requireTestObject(object));
const previous=process.env.STRIPE_SECRET_KEY;process.env.STRIPE_SECRET_KEY='sk_live_REJECT_TEST_SENTINEL';
await assert.rejects(()=>stripeWriteRequired('PostInvoices',{}),/test key required/);
if(previous===undefined)delete process.env.STRIPE_SECRET_KEY;else process.env.STRIPE_SECRET_KEY=previous;
console.log('PASS unsupported chat requests, unverifiable/live objects and live-key Toolkit writes fail closed');
// The recording workspace must not expose extra financial commands by default.
import net from 'node:net';
import {spawn} from 'node:child_process';
import {scenes} from '../demo/scenes.mjs';
assert.deepEqual(scenes.slice(1,10).map(s=>s.command),AGENT9_COMMANDS);
for(const enabled of [false,true]){
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 const child=spawn(process.execPath,['--import','tsx','src/server.ts'],{env:{PATH:process.env.PATH,HOME:process.env.HOME,PORT:String(port),STRIPE_SECRET_KEY:'',AGENT9_DEMO:enabled?'1':'0'},stdio:'ignore'});
 try{
  const url='http://127.0.0.1:'+port;let ready=false;
  for(let i=0;i<100;i++){try{await fetch(url+'/');ready=true;break}catch{}await new Promise(r=>setTimeout(r,50))}assert.ok(ready,'test server starts');
  assert.equal((await fetch(url+'/agent9')).status,enabled?200:404);
  const request=text=>fetch(url+'/api/agent9/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})});
  assert.equal((await request('refund everything')).status,enabled?400:404);
  assert.equal((await request('restock')).status,enabled?503:404);
 }finally{child.kill('SIGTERM')}
}
console.log('PASS demo workspace opt-in, missing-key refusal, and shotlist command consistency');
