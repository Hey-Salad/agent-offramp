import assert from 'node:assert/strict';
import {CHAT_EXAMPLES,chatExampleIndex,runChatExample} from '../src/chat-examples.ts';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
assert.equal(CHAT_EXAMPLES.length,9);
for(const [i,e] of CHAT_EXAMPLES.entries())assert.equal(chatExampleIndex(' '+e.text.toUpperCase()+' '),i);
for(const t of [null,{},'Pay my partner £600','Start a £99 monthly subscription','Pay £96 without sharing card details','Create a £325 checkout'])assert.equal(chatExampleIndex(t),-1);
await assert.rejects(()=>runChatExample(4,1,'http://localhost','chat'),/original-chat card/);
const work=await fs.mkdtemp(path.join(os.tmpdir(),'agent9-chat-'));
await fs.cp('public',work+'/public',{recursive:true});await fs.copyFile('policy.md',work+'/policy.md');
const sock=net.createServer();await new Promise(r=>sock.listen(0,'127.0.0.1',r));const port=sock.address().port;await new Promise(r=>sock.close(r));
const child=spawn(process.execPath,['--import',path.resolve('node_modules/tsx/dist/loader.mjs'),path.resolve('src/server.ts')],{cwd:work,env:{PATH:process.env.PATH,HOME:process.env.HOME,PORT:String(port),STRIPE_SECRET_KEY:'',STRIPE_ISSUING_KEY:'',OPENAI_API_KEY:'',AGENT9_DEMO:'0'},stdio:'ignore'});
let browser;
try{
 const base='http://127.0.0.1:'+port;
 let ready=false;for(let i=0;i<100;i++){try{await fetch(base);ready=true;break}catch{}await new Promise(r=>setTimeout(r,100))}assert.ok(ready);
 assert.equal((await fetch(base+'/agent9')).status,404);
 assert.deepEqual(await (await fetch(base+'/api/chat/examples')).json(),CHAT_EXAMPLES);
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(base);
 await page.locator('#examples summary').click();await page.locator('[data-example="1"]').click();
 assert.equal(await page.locator('#q').inputValue(),CHAT_EXAMPLES[1].text);
 assert.equal(await page.locator('.msg.me').count(),0,'chooser does not spend');
 for(const e of CHAT_EXAMPLES){
  const result=await (await fetch(base+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:e.text})})).json();
  assert.ok(!result.record?.stripe?.verified,'no-key results never claim verified proof');
  assert.ok(!result.record?.stripe?.authorization,'no-key results never invent card result');
 }
 await fs.mkdir('demo/work/nine-chat',{recursive:true});
 await page.locator('#examples summary').click();await page.screenshot({path:'demo/work/nine-chat/chooser-no-key.png'});
 // A deterministic UI fixture checks escaping and the allowlist, never used in demo captures.
 await page.evaluate(()=>card({demo:'agent9',status:'open',total:32.5,chatExample:{index:1,product:'Checkout',links:[{label:'Unsafe',url:'https://evil.invalid/'},{label:'Open checkout',url:'https://checkout.stripe.com/test'}]},stripe:{verified:{id:'cs_test_UI_FIXTURE',status:'open',livemode:false}}}));
 assert.equal(await page.getByRole('link',{name:'Unsafe',exact:true}).count(),0);
 assert.equal(await page.getByRole('link',{name:'Open checkout',exact:true}).count(),1);
 await page.locator('.business-result summary').click();assert.match(await page.locator('.business-result pre').innerText(),/cs_test_UI_FIXTURE/);
 console.log('PASS nine command mappings; altered amounts refused; chooser requires Send; all nine no-key requests fail closed; Stripe links allowlisted; proof stays in original chat; workspace remains disabled');
}finally{await browser?.close();child.kill();await fs.rm(work,{recursive:true,force:true})}
