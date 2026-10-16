import fs from'node:fs/promises';import path from'node:path';import{execFileSync}from'node:child_process';
const out=path.resolve('demo/out'),work=path.resolve('demo/work/readme-gif'),proof=out+'/readme-gif-proof';await fs.mkdir(work,{recursive:true});await fs.mkdir(proof,{recursive:true});
const ff=args=>execFileSync('ffmpeg',['-y','-v','error',...args],{stdio:['ignore','pipe','pipe'],maxBuffer:20e6});
const overview=JSON.parse(await fs.readFile(out+'/timeline.json','utf8')),customers=JSON.parse(await fs.readFile(out+'/customer-beats.json','utf8'));
const source=out+'/agent9-walkthrough.mp4',cropChat='crop=1060:1060:546:8,scale=1200:1200:flags=lanczos',cropPage='crop=1060:1060:430:8,scale=1200:1200:flags=lanczos';
const shots=[{name:'Nine products',start:1,duration:1.6,crop:cropChat},...overview.slice(1,10).map(r=>({name:r.product,start:r.proofVisibleAt-.65,duration:2,crop:cropChat,proofOffset:.85,status:r.status})),...customers.map(r=>({name:r.product,start:r.proofVisibleAt+.15,duration:2,crop:r.scene===3?'crop=608:1080:1312:0,scale=676:1200:flags=lanczos,pad=1200:1200:262:0:white':cropPage,proofOffset:.2,status:r.proof.status})),{name:'Tagline',start:customers.at(-1).end+.5,duration:1.2,crop:cropChat},{name:'Loop return',start:1,duration:.8,crop:cropChat}];
ff(['-ss','1','-i',source,'-frames:v','1',work+'/loop-card.png']);
let cursor=0;
for(const[i,s]of shots.entries()){
 s.gifStart=cursor;cursor+=s.duration;s.gifEnd=cursor;
 const input=(i===0||i===shots.length-1)?['-loop','1','-i',work+'/loop-card.png']:['-ss',String(s.start),'-i',source];
 ff([...input,'-t',String(s.duration),'-vf',s.crop+',fps=15,setsar=1','-an','-c:v','libx264','-qp','0','-preset','fast','-pix_fmt','yuv420p',work+'/'+i+'.mp4']);
}
await fs.writeFile(work+'/concat.txt',shots.map((_,i)=>`file '${work+'/'+i+'.mp4'}'`).join('\n'));
ff(['-f','concat','-safe','0','-i',work+'/concat.txt','-an','-c:v','copy','-movflags','+faststart',work+'/master.mp4']);
ff(['-i',work+'/master.mp4','-an','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',out+'/agent9-readme.mp4']);
ff(['-i',work+'/master.mp4','-vf','palettegen=max_colors=192:stats_mode=diff:reserve_transparent=0','-frames:v','1',work+'/palette.png']);
ff(['-i',work+'/master.mp4','-i',work+'/palette.png','-filter_complex','[0:v][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle','-an','-loop','0',out+'/agent9.gif']);
for(const[i,s]of shots.entries())if(s.proofOffset!==undefined)ff(['-ss',String(s.gifStart+s.proofOffset),'-i',out+'/agent9.gif','-frames:v','1',proof+'/'+String(i).padStart(2,'0')+'.png']);
await fs.writeFile(proof+'/timeline.json',JSON.stringify({source:'agent9-walkthrough.mp4',seconds:cursor,shots},null,2));console.log('Built full README loop: '+cursor.toFixed(1)+'s; nine chat examples and five customer pages; '+(await fs.stat(out+'/agent9.gif')).size+' bytes');
