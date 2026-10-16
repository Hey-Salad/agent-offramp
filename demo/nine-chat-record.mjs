import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {scenes} from './scenes.mjs';
import {cardHTML} from './cards.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clock=()=>performance.now()/1000;
export async function recordNineChat(root,{resume=false,onlyScene=null}={}){
 const raw=root+'/raw';await fs.mkdir(raw,{recursive:true});
 const browser=await chromium.launch({headless:false,args:['--window-size=1920,1200']});
 const beats=resume||onlyScene!==null?JSON.parse(await fs.readFile(root+'/beats.json','utf8')):[];
 const indices=onlyScene!==null?[onlyScene]:Array.from({length:11-beats.length},(_,i)=>i+beats.length);
 const css=await fs.readFile('demo/walkthrough.css','utf8');
 try{for(const i of indices){
  const name='scene-'+String(i).padStart(2,'0');
  const context=await browser.newContext({viewport:{width:1920,height:1200},deviceScaleFactor:1,recordVideo:{dir:raw,size:{width:1920,height:1200}}});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='dashboard.stripe.com'?r.abort():r.continue());
  if(i>0&&i<10)await context.addInitScript(css=>document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=css+'\n#mem,.chat>header,.chat>div:has(>.bcw){display:none!important} .card{flex-shrink:0!important} #log{padding-top:100px!important}';document.head.appendChild(s)},{once:true}),css);
  const page=await context.newPage();page.setDefaultTimeout(90000);
  let examples;
  if(i===0||i===10){await page.setContent(await cardHTML(i===10));await page.evaluate(()=>document.fonts.ready)}
  else{
   await page.goto(process.env.APP_URL,{waitUntil:'networkidle'});
   examples=await(await context.request.get(new URL('/api/chat/examples',process.env.APP_URL).href)).json();
   if(examples.length!==9)throw Error('Deploy nine original-chat examples before recording');
  }
  await page.mouse.move(1750,1100);await sleep(300);
  await page.evaluate(()=>{const d=document.createElement('div');d.id='capture-marker';d.style='position:fixed;inset:0;background:#000;z-index:2147483647';document.body.appendChild(d)});await sleep(500);
  await page.evaluate(()=>document.querySelector('#capture-marker').remove());const start=clock();let action=start,proof=start,result=null,responseVisibleAt=null;
  if(i>0&&i<10){
   await sleep(1000);action=clock();
   const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/chat'&&r.request().method()==='POST');
   await page.locator('#q').pressSequentially(examples[i-1].text,{delay:28});await page.locator('#q').press('Enter');
   const body=await(await pending).json(),r=body.record,p=i===5?r?.stripe?.authorization:r?.stripe?.verified;
   if(!p?.id||p.livemode!==false)throw Error('No real Stripe proof for scene '+i);
   if(i===5&&(p.approved!==false||r.status!=='declined'))throw Error('Actual card decline required');
   const card=page.locator(i===5?'.card-spend-result':'.business-result');
   await card.waitFor();responseVisibleAt=clock()-start;await sleep(1200);
   await card.locator('summary').filter({hasText:'Stripe output'}).click({delay:150});await card.locator('pre').waitFor();
   // Normal chat scroll, no camera movement. Ensure every proof line fits above the composer.
   await page.evaluate(()=>{const log=document.querySelector('#log');log.scrollTop=log.scrollHeight});
   await page.mouse.move(1750,1100);await sleep(200);proof=clock();
   const full=await(await context.request.get(new URL('/api/records/'+r.id,process.env.APP_URL).href)).json();
   const tool=full.audit.findLast(a=>a.event==='stripe_tool');
   if(i===9&&tool?.via!=='agent-toolkit')throw Error('Actual Toolkit required');
   result={reply:body.reply,proof:p,audit:tool?{via:tool.via,operations:tool.tools}:{via:'hosted-original-chat'},recordId:r.id};
   await sleep(6000);
  }else await sleep(i===0?6500:4500);
  const end=clock();await page.screenshot({path:raw+'/'+name+'-final.png'});
  const video=page.video();await context.close();const source=raw+'/'+name+'.mp4';
  execFileSync('ffmpeg',['-y','-v','error','-i',await video.path(),'-an','-c:v','libx264','-preset','fast','-crf','16','-r','30',source]);
  const scan=spawnSync('ffmpeg',['-hide_banner','-i',source,'-vf','blackdetect=d=0.2:pix_th=0.02','-an','-f','null','-'],{encoding:'utf8',maxBuffer:4e6});
  const ends=[...scan.stderr.matchAll(/black_end:([\d.]+)/g)].map(m=>Number(m[1]));if(ends.length!==1)throw Error('Ambiguous capture marker '+i);
  beats[i]={scene:i,product:scenes[i].product,target:i===0||i===10?'rendered-html':'hosted-test-app',source:path.relative(process.cwd(),source),captureOffset:ends[0],beforeStart:0,actionStart:action-start,responseVisibleAt,proofStart:proof-start,end:end-start,result};
  await fs.writeFile(root+'/beats.json',JSON.stringify(beats,null,2));console.log('Recorded original chat '+i+': '+scenes[i].product);
 }}finally{await browser.close()}
}
