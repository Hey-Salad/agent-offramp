import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import{execFileSync,execFile}from'node:child_process';import{promisify}from'node:util';
const exec=promisify(execFile);const run=(cmd,args)=>execFileSync(cmd,args,{maxBuffer:20e6});
export async function verifyCustomers(root,out){
 const rows=JSON.parse(await fs.readFile(root+'/timeline-private.json','utf8')),beats=JSON.parse(await fs.readFile(out+'/customer-beats.json','utf8'));
 const checks=[],check=(name,ok)=>{checks.push({name,ok:!!ok});if(!ok)throw Error('Customer verification failed: '+name)};
 check('Nine chat scenes, five customer pages, final slate',rows.length===16&&rows[9].product==='Agent Toolkit'&&rows[14].product==='Invoice PDF');
 check('Invoice page and PDF match the same test invoice',beats[3].proof.id===beats[4].proof.id&&beats[4].proof.invoiceNumberMatched&&beats[4].proof.pdfMagic);
 const bytes=await fs.readFile(root+'/invoice.pdf');check('Displayed actual PDF bytes match download hash',crypto.createHash('sha256').update(bytes).digest('hex')===beats[4].proof.pdfSHA256);
 for(const b of beats)check(b.product+' verified real test object',b.proof.livemode===false&&/^(pi|cs_test|plink|in)_/.test(b.proof.id));
 check('Wide PDF bytes match actual customer download',beats[4].landscape?.invoiceNumberMatched&&crypto.createHash('sha256').update(await fs.readFile(path.resolve(beats[4].landscape.pdfFile))).digest('hex')===beats[4].landscape.pdfSHA256);
 const pcm=file=>{const b=run('ffmpeg',['-v','error','-i',file,'-vn','-ac','1','-ar','8000','-f','f32le','-']);return new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};
 const audio=pcm(out+'/agent9-walkthrough.mp4'),vertical=pcm(out+'/agent9-walkthrough-vertical.mp4');check('Identical narration in both formats',audio.length===vertical.length&&audio.every((v,i)=>Math.abs(v-vertical[i])<.001));
 const alignment=[];
 for(const r of rows){const ref=pcm(r.voiceFile),expected=Math.round(r.voiceStart*8000);let best=-1,lag=0;
  for(let shift=-800;shift<=800;shift+=2){let dot=0,aa=0,bb=0;for(let k=800;k<ref.length-800;k+=8){const a=ref[k],b=audio[expected+shift+k]||0;dot+=a*b;aa+=a*a;bb+=b*b}const score=dot/Math.sqrt(aa*bb||1);if(score>best){best=score;lag=shift}}
  check(r.product+' spoken after visible result',r.proofVisibleAt==null||r.voiceStart>=r.proofVisibleAt);
  check(r.product+' measured voice synchronization',best>.9&&Math.abs(lag/8000)<.05);alignment.push({product:r.product,offsetSeconds:lag/8000,correlation:best});
 }
 const qa=out+'/customer-qa';await fs.mkdir(qa,{recursive:true});const samples=[];
 const normalize=s=>s.replace(/[^a-z0-9]/gi,'').toLowerCase();const known=Object.entries(process.env).filter(([k,v])=>v?.length>=16&&(k.includes('KEY')||k==='APP_URL')).map(([,v])=>normalize(v));
 for(const portrait of[false,true]){
  const suffix=portrait?'-vertical':'',file=out+'/agent9-walkthrough'+suffix+'.mp4',info=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));const v=info.streams.find(s=>s.codec_type==='video'),a=info.streams.find(s=>s.codec_type==='audio');
  check('Dimensions '+suffix,v.width===(portrait?1080:1920)&&v.height===(portrait?1920:1080));
  check('Longer walkthrough duration '+suffix,Number(info.format.duration)>59.133&&Number(info.format.duration)<120&&Math.abs(Number(info.format.duration)-rows.at(-1).end)<.08);
  check('No subtitles; one narration track '+suffix,!info.streams.some(s=>s.codec_type==='subtitle')&&info.streams.filter(s=>s.codec_type==='audio').length===1);
  check('Audio/video start together '+suffix,Math.abs(Number(v.start_time)-Number(a.start_time))<.04);
  const folder=qa+'/'+(portrait?'vertical':'landscape');await fs.mkdir(folder,{recursive:true});for(const n of await fs.readdir(folder))if(/^frame-\d+\.png$/.test(n))await fs.unlink(folder+'/'+n);
  run('ffmpeg',['-y','-v','error','-i',file,'-vf','select=not(mod(n\\,60))','-fps_mode','vfr',folder+'/frame-%03d.png']);
  for(const n of await fs.readdir(folder))if(n.endsWith('.png'))samples.push(folder+'/'+n);
  run('ffmpeg',['-y','-v','error','-framerate','1','-i',folder+'/frame-%03d.png','-vf',portrait?'scale=135:240,tile=8x6:padding=4:color=white':'scale=320:180,tile=6x8:padding=4:color=white','-frames:v','1',qa+'/'+(portrait?'vertical':'landscape')+'-contact.png']);
  // Confirm the original nine financial proof shots survive unchanged in the longer cut.
  for(const r of rows.slice(1,10)){
   const frame=t=>run('ffmpeg',['-v','error','-ss',String(Math.ceil(r.productNamedAt*30)/30),'-i',t,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-']);
   const old=frame(out+'/agent9-demo'+suffix+'.mp4'),now=frame(file);check(r.product+' original chat pixels preserved '+suffix,old.equals(now));
  }
  for(let i=0;i<5;i++)samples.push(out+'/customer-proof/'+i+suffix+'.png');
 }
 const ocr=[];
 for(let k=0;k<samples.length;k+=4){const batch=await Promise.all(samples.slice(k,k+4).map(async file=>({file:path.relative(out,file),text:(await exec('tesseract',[file,'stdout','--psm','11'],{maxBuffer:1e6})).stdout})));
  for(const s of batch){
   check(s.file+' no app origin or login screen',!/modal\.run|localhost|dashboard\.stripe\.com|log in to your stripe account|sign in to your stripe account/i.test(s.text));
   const noHints=s.text.replace(/1234[ -]?1234[ -]?1234[ -]?1234/g,'[empty Stripe form placeholder]');
   check(s.file+' no keys, client secrets or full card data',!/(?:sk|rk)_(?:live|test)_[a-zA-Z0-9]{12,}|whsec_[A-Za-z0-9]+|(?:pi|seti)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+|client_secret|(?<![A-Za-z0-9])(?:\d[ -]?){12,18}\d(?![A-Za-z0-9])/i.test(noHints)&&!known.some(v=>normalize(s.text).includes(v)));
   ocr.push(s);
  }
 }
 for(const suffix of['','-vertical']){
  const texts=ocr.filter(x=>x.file==='customer-proof/4'+suffix+'.png').map(x=>x.text).join('\n');
  check('Invoice PDF amount visible '+suffix,/184[.,]60/.test(texts));
  check('Invoice PDF number visible '+suffix,normalize(texts).includes(normalize(beats[4].proof.invoiceNumber)));
 }
 await fs.writeFile(qa+'/checks.json',JSON.stringify(checks,null,2));await fs.writeFile(qa+'/audio-alignment.json',JSON.stringify(alignment,null,2));await fs.writeFile(qa+'/ocr.json',JSON.stringify(ocr,null,2));
 console.log('Verified '+checks.length+' customer-walkthrough checks; short overview unchanged');return checks;
}
