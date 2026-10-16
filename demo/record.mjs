import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {scenes} from './scenes.mjs';
import {cardHTML} from './cards.mjs';
import {chatDecline} from './chat-card-record.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Node's monotonic clock survives the hosted app's post-action page reload.
const stamp=async()=>performance.now()/1000;
export async function hostedSetup(context){
 const css=await fs.readFile('demo/walkthrough.css','utf8');
 await context.addInitScript(css=>{document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=css;document.head.appendChild(s)},{once:true})},css);
}
export async function hostedDecline(page){
 const result=await chatDecline(page,1200);
 return {reply:'£80 declined in the original Sally chat',proof:result.proof,audit:result.audit};
}

async function marker(page){
 await page.evaluate(()=>{let d=document.createElement('div');d.id='capture-marker';d.style='position:fixed;inset:0;background:#000;z-index:2147483647';document.body.appendChild(d)});
 await sleep(500);
 await page.evaluate(()=>document.querySelector('#capture-marker').remove());
 return performance.now()/1000;
}
export async function record(root,localURL,resume=false,onlyScene=null){
 const raw=path.resolve(root,'raw');await fs.mkdir(raw,{recursive:true});
 const browser=await chromium.launch({headless:false,args:['--window-size=1920,1200']});const beats=resume||onlyScene!==null?JSON.parse(await fs.readFile(root+'/beats.json','utf8')):[];
 const indices=onlyScene!==null?[onlyScene]:Array.from({length:scenes.length-beats.length},(_,i)=>i+beats.length);
 try{for(const i of indices){
  const name='scene-'+String(i).padStart(2,'0');
  const context=await browser.newContext({viewport:{width:1920,height:1200},deviceScaleFactor:1,recordVideo:{dir:raw,size:{width:1920,height:1200}}});
  await context.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return host==='dashboard.stripe.com'?route.abort():route.continue()});
  const hosted=i===5;if(hosted)await hostedSetup(context);
  const page=await context.newPage();page.setDefaultTimeout(60000);
  if(i===0||i===10){await page.setContent(await cardHTML(i===10));await page.evaluate(()=>document.fonts.ready)}
  else {let url=hosted?new URL('/',process.env.APP_URL).href:new URL('/agent9?scene='+i,localURL).href;await page.goto(url,{waitUntil:'networkidle'});}
  await page.mouse.move(1600,1050);await sleep(300);
  const start=await marker(page);let action=start,proof=start,result=null;
  if(i>0&&i<10){await sleep(1000);action=await stamp(page);
   if(hosted)result=await hostedDecline(page);
   else {await page.getByRole('button',{name:'Send request',exact:true}).click({delay:120});await page.waitForFunction(()=>['ready','error'].includes(document.body.dataset.proof));result=await page.evaluate(()=>window.lastResult);if(!result?.proof)throw Error('Scene '+i+' has no verified Stripe proof');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
   await page.mouse.move(1600,1050);await sleep(120);proof=await stamp(page);await sleep(6000);
  }else await sleep(i===0?6500:4500);
  const end=await stamp(page);
  await page.screenshot({path:path.join(raw,name+'-final.png')});
  const video=page.video();await context.close();const webm=await video.path();
  const source=path.join(raw,name+'.mp4');execFileSync('ffmpeg',['-y','-v','error','-i',webm,'-an','-c:v','libx264','-preset','fast','-crf','16','-r','30',source]);
  const {spawnSync}=await import('node:child_process');const scan=spawnSync('ffmpeg',['-hide_banner','-i',source,'-vf','blackdetect=d=0.2:pix_th=0.02','-an','-f','null','-'],{encoding:'utf8',maxBuffer:4e6});
  const ends=[...scan.stderr.matchAll(/black_end:([\d.]+)/g)].map(m=>Number(m[1]));if(ends.length!==1)throw Error('Capture marker ambiguous for scene '+i);
  const beat={scene:i,product:scenes[i].product,target:hosted?'hosted-test-app':i===0||i===10?'rendered-html':'local-test-app',source:path.relative(process.cwd(),source),captureOffset:ends[0],beforeStart:0,actionStart:action-start,proofStart:proof-start,end:end-start,result};
  beats[i]=beat;await fs.writeFile(root+'/beats.json',JSON.stringify(beats,null,2));console.log('Recorded '+name+' '+scenes[i].product);
 }}finally{await browser.close()}
 return beats;
}
