import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {chromium} from 'playwright';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
dotenv.config({path:'demo/.env',quiet:true});
export async function verifyNineChat(){
const root='demo/work/nine-chat',out='demo/out/nine-chat';await fs.mkdir(out,{recursive:true});
const beats=JSON.parse(await fs.readFile(root+'/beats.json','utf8'));
assert.equal(beats.length,11,'all scenes recorded');
const expected=['succeeded','open','active','draft','closed','succeeded','active','succeeded','draft'];
const examples=await(await fetch(new URL('/api/chat/examples',process.env.APP_URL))).json();
const build=await(await fetch(new URL('/api/build',process.env.APP_URL))).json();assert.equal(build.testMode,true);
const rows=[];
for(let i=1;i<=9;i++){
 const b=beats[i],p=b.result.proof;
 const r=await(await fetch(new URL('/api/records/'+b.result.recordId,process.env.APP_URL))).json();
 assert.equal(r.request,examples[i-1].text);assert.equal(r.channel,'chat');
 assert.deepEqual(i===5?r.stripe.authorization:r.stripe.verified,p);
 assert.equal(p.livemode,false);assert.equal(p.status??(p.active?'active':null),expected[i-1]);
 assert.ok(r.audit.some(a=>a.channel==='chat'&&a.at));
 if(i!==5)assert.ok(r.audit.some(a=>a.event==='policy_checked'&&a.clause==='C9'));
 if(i===9)assert.ok(r.audit.some(a=>a.via==='agent-toolkit'&&a.tools?.length===3));
 if(i===5)assert.equal(p.approved,false);
 rows.push({product:b.product,request:r.request,record:r.id,objectPrefix:p.id.startsWith('cs_test_')?'cs_test_':p.id.split('_')[0]+'_',status:expected[i-1],livemode:false,auditConfirmed:true});
}
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.goto(process.env.APP_URL,{waitUntil:'networkidle'});
 await page.locator('#examples summary').click();assert.equal(await page.locator('[data-example]').count(),9);
 await page.screenshot({path:out+'/chooser.png'});
 await page.locator('[data-example="5"]').click();assert.equal(await page.locator('#q').inputValue(),examples[5].text);
 assert.equal(await page.locator('.msg.me').count(),0,'selection never executes');
 // Read-only public-page checks: never fill card fields or submit a payment.
 const pages=[];
 for(const scene of [1,2,3]){
  const b=beats[scene];const r=await(await fetch(new URL('/api/records/'+b.result.recordId,process.env.APP_URL))).json();
  const l=r.chatExample?.links?.[0];assert.ok(l,'actual Stripe link for '+b.product);
  assert.ok(['pay.stripe.com','checkout.stripe.com','buy.stripe.com','invoice.stripe.com'].includes(new URL(l.url).hostname));
  await page.goto(l.url,{waitUntil:'domcontentloaded'});await page.waitForTimeout(4000);
  const body=await page.locator('body').innerText();assert.doesNotMatch(body,/sign in to your stripe account|log in to your stripe account/i);
  assert.match(body,scene===1?/receipt|paid|payment/i:scene===2?/32.50/:/60.00|60/);
  await page.screenshot({path:out+'/public-page-'+scene+'.png'});pages.push({product:b.product,label:l.label,publicPageLoads:true});
 }
 await fs.writeFile(out+'/checks.json',JSON.stringify({build,examples:rows,chooser:{count:9,selectionRequiresSend:true},publicPages:pages},null,2));
 console.log('PASS nine real hosted chat results, persisted policy/audits, strict Toolkit, real decline, chooser Send gate and three public Stripe pages');
}finally{await browser.close()}

}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))verifyNineChat().catch(e=>{let m=String(e.message).replace(/https?:\S+/g,'[private URL]');for(const[k,v]of Object.entries(process.env))if(v&&(k.includes('KEY')||k==='APP_URL'))m=m.replaceAll(v,'[redacted]');console.error(m);process.exitCode=1});
