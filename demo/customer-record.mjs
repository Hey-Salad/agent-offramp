import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {customerScenes} from './customer-scenes.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const clock=()=>performance.now()/1000;
export async function recordCustomers(root,onlyJourney=null){
 if(onlyJourney!==null&&(!Number.isInteger(onlyJourney)||onlyJourney<0||onlyJourney>3))throw Error('Customer journey must be 0–3');
 const raw=root+'/raw';await fs.mkdir(raw,{recursive:true});const beats=onlyJourney===null?[]:JSON.parse(await fs.readFile(root+'/beats.json','utf8'));
 const css=await fs.readFile('demo/walkthrough.css','utf8');const origin=process.env.APP_URL;
 const browser=await chromium.launch({headless:false,args:['--window-size=1920,1200']});
 const examples=await(await fetch(new URL('/api/chat/examples',origin))).json();
 try{for(let j=0;j<4;j++){
  if(onlyJourney!==null&&j!==onlyJourney)continue;
  const context=await browser.newContext({viewport:{width:1920,height:1200},deviceScaleFactor:1,acceptDownloads:true,recordVideo:{dir:raw,size:{width:1920,height:1200}}});
  await context.route('**/*',r=>new URL(r.request().url()).hostname==='dashboard.stripe.com'?r.abort():r.continue());
  await context.addInitScript(({css,host})=>{if(location.host===host)document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=css+'\n#mem,.chat>header,.chat>div:has(>.bcw){display:none!important}';document.head.appendChild(s)},{once:true})},{css,host:new URL(origin).host});
  console.log('Opening customer journey '+j);
  const page=await context.newPage();page.setDefaultTimeout(90000);await page.goto(origin,{waitUntil:'networkidle'});await page.mouse.move(1750,1100);await sleep(300);
  await page.evaluate(()=>{const d=document.createElement('div');d.id='sync-marker';d.style='position:fixed;inset:0;background:black;z-index:2147483647';document.body.appendChild(d)});await sleep(500);
  await page.evaluate(()=>document.querySelector('#sync-marker').remove());const start=clock(),before=start;await sleep(1000);const action=clock();
  const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/chat'&&r.request().method()==='POST');
  await page.locator('#q').pressSequentially(j===3?'Pay the Bidfood invoice':examples[j].text,{delay:40});await page.locator('#q').press('Enter');const result=await(await response).json(),r=result.record;
  const id=j===3?r?.stripe?.invoice?.id:r?.stripe?.verified?.id;if(!id)throw Error('Missing real Stripe customer result '+j);
  const readback=await(await fetch(new URL('/api/stripe/'+id,origin))).json();const obj=readback.objects?.find(o=>o.id===id);if(obj?.livemode!==false)throw Error('Verified test object required');
  await sleep(1300);
  if(j<3){const link=page.getByRole('link',{name:['Open receipt','Open checkout','Open payment link'][j],exact:true});await link.evaluate(e=>e.removeAttribute('target'));await link.click({delay:160});await page.waitForLoadState('domcontentloaded')}
  else{
   await page.locator('#panel.open').waitFor();await page.getByRole('link',{name:'Full record',exact:true}).last().click({delay:160});await page.waitForLoadState('domcontentloaded');
   const link=page.getByRole('link',{name:'Stripe invoice',exact:true});await link.evaluate(e=>e.removeAttribute('target'));await link.click({delay:160});await page.waitForLoadState('domcontentloaded');
   await page.getByRole('button',{name:'View invoice and payment details',exact:true}).click({delay:160});await page.getByText('Amount remaining',{exact:false}).waitFor();
  }
  if(j===0)await page.waitForFunction(amount=>document.body.innerText.includes(amount),(obj.amount/100).toFixed(2));
  if(j===1)await page.getByRole('button',{name:'Pay',exact:true}).waitFor();
  if(j===2)await page.getByRole('button',{name:'Pay',exact:true}).waitFor();
  await sleep(900);await page.mouse.move(1750,1100);const proof=clock();const body=await page.locator('body').innerText();if(/log in to your stripe account|sign in to your stripe account/i.test(body))throw Error('Unexpected login page');
  const invoiceNumber=j===3?body.match(/Invoice number\s+([A-Z0-9]+-\d+)/i)?.[1]:undefined;
  if(j===3&&!invoiceNumber)throw Error('Visible invoice number required');
  await page.screenshot({path:raw+'/customer-'+j+'-page.png'});await sleep(6500);const end=clock();
  const captured=[{scene:j,product:customerScenes[j].product,beforeStart:before-start,actionStart:action-before,proofStart:proof-before,end:end-before,proof:{id:obj.id,status:obj.status??(obj.active?'active':null),livemode:false,amount:j===0?obj.amount:j===1?obj.amount_total:j===2?6000:obj.total,invoiceNumber},recordId:r.id,verticalCrop:{x:j===0?656:j===3?1312:1000,y:0,width:608,height:1080}}];
  if(j===3){
   const pdfBefore=clock();await sleep(900);const pdfAction=clock();
   // Capture the actual customer download event, including popup-initiated downloads.
   let handler;const downloadPromise=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Invoice PDF download timed out')),60000);handler=d=>{clearTimeout(timer);resolve(d)};for(const p of context.pages())p.once('download',handler);context.on('page',p=>p.once('download',handler))});
   await page.getByRole('button',{name:'Download invoice',exact:true}).click({delay:160});const download=await downloadPromise;
   const file=path.resolve(root,'invoice.pdf');await download.saveAs(file);const bytes=await fs.readFile(file);if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Downloaded file is not a PDF');
   const pdfSHA=crypto.createHash('sha256').update(bytes).digest('hex');
   execFileSync('pdftoppm',['-f','1','-singlefile','-r','130','-png',file,path.resolve(root,'invoice-render')]);
   const text=execFileSync('python3',['-c','from pypdf import PdfReader; import sys; print("\\n".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))',file],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
   // Stripe's PDF font maps hyphens to NUL in text extraction; compare exact
   // letters/digits while allowing separator encoding differences.
   if(!text.replace(/[^a-z0-9]/gi,'').includes(invoiceNumber.replace(/[^a-z0-9]/gi,''))||!/184[.,]60/.test(text))throw Error('PDF does not match the visible invoice number/amount');
   // Open those exact downloaded bytes in Chromium's native PDF viewer.
   // A fixed 75% document view fits all columns inside the portrait content crop.
   await page.goto(pathToFileURL(file).href+'#zoom=75',{waitUntil:'load'}).catch(()=>{});await sleep(3000);await page.mouse.click(32,28,{delay:160});await sleep(700);await page.mouse.move(1750,1100);
   const pdfProof=clock();await page.screenshot({path:raw+'/customer-4-page.png'});await sleep(6500);const pdfEnd=clock();
   if(crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')!==pdfSHA)throw Error('Displayed PDF bytes changed');
   captured.push({scene:4,product:customerScenes[4].product,beforeStart:pdfBefore-start,actionStart:pdfAction-pdfBefore,proofStart:pdfProof-pdfBefore,end:pdfEnd-pdfBefore,proof:{id:obj.id,status:obj.status,livemode:false,amount:obj.total,invoiceNumber,pdfSHA256:pdfSHA,pdfMagic:true,invoiceNumberMatched:true},recordId:r.id,verticalCrop:{x:656,y:0,width:608,height:1080}});
  }
  const video=page.video();await context.close();const source=raw+'/journey-'+j+'.mp4';execFileSync('ffmpeg',['-y','-v','error','-i',await video.path(),'-an','-c:v','libx264','-crf','16','-preset','fast','-r','30',source]);
  const scan=spawnSync('ffmpeg',['-hide_banner','-i',source,'-vf','blackdetect=d=0.2:pix_th=0.02','-an','-f','null','-'],{encoding:'utf8',maxBuffer:4e6});const ends=[...scan.stderr.matchAll(/black_end:([\d.]+)/g)].map(m=>Number(m[1]));if(ends.length!==1)throw Error('Customer sync marker ambiguous');
  for(const b of captured){
   const clip=raw+'/customer-'+String(b.scene).padStart(2,'0')+'.mp4';execFileSync('ffmpeg',['-y','-v','error','-ss',String(ends[0]+b.beforeStart),'-i',source,'-t',String(b.end),'-an','-c:v','libx264','-crf','16','-preset','fast','-r','30',clip]);
   beats[b.scene]={...b,source:path.relative(process.cwd(),clip),captureOffset:0,journeyMarkerEnd:ends[0]};console.log('Recorded customer page: '+b.product);
  }
  await fs.writeFile(root+'/beats.json',JSON.stringify(beats,null,2));
 }}finally{await browser.close()}
 return beats;
}
