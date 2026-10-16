import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import dotenv from 'dotenv';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clock=()=>performance.now()/1000;
export async function chatDecline(page,holdMS=1200){
 const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/chat'&&r.request().method()==='POST');
 const typingStart=clock();await page.getByRole('textbox').pressSequentially('Spend £80 at Ocado',{delay:65});await page.getByRole('textbox').press('Enter');
 const body=await(await response).json(),r=body.record,p=r?.stripe?.authorization;
 if(r?.demo!=='card'||r.status!=='declined'||p?.approved!==false||p.livemode!==false||p.amount!==8000||!/^iauth_/.test(p.id))throw Error('Real hosted chat decline required');
 const card=page.locator('.card-spend-result');await card.getByText('Declined',{exact:false}).waitFor();
 const responseVisibleAt=clock();await sleep(holdMS);
 const stripeOpenAt=clock();await card.locator('summary').filter({hasText:'Stripe output'}).click({delay:150});
 await card.locator('pre').filter({hasText:p.id}).waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const proofVisibleAt=clock();return {proof:p,audit:{via:'hosted-original-chat'},times:{typingStart,responseVisibleAt,stripeOpenAt,proofVisibleAt}};
}
export async function recordChatCard(){
 dotenv.config({path:'demo/.env',quiet:true});if(!process.env.APP_URL)throw Error('APP_URL required');
 const root=path.resolve('demo/work/chat-card');await fs.mkdir(root,{recursive:true});
 const browser=await chromium.launch({headless:false,args:['--window-size=1920,1200']});
 try{const context=await browser.newContext({viewport:{width:1920,height:1200},deviceScaleFactor:1,recordVideo:{dir:root,size:{width:1920,height:1200}}});
 const css=await fs.readFile('demo/walkthrough.css','utf8');await context.addInitScript(css=>document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=css;document.head.appendChild(s)},{once:true}),css);
 await context.route('**/*',r=>new URL(r.request().url()).hostname==='dashboard.stripe.com'?r.abort():r.continue());
 const page=await context.newPage();page.setDefaultTimeout(60000);await page.goto(process.env.APP_URL,{waitUntil:'networkidle'});await page.mouse.move(1750,1050);await sleep(300);
 await page.evaluate(()=>{const d=document.createElement('div');d.id='capture-marker';d.style='position:fixed;inset:0;background:black;z-index:2147483647';document.body.appendChild(d)});await sleep(500);await page.evaluate(()=>document.querySelector('#capture-marker').remove());const start=clock();await sleep(1000);
 const result=await chatDecline(page,1600);await page.mouse.move(1750,1050);await sleep(4000);const end=clock();await page.screenshot({path:root+'/decline.png'});
 const video=page.video();await context.close();const source=root+'/chat-card.mp4';execFileSync('ffmpeg',['-y','-v','error','-i',await video.path(),'-an','-c:v','libx264','-crf','16','-preset','fast','-r','30',source]);
 const scan=spawnSync('ffmpeg',['-hide_banner','-i',source,'-vf','blackdetect=d=0.2:pix_th=0.02','-an','-f','null','-'],{encoding:'utf8',maxBuffer:4e6});const ends=[...scan.stderr.matchAll(/black_end:([\d.]+)/g)].map(m=>Number(m[1]));if(ends.length!==1)throw Error('Chat sync marker ambiguous');
 const manifest={source:path.relative(process.cwd(),source),captureOffset:ends[0],beforeStart:0,actionStart:result.times.typingStart-start,responseVisibleAt:result.times.responseVisibleAt-start,stripeOpenAt:result.times.stripeOpenAt-start,proofStart:result.times.proofVisibleAt-start,end:end-start,result:{proof:result.proof,audit:result.audit}};
 await fs.writeFile(root+'/beats.json',JSON.stringify(manifest,null,2));console.log('Recorded real card decline through the original chat');return manifest;
 }finally{await browser.close()}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))recordChatCard().catch(e=>{console.error(String(e.message).replace(/https?:\S+/g,'[private URL]'));process.exitCode=1});
