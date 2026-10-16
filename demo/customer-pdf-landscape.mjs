// A separate fixed PDF reading view keeps text legible in the wide export.
// Portrait retains the full-page view from the same invoice journey.
import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import{pathToFileURL}from'node:url';import{execFileSync,spawnSync}from'node:child_process';import{chromium}from'playwright';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));const clock=()=>performance.now()/1000;
export async function recordWidePDF(root){
 const beats=JSON.parse(await fs.readFile(root+'/beats.json','utf8')),b=beats[4];
 const r=await(await fetch(new URL('/api/records/'+b.recordId,process.env.APP_URL))).json();if(r.stripe?.invoice?.id!==b.proof.id||r.status!=='paid')throw Error('Matching paid test invoice required');
 const browser=await chromium.launch({headless:false,args:['--window-size=1920,1200']});
 try{
  const c=await browser.newContext({viewport:{width:1920,height:1200},acceptDownloads:true,recordVideo:{dir:root+'/raw',size:{width:1920,height:1200}}});
  await c.route('**/*',route=>new URL(route.request().url()).hostname==='dashboard.stripe.com'?route.abort():route.continue());
  const p=await c.newPage();p.setDefaultTimeout(60000);await p.goto(r.stripe.invoice.hostedUrl,{waitUntil:'domcontentloaded'});await p.getByRole('button',{name:'Download invoice',exact:true}).waitFor();
  await p.evaluate(()=>{const d=document.createElement('div');d.id='sync-marker';d.style='position:fixed;inset:0;background:black;z-index:2147483647';document.body.appendChild(d)});await sleep(500);await p.evaluate(()=>document.querySelector('#sync-marker').remove());const start=clock();await sleep(1000);const action=clock();
  const dl=new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('PDF download timed out')),60000);const f=d=>{clearTimeout(t);resolve(d)};for(const page of c.pages())page.once('download',f);c.on('page',page=>page.once('download',f))});await p.getByRole('button',{name:'Download invoice',exact:true}).click({delay:160});
  const download=await dl,file=path.resolve(root,'invoice-landscape.pdf');await download.saveAs(file);const bytes=await fs.readFile(file);if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Real PDF required');
  const text=execFileSync('python3',['-c','from pypdf import PdfReader; import sys; print(" ".join(p.extract_text() or "" for p in PdfReader(sys.argv[1]).pages))',file],{encoding:'utf8'}),clean=s=>s.replace(/[^a-z0-9]/gi,'');if(!clean(text).includes(clean(b.proof.invoiceNumber))||!text.includes((b.proof.amount/100).toFixed(2)))throw Error('PDF invoice mismatch');
  await p.goto(pathToFileURL(file).href+'#zoom=125',{waitUntil:'load'}).catch(()=>{});await sleep(3000);await p.mouse.click(32,28,{delay:160});await sleep(700);await p.mouse.move(1750,1100);const proof=clock();await p.screenshot({path:root+'/raw/customer-pdf-wide.png'});await sleep(6500);const end=clock();
  const v=p.video();await c.close();const source=root+'/raw/customer-pdf-wide.mp4';execFileSync('ffmpeg',['-y','-v','error','-i',await v.path(),'-an','-c:v','libx264','-crf','16','-preset','fast','-r','30',source]);
  const scan=spawnSync('ffmpeg',['-hide_banner','-i',source,'-vf','blackdetect=d=0.2:pix_th=0.02','-an','-f','null','-'],{encoding:'utf8',maxBuffer:4e6});const ends=[...scan.stderr.matchAll(/black_end:([\d.]+)/g)].map(m=>Number(m[1]));if(ends.length!==1)throw Error('PDF marker ambiguous');
  b.landscape={source:path.relative(process.cwd(),source),actionStart:action-start+ends[0],proofStart:proof-start+ends[0],end:end-start+ends[0],captureOffset:ends[0],pdfFile:path.relative(process.cwd(),file),pdfSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),invoiceNumberMatched:true};
  await fs.writeFile(root+'/beats.json',JSON.stringify(beats,null,2));console.log('Recorded wide native PDF reading view, matching invoice');
 }finally{await browser.close()}
}
