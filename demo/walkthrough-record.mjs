import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {walkthroughScenes} from './walkthrough-scenes.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clock=()=>performance.now()/1000;
export async function recordWalkthrough(root, onlyJourney = null){
 const origin=process.env.APP_URL;if(!origin)throw Error('APP_URL required');
 const voices=JSON.parse(await fs.readFile(root+'/voice.json','utf8'));
 const raw=path.join(root,'raw');await fs.mkdir(raw,{recursive:true});
 const css=await fs.readFile('demo/walkthrough.css','utf8');
 const browser=await chromium.launch({headless:false,args:['--window-size=1920,1200']});const beats=onlyJourney===null?[]:JSON.parse(await fs.readFile(root+'/beats.json','utf8'));
 const journeys=[{stages:[0,1,2],command:'restock'},{stages:[3,4],command:'table for 6 Saturday 8pm'},{stages:[5],command:'prepare an invoice for Agent Nine Demo 120 for catering'},{stages:[6,7],command:'pay the Bidfood invoice'}];
 try{for(const [j,journey] of journeys.entries()){
  if(onlyJourney!==null&&j!==onlyJourney)continue;
  const context=await browser.newContext({viewport:{width:1920,height:1200},deviceScaleFactor:1,recordVideo:{dir:raw,size:{width:1920,height:1200}}});
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='dashboard.stripe.com'?route.abort():route.continue());
  await context.addInitScript(({css,host})=>{if(location.host===host)document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=css;document.head.appendChild(s)},{once:true})},{css,host:new URL(origin).host});
  const page=await context.newPage();page.setDefaultTimeout(60000);
  await page.goto(origin,{waitUntil:'domcontentloaded'});await page.mouse.move(1750,1050);await sleep(300);
  await page.evaluate(()=>{const d=document.createElement('div');d.id='sync-marker';d.style='position:fixed;inset:0;background:black;z-index:2147483647';document.body.appendChild(d)});await sleep(500);
  await page.evaluate(()=>document.querySelector('#sync-marker').remove());const start=clock();let result,readback;
  const captured=[];
  for(const [stageIndex,i] of journey.stages.entries()){
   const before=clock();await sleep(stageIndex===0?1000:600);const action=clock();
   if(stageIndex===0){
    const response=page.waitForResponse(r=>r.url()===new URL('/api/chat',origin).href&&r.request().method()==='POST');
    await page.getByRole('textbox').pressSequentially(journey.command,{delay:45});await page.getByRole('textbox').press('Enter');
    result=await(await response).json();if(!result.record?.id)throw Error('Chat did not create a real record');
    const s=result.record.stripe,obj=s.auto||s.paymentLink||s.draft||s.invoice,id=obj?.paymentIntent||obj?.id;
    if(!id)throw Error('Chat result missing Stripe id');
    const verified=await(await fetch(new URL('/api/stripe/'+id,origin))).json();const live=verified.objects?.find(o=>o.id===id);
    if(!live||live.livemode!==false)throw Error('Walkthrough requires verified Stripe test objects');
    readback={id:live.id,livemode:live.livemode,status:live.status??(live.active===true?'active':null)};
    await page.locator('.co').first().waitFor();await page.locator('#panel.open').waitFor();
    // Show the actual reply and cards first, without an overlaid detail sheet.
    await page.getByRole('button',{name:'Close',exact:true}).click({delay:150});
    await page.locator('.msg.me').last().scrollIntoViewIfNeeded();
   }else if(i===1){
    await page.locator('.co').first().click({position:{x:90,y:25},delay:150});await page.locator('#panel.open').waitFor();
    await page.getByRole('link',{name:'Receipt',exact:true}).click({delay:150});await page.waitForLoadState('domcontentloaded');
   }else if(i===2||i===4){
    const link=page.getByRole('link',{name:i===2?'Stripe receipt':'Open link',exact:true});
    await link.evaluate(el=>el.removeAttribute('target'));await link.click({delay:150});await page.waitForLoadState('domcontentloaded');
   }else if(i===7){
    await page.locator('.co').first().click({position:{x:90,y:25},delay:150});await page.locator('#panel.open').waitFor();
    await page.getByRole('link',{name:'Full record',exact:true}).last().click({delay:150});await page.waitForLoadState('domcontentloaded');
    const link=page.getByRole('link',{name:'Stripe invoice',exact:true});await link.evaluate(el=>el.removeAttribute('target'));
    await link.click({delay:150});await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button',{name:'View invoice and payment details',exact:true}).click({delay:150});
    await page.getByText('Amount remaining',{exact:false}).waitFor();
   }
   if(i===4){await page.getByText('Payment method',{exact:true}).waitFor();await page.getByRole('button',{name:'Pay',exact:true}).waitFor({state:'visible'});await sleep(700)}
   await page.mouse.move(1750,1050);await sleep(300);
   const expected=[/Needs approval/,/Receipt/i,/96\.82/,/60\.00/,/60\.00/,/Draft/,/184\.60/,/Invoice paid|Amount paid/i][i];
   await page.waitForFunction(pattern=>new RegExp(pattern,'i').test(document.body.innerText),expected.source,{timeout:60000});
   const text=await page.locator('body').innerText();if(/sign in|log in|login/i.test(text))throw Error('Login found in walkthrough '+i);
   const proof=clock();
   // Real receipt scrolling during narration, after its heading is visible.
   if(i===1){await sleep(1400);await page.mouse.wheel(0,300);await sleep((voices[i].duration-.8)*1000)}else await sleep((voices[i].duration+.6)*1000);
   const end=clock();const name='walkthrough-'+String(i+1).padStart(2,'0');await page.screenshot({path:raw+'/'+name+'-final.png'});
   const stripe=result.record.stripe;const obj=stripe.auto||stripe.paymentLink||stripe.draft||stripe.invoice;
   captured.push({recordId:result.record.id,proof:readback,scene:i,product:walkthroughScenes[i].product,beforeStart:before-start,actionStart:action-before,proofStart:proof-before,end:end-before,verticalCrop:{x:i===4?1000:i===2?656:i===7?1312:772,y:0,width:608,height:1080},objectPrefix:obj?.paymentIntent?'pi_':obj?.id?.split('_')[0]+'_',status:['awaiting_human','succeeded','succeeded','active','unpaid','draft','paid','paid'][i]});
   console.log('Captured chat walkthrough '+(i+1));
  }
  const video=page.video();await context.close();const source=raw+'/journey-'+j+'.mp4';execFileSync('ffmpeg',['-y','-v','error','-i',await video.path(),'-an','-c:v','libx264','-preset','fast','-crf','16','-r','30',source]);
  const scan=spawnSync('ffmpeg',['-hide_banner','-i',source,'-vf','blackdetect=d=0.2:pix_th=0.02','-an','-f','null','-'],{encoding:'utf8',maxBuffer:4e6});
  const ends=[...scan.stderr.matchAll(/black_end:([\d.]+)/g)].map(m=>Number(m[1]));if(ends.length!==1)throw Error('Walkthrough sync marker ambiguous '+j);
  for(const b of captured){
   const sceneSource=raw+'/walkthrough-'+String(b.scene+1).padStart(2,'0')+'.mp4';
   execFileSync('ffmpeg',['-y','-v','error','-ss',String(ends[0]+b.beforeStart),'-i',source,'-t',String(b.end),'-an','-c:v','libx264','-preset','fast','-crf','16','-r','30',sceneSource]);
   beats[b.scene]={...b,source:path.relative(process.cwd(),sceneSource),captureOffset:0,journeyMarkerEnd:ends[0]};
  }
  await fs.writeFile(root+'/beats.json',JSON.stringify(beats,null,2));
 }}finally{await browser.close()}
 return beats;
}
