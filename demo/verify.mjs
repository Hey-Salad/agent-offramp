import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const run=(name,args)=>execFileSync(name,args,{encoding:'utf8',maxBuffer:8e6});
export async function verify(out){
 const beats=JSON.parse(await fs.readFile(out+'/beats.json','utf8'));
 const timeline=JSON.parse(await fs.readFile(out+'/timeline.json','utf8'));
 const checks=[];const check=(name,ok)=>{checks.push({name,ok:!!ok});if(!ok)throw Error('Verification failed: '+name)};
 check('Nine financial scenes in required order',beats.length===11&&beats[1].product==='PaymentIntents'&&beats[9].product==='Agent Toolkit');
 const expected=['succeeded','open','active','draft','closed','succeeded','active','succeeded','draft'];
 for(let i=1;i<=9;i++){
  const p=beats[i].proof;
  check('Scene '+i+' verified test object',p?.id&&p.livemode===false&&(p.status??(p.active?'active':''))===expected[i-1]);
  check('Scene '+i+' proof precedes product name',timeline[i].productNamedAt>=timeline[i].proofVisibleAt);
 }
 check('Real Issuing decline on hosted app',beats[5].proof.approved===false&&beats[5].proof.amount===8000&&beats[5].target==='hosted-test-app');
 check('Connect transfer and platform fee',/^tr_/.test(beats[6].proof.transfer)&&beats[6].proof.application_fee_amount===300&&beats[6].proof.transfer_amount>0&&/^[a-z]{3}$/.test(beats[6].proof.transfer_currency));
 check('Actual Toolkit execution',beats[9].proof.execution?.via==='agent-toolkit');
 const pcm=file=>{const b=execFileSync('ffmpeg',['-v','error','-i',file,'-vn','-ac','1','-ar','8000','-f','f32le','-'],{maxBuffer:8e6});return new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};
 const audio=pcm(out+'/agent9-demo.mp4');
 const verticalAudio=pcm(out+'/agent9-demo-vertical.mp4');
 check('Both formats use identical narration',audio.length===verticalAudio.length&&audio.every((v,i)=>Math.abs(v-verticalAudio[i])<.001));
 const voices=JSON.parse(await fs.readFile(path.resolve('demo/work/agent9/voice.json'),'utf8'));
 const alignment=[];
 for(let i=0;i<11;i++){
  const ref=pcm(voices[i].file);const expected=Math.round(timeline[i].voiceStart*8000);let best=-1,lag=0;
  for(let shift=-800;shift<=800;shift+=2){let dot=0,aa=0,bb=0;for(let k=800;k<ref.length-800;k+=8){const a=ref[k],b=audio[expected+shift+k]||0;dot+=a*b;aa+=a*a;bb+=b*b}const score=dot/Math.sqrt(aa*bb||1);if(score>best){best=score;lag=shift}}
  check('Scene '+i+' measured voice alignment',best>.9&&Math.abs(lag/8000)<.05);
  alignment.push({scene:i,correlation:best,offsetSeconds:lag/8000});
 }
 const files=['agent9-demo.mp4','agent9-demo-vertical.mp4'];
 for(let i=0;i<files.length;i++){
  const file=path.join(out,files[i]);const info=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));const v=info.streams.find(s=>s.codec_type==='video'),a=info.streams.find(s=>s.codec_type==='audio');
  check(files[i]+' dimensions',v.width===(i?1080:1920)&&v.height===(i?1920:1080));
  check(files[i]+' duration 50–60s',Number(info.format.duration)>=50&&Number(info.format.duration)<=60);
  check(files[i]+' audio and video begin together',Math.abs(Number(v.start_time)-Number(a.start_time))<.04);
  check(files[i]+' no subtitle stream',!info.streams.some(s=>s.codec_type==='subtitle'));
  check(files[i]+' exactly one audio stream',info.streams.filter(s=>s.codec_type==='audio').length===1);
 }
 // Inspect both final formats every two seconds, and save the images for visual review.
 await fs.mkdir(out+'/qa',{recursive:true});
 for(const vertical of [false,true]){
  const dest=out+'/qa/'+(vertical?'vertical':'landscape');await fs.mkdir(dest,{recursive:true});
  for(const name of await fs.readdir(dest))if(/^frame-\d+\.png$/.test(name))await fs.unlink(dest+'/'+name);
  run('ffmpeg',['-y','-v','error','-i',out+'/'+(vertical?files[1]:files[0]),'-vf','select=not(mod(n\\,60))','-fps_mode','vfr',dest+'/frame-%02d.png']);
 }
 run('ffmpeg',['-y','-v','error','-framerate','1','-i',out+'/qa/landscape/frame-%02d.png','-vf','scale=384:216,tile=5x6:padding=4:color=white','-frames:v','1',out+'/qa/landscape-contact.png']);
 run('ffmpeg',['-y','-v','error','-framerate','1','-i',out+'/qa/vertical/frame-%02d.png','-vf','scale=180:320,tile=6x5:padding=4:color=white','-frames:v','1',out+'/qa/vertical-contact.png']);
 run('ffmpeg',['-y','-v','error','-ss','1','-i',out+'/'+files[0],'-frames:v','1',out+'/qa/opening.png']);
 run('ffmpeg',['-y','-v','error','-ss',String(timeline[10].start+1),'-i',out+'/'+files[0],'-frames:v','1',out+'/qa/closing.png']);
 const proofNames=(await fs.readdir(out+'/proof')).filter(n=>n.endsWith('.png'));
 check('Nine proof frames per format',proofNames.length===18);
 const ocr=[];
 for(const name of proofNames){
  const text=run('tesseract',[path.join(out,'proof',name),'stdout','--psm','11']);
  check(name+' no login or visible app URL',!/https?:\/\/|modal\.run|localhost|sign in|log in|login|dashboard\.stripe\.com/i.test(text));
  const idx=Number(name.slice(0,2));const p=beats[idx].proof;
  check(name+' readable status',new RegExp(idx===3?'true':p.status,'i').test(text));
  ocr.push({file:name,text});
 }
 await fs.writeFile(out+'/qa/proof-ocr.json',JSON.stringify(ocr,null,2));
 const samples=[];
 for(const direction of ['landscape','vertical']){
  const dir=out+'/qa/'+direction;
  for(const name of (await fs.readdir(dir)).filter(n=>n.endsWith('.png')).sort())samples.push({direction,file:dir+'/'+name});
  const bytes=execFileSync('ffmpeg',['-v','error','-i',out+'/'+(direction==='vertical'?files[1]:files[0]),'-vf','select=not(mod(n\\,60)),scale=192:108','-fps_mode','vfr','-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:8e6});
  const frameBytes=192*108*3;
  for(let start=0;start<bytes.length;start+=frameBytes){let pink=0;
   // Look for flat background areas, excluding coloured text antialiasing.
   for(let y=1;y<107;y++)for(let x=1;x<191;x++){
    const k=start+(y*192+x)*3,r=bytes[k],g=bytes[k+1],b=bytes[k+2];
    if(!(r>230&&g>170&&b>150&&r>g+3))continue;
    let flat=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const j=k+(dy*192+dx)*3;if(Math.abs(bytes[j]-r)>2||Math.abs(bytes[j+1]-g)>2||Math.abs(bytes[j+2]-b)>2)flat=false}
    if(flat)pink++;
   }
   check(direction+' frame '+(start/frameBytes)+' no pink background',pink/(192*108)<.005);
  }
 }
 const qaOCR=[];
 // Bounded parallelism keeps review of every two-second frame reasonably quick.
 for(let start=0;start<samples.length;start+=4){
  const batch=await Promise.all(samples.slice(start,start+4).map(async s=>({file:path.relative(out,s.file),text:(await exec('tesseract',[s.file,'stdout','--psm','11'],{maxBuffer:1e6})).stdout})));
  for(const s of batch){check(s.file+' no login or visible app URL',!/https?:\/\/|modal\.run|localhost|sign in|log in|login|dashboard\.stripe\.com/i.test(s.text));qaOCR.push(s)}
 }
 await fs.writeFile(out+'/qa/two-second-ocr.json',JSON.stringify(qaOCR,null,2));
 await fs.writeFile(out+'/qa/audio-alignment.json',JSON.stringify(alignment,null,2));
 await fs.writeFile(out+'/qa/checks.json',JSON.stringify(checks,null,2));
 console.log('Verified '+checks.length+' checks; inspect demo/out/qa and proof frames before publishing.');
 return checks;
}
