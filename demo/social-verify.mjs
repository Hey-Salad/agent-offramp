import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import dotenv from 'dotenv';
dotenv.config({path:'demo/.env',quiet:true});
const exec=promisify(execFile),out=path.resolve('demo/out'),work=path.resolve('demo/work/gif');
const run=(cmd,args)=>execFileSync(cmd,args,{maxBuffer:20e6,stdio:['ignore','pipe','pipe']});
const checks=[];const check=(name,ok)=>{checks.push({name,ok:!!ok});if(!ok)throw Error('Social check failed: '+name)};
const manifest=JSON.parse(await fs.readFile(out+'/gif-proof/exports.json','utf8'));
const all=[];let decoded=0;
for(const item of manifest.exports){
 const p=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',out+'/'+item.file]));const v=p.streams.find(s=>s.codec_type==='video');
 check(item.file+' dimensions, eight seconds, fps and byte limit',v.width===item.width&&v.height===item.height&&Math.abs(Number(p.format.duration)-8)<.08&&Math.abs(Number(v.nb_frames)/Number(p.format.duration)-item.fps)<.01&&(await fs.stat(out+'/'+item.file)).size<(item.file.endsWith('.gif')?8e6:15e6));
 check(item.file+' silent',!p.streams.some(s=>s.codec_type==='audio'));
 if(item.file.endsWith('.mp4'))check(item.file+' H.264',v.codec_name==='h264');
 else{const b=await fs.readFile(out+'/'+item.file),i=b.indexOf('NETSCAPE2.0');check('GIF loops infinitely',i>=0&&b.readUInt16LE(i+13)===0)}
 const dir=work+'/'+item.file.replace('.','-');await fs.mkdir(dir,{recursive:true});
 for(const n of await fs.readdir(dir))if(n.endsWith('.png'))await fs.unlink(dir+'/'+n);
 run('ffmpeg',['-y','-v','error','-i',out+'/'+item.file,'-fps_mode','passthrough',dir+'/frame-%03d.png']);
 const names=(await fs.readdir(dir)).filter(n=>n.endsWith('.png')).sort();decoded+=names.length;
 check(item.file+' every frame decoded',names.length===item.fps*8);
 const hash=new Map();for(const n of names){const file=dir+'/'+n,key=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');if(!hash.has(key)){hash.set(key,file);all.push({file,export:item.file})}}
 const pixels=n=>run('ffmpeg',['-v','error','-i',dir+'/'+n,'-vf','scale=320:320','-pix_fmt','rgb24','-f','rawvideo','-']);const first=pixels(names[0]),last=pixels(names.at(-1));let diff=0,big=0;for(let i=0;i<first.length;i++){const d=Math.abs(first[i]-last[i]);diff+=d;if(d>15)big++}
 item.loopBoundary={meanAbsoluteRGBError:diff/first.length,largeDifferenceFraction:big/first.length};
 check(item.file+' stable matching loop boundary',diff/first.length<1&&big/first.length<.01);
}
const known=Object.entries(process.env).filter(([k,v])=>v?.length>=16&&(k.includes('KEY')||k==='APP_URL')).map(([,v])=>v.replace(/[^a-z0-9]/gi,'').toLowerCase());
const ocr=[];
for(let start=0;start<all.length;start+=6){const batch=await Promise.all(all.slice(start,start+6).map(async s=>({...s,text:(await exec('tesseract',[s.file,'stdout','--psm','11'],{maxBuffer:1e6})).stdout})));
 for(const s of batch){
  const secret=/(?:sk|rk)_(?:live|test)_[a-zA-Z0-9]{12,}|whsec_[A-Za-z0-9]+|(?:pi|seti)_[A-Za-z0-9]+_secret_[A-Za-z0-9]+/i.test(s.text);
  const fullCard=/(?<![A-Za-z0-9])(?:\d[ -]?){12,18}\d(?![A-Za-z0-9])/.test(s.text);
  const normalized=s.text.replace(/[^a-z0-9]/gi,'').toLowerCase();const environmentLeak=known.some(v=>normalized.includes(v));
  check(path.relative(work,s.file)+' no keys, PAN or client secret',!secret&&!fullCard&&!environmentLeak);
  check(path.relative(work,s.file)+' no stray memory/header text',!/Cognee|remembers|preferences|decisions|Example agent/i.test(s.text));
  ocr.push({file:path.relative(work,s.file),text:s.text});
 }
 console.log('Scanned '+Math.min(start+6,all.length)+'/'+all.length+' distinct decoded frames');
}
await fs.writeFile(work+'/security-ocr-private.json',JSON.stringify(ocr,null,2),{mode:0o600});
const readme=await fs.readFile('README.md','utf8');check('README exact alt and hero below tagline',readme.includes('alt="Agent 9 demo: nine Stripe workflows, checkout, receipts and invoice PDF"')&&readme.indexOf('src="demo/out/agent9.gif')>readme.indexOf('Give your agent a financial operating system.'));
await fs.writeFile(out+'/gif-proof/verification.json',JSON.stringify({decodedFrames:decoded,distinctFramesScanned:all.length,checks,loopBoundaries:manifest.exports.map(i=>({file:i.file,...i.loopBoundary})),security:'Every decoded frame covered by exact-image deduplication and OCR; no key, full card number, client secret or known credential/app-origin value detected. Raw OCR stays ignored.'},null,2));
console.log('Social verification passed '+checks.length+' checks; '+decoded+' decoded frames covered.');
