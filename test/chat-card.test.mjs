import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import net from 'node:net';
const repo=path.dirname(path.dirname(fileURLToPath(import.meta.url))),cwd=process.cwd(),temp=await fs.mkdtemp(path.join(os.tmpdir(),'agent9-card-test-'));await fs.mkdir(temp+'/data');process.chdir(temp);
const {cardCommand,runCardChat,stripeCardAttempt}=await import('../src/chat-card.ts');
const {memory}=await import('../src/memory.ts');
try{
 assert.equal(cardCommand('restock'),null);assert.equal(cardCommand('prepare an invoice for Acme 120 for catering'),null);
 for(const input of ['spend £81 at Ocado','spend £800 at Ocado','pay £12 at an off-licence','try spending eighty on the card','spend $80 at Ocado','spend 80 CAD at Ocado','spend £80 CAD at Ocado','spend £80.999 at Ocado','spend £80 on the card at Amazon'])assert.equal(cardCommand(input).unsupported,true);
 const c=cardCommand('Spend £80 at Ocado');assert.deepEqual(c,{amount:80,merchant:'Ocado',category:'grocery_stores_supermarkets'});
 const fake=async command=>({proof:{id:'iauth_test',object:'issuing.authorization',status:'closed',approved:false,amount:command.amount*100,currency:'gbp',livemode:false,last4:'0005',client_secret:'SECRET_SENTINEL'},limitGBP:50});
 const declined=await runCardChat(c,'Spend £80 at Ocado','chat',fake);
 assert.equal(declined.record.status,'declined');assert.match(declined.reply,/£80.00 is over your £50 card limit/);assert.match(declined.reply,/No money was taken/);assert.equal(declined.record.decisions[0].clause,'P2');assert.ok(!JSON.stringify(declined.record).includes('SECRET_SENTINEL'));assert.ok(memory.get(declined.record.id).audit.every(a=>a.at&&a.channel==='chat'));
 const small=cardCommand('Spend £12 at Ocado');const approved=await runCardChat(small,'Spend £12 at Ocado','chat',async command=>{const r=await fake(command);r.proof.approved=true;r.proof.status='pending';return r});assert.equal(approved.record.status,'authorized');assert.match(approved.reply,/not a completed payment/);assert.doesNotMatch(approved.reply,/paid/i);
 const category=await runCardChat(cardCommand('spend £10 at an off-licence'),'spend £10 at an off-licence','chat',fake);assert.equal(category.record.decisions[0].clause,'P3');assert.match(category.reply,/category isn't allowed/);
 for(const change of [p=>p.livemode=true,p=>delete p.livemode,p=>p.id='pi_wrong',p=>p.amount=8001,p=>p.currency='usd',p=>p.last4='4242424242424242',p=>p.approved=true]){
  const r=await runCardChat(c,'Spend £80 at Ocado','chat',async command=>{const r=await fake(command);change(r.proof);return r});assert.equal(r.record.status,'unavailable');assert.deepEqual(r.record.stripe,{});assert.doesNotMatch(r.reply,/declined|approved/i);
 }
 const unavailable=await runCardChat(c,'Spend £80 at Ocado','chat',async()=>{throw Error('DO_NOT_EXPOSE')});assert.equal(unavailable.record.status,'unavailable');assert.ok(!JSON.stringify(unavailable).includes('DO_NOT_EXPOSE'));
 await assert.rejects(()=>stripeCardAttempt(c),/Test card unavailable/);
 console.log('PASS card parsing, verified declines, authorization wording, policy reasons, secret minimization and unverified/live-result refusal');
 // Exercise the actual route and browser without any Stripe key or local Issuing call.
 const socket=net.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
 await fs.cp(repo+'/public',temp+'/public',{recursive:true});await fs.copyFile(repo+'/policy.md',temp+'/policy.md');
 const child=spawn(process.execPath,['--import',path.join(repo,'node_modules/tsx/dist/loader.mjs'),path.join(repo,'src/server.ts')],{cwd:temp,env:{PATH:process.env.PATH,HOME:process.env.HOME,PORT:String(port),STRIPE_SECRET_KEY:'',STRIPE_ISSUING_KEY:''},stdio:'ignore'});
 try{const url='http://127.0.0.1:'+port;let ready=false;for(let i=0;i<100;i++){try{await fetch(url+'/');ready=true;break}catch{}await new Promise(r=>setTimeout(r,50))}assert.ok(ready);
  const post=text=>fetch(url+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text})}).then(r=>r.json());
  const requests=['spend £80 at Ocado','spend £12 at Ocado','spend £81 at Ocado'];const responses=await Promise.all(requests.map(post));responses.forEach((r,i)=>{if(i<2){assert.equal(r.record.status,'unavailable');assert.equal(r.record.total,i?12:80);assert.equal(r.record.request,undefined);assert.equal(r.record.cardAttempt.amount,i?12:80)}else assert.equal(r.record,null)});
  const {chromium}=await import('playwright');const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:1280,height:1000}});await page.goto(url);await page.getByRole('textbox').fill('spend £80 at Ocado');await page.getByRole('textbox').press('Enter');await page.getByText('Not checked',{exact:false}).waitFor();assert.equal(await page.locator('.card-spend-result').count(),1);assert.equal(await page.locator('.card-stripe-proof').count(),0);assert.match(await page.locator('.card-spend-result').innerText(),/No real card result was confirmed/);await fs.mkdir(repo+'/demo/work/chat-card',{recursive:true});await page.screenshot({path:repo+'/demo/work/chat-card/unavailable.png'});}finally{await browser.close()}
  console.log('PASS actual chat route concurrency isolation and no-key browser failure state (no simulated decline)');
 }finally{child.kill('SIGTERM')}
}finally{process.chdir(cwd);await fs.rm(temp,{recursive:true,force:true})}
