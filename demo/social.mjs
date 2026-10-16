import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const out=path.resolve('demo/out'),work=path.resolve('demo/work/gif');
await fs.mkdir(work,{recursive:true});await fs.mkdir(out+'/gif-proof',{recursive:true});
const run=(name,args)=>execFileSync(name,args,{stdio:['ignore','pipe','pipe'],maxBuffer:20e6});
const ff=args=>run('ffmpeg',['-y','-v','error',...args]);
const timeline=JSON.parse(await fs.readFile(out+'/timeline.json','utf8'));
const beat=timeline.find(r=>r.product==='Issuing');if(!beat)throw Error('Issuing timeline missing');
const source=out+'/agent9-demo.mp4';
// Cyclic edit: 1 second of genuine decline proof, then the complete card scene
// retimed to 7 seconds. First and last frames show the same stable proof view.
// These are recorded frames, never recreated UI or caption overlays.
const core=`[0:v]split=2[p][s];[p]trim=start=${beat.proofVisibleAt+.3}:duration=1,setpts=PTS-STARTPTS,fps=30,trim=end_frame=30[p1];[s]trim=start=${beat.start}:end=${beat.end},setpts=(PTS-STARTPTS)*${7/(beat.end-beat.start)},fps=30,tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame=210[s1];[p1][s1]concat=n=2:v=1:a=0,fps=30,setsar=1[v]`;
ff(['-i',source,'-filter_complex',core,'-map','[v]','-an','-frames:v','240','-c:v','libx264','-crf','16','-preset','fast','-pix_fmt','yuv420p',work+'/loop-master.mp4']);
// Constant crops only. All exports retain the £80 decline row and approved:false.
const gifFilter='crop=1080:1080:536:0,scale=1200:1200:flags=lanczos,fps=15';
ff(['-i',work+'/loop-master.mp4','-vf',gifFilter+',palettegen=max_colors=192:stats_mode=diff:reserve_transparent=0','-frames:v','1',work+'/palette.png']);
ff(['-i',work+'/loop-master.mp4','-i',work+'/palette.png','-filter_complex',`[0:v]${gifFilter}[v];[v][1:v]paletteuse=dither=sierra2_4a:diff_mode=rectangle`,'-an','-loop','0',out+'/agent9.gif']);
for(const [name,filter]of[
 ['agent9-x.mp4','crop=1440:810:356:0,scale=1280:720:flags=lanczos'],
 ['agent9-square.mp4','crop=1080:1080:536:0,scale=1080:1080:flags=lanczos'],
])ff(['-i',work+'/loop-master.mp4','-vf',filter,'-an','-r','30','-frames:v','240','-c:v','libx264','-crf','18','-preset','slow','-pix_fmt','yuv420p','-movflags','+faststart',out+'/'+name]);
const info=[];
for(const [name,w,h,fps,limit]of[['agent9.gif',1200,1200,15,8000000],['agent9-x.mp4',1280,720,30,15000000],['agent9-square.mp4',1080,1080,30,15000000]]){
 const p=JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',out+'/'+name]));const v=p.streams.find(s=>s.codec_type==='video'),bytes=(await fs.stat(out+'/'+name)).size;
 if(v.width!==w||v.height!==h||Math.abs(Number(v.nb_frames)/Number(p.format.duration)-fps)>.01||p.streams.some(s=>s.codec_type==='audio')||bytes>=limit||Math.abs(Number(p.format.duration)-8)>.08)throw Error('Export requirements failed: '+name);
 if(name.endsWith('.mp4')&&v.codec_name!=='h264')throw Error('H.264 required');
 for(const [label,time]of[['first',0],['last',name.endsWith('.gif')?7.93:7.966667]])ff(['-ss',String(time),'-i',out+'/'+name,'-frames:v','1',out+'/gif-proof/'+name.replace('.','-')+'-'+label+'.png']);
 info.push({file:name,width:w,height:h,fps,seconds:Number(p.format.duration),bytes,audio:false,codec:v.codec_name});
}
await fs.writeFile(out+'/gif-proof/exports.json',JSON.stringify({source:'demo/out/agent9-demo.mp4',selectedSource:{start:beat.start,end:beat.end,proofVisibleAt:beat.proofVisibleAt},edit:'1s proof lead-in + full Issuing scene retimed to 7s; fixed crops, no overlays, no audio',exports:info},null,2));
console.log(info.map(i=>`${i.file}: ${i.seconds.toFixed(2)}s, ${i.width}×${i.height}, ${i.fps}fps, ${(i.bytes/1e6).toFixed(2)} MB, no audio`).join('\n'));
