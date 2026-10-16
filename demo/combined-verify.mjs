import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const run=(cmd,args)=>execFileSync(cmd,args,{maxBuffer:20e6});
export async function verifyCombined(root,out){
 const rows=JSON.parse(await fs.readFile(root+'/combined-timeline-private.json','utf8'));
 const original=JSON.parse(await fs.readFile(out+'/overview/timeline.json','utf8'));
 const checks=[];const check=(name,ok)=>{checks.push({name,ok:!!ok});if(!ok)throw Error('Combined verification failed: '+name)};
 check('Nine-product overview followed by eight walkthrough stages and closing',rows.length===19&&rows[9].product==='Agent Toolkit'&&rows[10].product==='Restock example'&&rows.at(-1).product==='Closing');
 check('Original nine product timings preserved',rows.slice(0,10).every((r,i)=>r.start===original[i].start&&r.end===original[i].end));
 check('Final slate four seconds',rows.at(-1).end-rows.at(-1).start===4);
 const pcm=file=>{const b=run('ffmpeg',['-v','error','-i',file,'-vn','-ac','1','-ar','8000','-f','f32le','-']);return new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};
 const audio=pcm(out+'/agent9-demo.mp4'),verticalAudio=pcm(out+'/agent9-demo-vertical.mp4');
 check('Both formats have identical narration',audio.length===verticalAudio.length&&audio.every((v,i)=>Math.abs(v-verticalAudio[i])<.001));
 const alignment=[];
 for(const r of rows){const ref=pcm(r.voiceFile),expected=Math.round(r.voiceStart*8000);let best=-1,lag=0;
  for(let shift=-800;shift<=800;shift+=2){let dot=0,aa=0,bb=0;for(let k=800;k<ref.length-800;k+=8){const a=ref[k],b=audio[expected+shift+k]||0;dot+=a*b;aa+=a*a;bb+=b*b}const score=dot/Math.sqrt(aa*bb||1);if(score>best){best=score;lag=shift}}
  check(r.product+' voice correlation and offset',best>.9&&Math.abs(lag/8000)<.05);alignment.push({product:r.product,correlation:best,offsetSeconds:lag/8000});
  if(r.proofVisibleAt!==null)check(r.product+' visible before voice',r.productNamedAt>=r.proofVisibleAt);
  if(r.kind==='walkthrough')check(r.product+' real test object readback',r.capture?.proof?.livemode===false&&/^(pi|plink|in)_/.test(r.capture.proof.id));
 }
 await fs.mkdir(out+'/qa',{recursive:true});
 run('ffmpeg',['-y','-v','error','-ss','1','-i',out+'/agent9-demo.mp4','-frames:v','1',out+'/qa/opening.png']);
 run('ffmpeg',['-y','-v','error','-ss',String(rows.at(-1).start+1),'-i',out+'/agent9-demo.mp4','-frames:v','1',out+'/qa/closing.png']);
 const samples=[];
 for(const vertical of [false,true]){
  const file=out+'/agent9-demo'+(vertical?'-vertical':'')+'.mp4';const info=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));const v=info.streams.find(s=>s.codec_type==='video'),a=info.streams.find(s=>s.codec_type==='audio');
  check('Dimensions '+vertical,v.width===(vertical?1080:1920)&&v.height===(vertical?1920:1080));
  check('Extended combined duration 95–120s '+vertical,Number(info.format.duration)>=95&&Number(info.format.duration)<=120&&Math.abs(Number(info.format.duration)-rows.at(-1).end)<.08);
  check('No subtitles and single audio '+vertical,!info.streams.some(s=>s.codec_type==='subtitle')&&info.streams.filter(s=>s.codec_type==='audio').length===1);
  check('Audio/video start together '+vertical,Math.abs(Number(v.start_time)-Number(a.start_time))<.04);
  const direction=vertical?'vertical':'landscape',dest=out+'/qa/'+direction;await fs.mkdir(dest,{recursive:true});
  for(const n of await fs.readdir(dest))if(/^frame-\d+\.png$/.test(n))await fs.unlink(dest+'/'+n);
  run('ffmpeg',['-y','-v','error','-i',file,'-vf','select=not(mod(n\\,60))','-fps_mode','vfr',dest+'/frame-%03d.png']);
  for(const n of (await fs.readdir(dest)).filter(n=>/^frame-\d+\.png$/.test(n)).sort())samples.push({file:dest+'/'+n});
  const pixels=run('ffmpeg',['-v','error','-i',file,'-vf','select=not(mod(n\\,60)),scale=192:108','-fps_mode','vfr','-f','rawvideo','-pix_fmt','rgb24','-']);
  const frameBytes=192*108*3;
  for(let start=0;start<pixels.length;start+=frameBytes){let pink=0;
   for(let y=1;y<107;y++)for(let x=1;x<191;x++){
    const k=start+(y*192+x)*3,r=pixels[k],g=pixels[k+1],b=pixels[k+2];if(!(r>230&&g>170&&b>150&&r>g+3))continue;
    let flat=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const j=k+(dy*192+dx)*3;if(Math.abs(pixels[j]-r)>2||Math.abs(pixels[j+1]-g)>2||Math.abs(pixels[j+2]-b)>2)flat=false}if(flat)pink++;
   }
   check(direction+' sample '+start/frameBytes+' no pink background',pink/(192*108)<.005);
  }

  run('ffmpeg',['-y','-v','error','-framerate','1','-i',dest+'/frame-%03d.png','-vf',vertical?'scale=108:192,tile=9x6:padding=3:color=white':'scale=288:162,tile=9x6:padding=3:color=white','-frames:v','1',out+'/qa/'+direction+'-contact.png']);
 }
 const ocr=[];
 for(let start=0;start<samples.length;start+=4){const batch=await Promise.all(samples.slice(start,start+4).map(async s=>({file:path.relative(out,s.file),text:(await exec('tesseract',[s.file,'stdout','--psm','11'],{maxBuffer:1e6})).stdout})));for(const s of batch){check(s.file+' no login or live app URL',!/modal\.run|localhost|127\.0\.0\.1|sign in|log in|login|dashboard\.stripe\.com/i.test(s.text));ocr.push(s)}}
 const proofFiles=(await fs.readdir(out+'/proof')).filter(n=>n.endsWith('.png'));
 check('Seventeen proof frames in each format',proofFiles.length===34);
 for(const n of proofFiles.filter(n=>!n.startsWith('walkthrough-')))check(n+' original overview frame preserved',(await fs.readFile(out+'/proof/'+n)).equals(await fs.readFile(out+'/overview/proof/'+n)));
 const proofOCR=[];
 for(const n of proofFiles){const text=run('tesseract',[out+'/proof/'+n,'stdout','--psm','11']).toString();check(n+' no app URL or login',!/modal\.run|localhost|sign in|log in|login/i.test(text));if(n==='walkthrough-05-vertical.png')check('Checkout form readable when voice starts',/contact information/i.test(text)&&/payment method/i.test(text)&&/Pay/.test(text));proofOCR.push({file:n,text})}
 // Capture CSS and edit filters are static crops; frames are also reviewed visually for style/layout.
 const css=await fs.readFile('demo/walkthrough.css','utf8'),edit=await fs.readFile('demo/combine.mjs','utf8');
 check('No caption rendering or animated crop filters',!/(?:drawtext|subtitles=|zoompan=)/.test(edit));
 check('White original app presentation',css.includes('background:#fff!important'));
 await fs.writeFile(out+'/qa/checks.json',JSON.stringify(checks,null,2));await fs.writeFile(out+'/qa/audio-alignment.json',JSON.stringify(alignment,null,2));await fs.writeFile(out+'/qa/two-second-ocr.json',JSON.stringify(ocr,null,2));await fs.writeFile(out+'/qa/proof-ocr.json',JSON.stringify(proofOCR,null,2));
 console.log('Combined verification passed '+checks.length+' checks. Review proof and contact sheets visually.');return checks;
}
