import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {scenes} from './scenes.mjs';
const ff=args=>execFileSync('ffmpeg',['-y','-v','error',...args],{stdio:['ignore','pipe','pipe']});
const f=n=>Number(n).toFixed(6);
export async function edit(root,out){
 await fs.mkdir(out+'/proof',{recursive:true});await fs.mkdir(out+'/clips',{recursive:true});
 const beats=JSON.parse(await fs.readFile(root+'/beats.json','utf8'));
 const voices=JSON.parse(await fs.readFile(root+'/voice.json','utf8'));
 let timeline=0;const report=[];
 for(let i=0;i<11;i++){
  const b=beats[i],v=voices[i],name='scene-'+String(i).padStart(2,'0');let frames,voiceStart=0;
  if(i===0)frames=180;else if(i===10)frames=120;
  else{voiceStart=77/30;frames=77+Math.ceil((v.duration+.1)*30)}
  const length=frames/30;
  if(v.duration+voiceStart>length+.001)throw Error('Voice does not fit scene '+i);
  const base=b.captureOffset;
  for(const vertical of [false,true]){
   const crop=vertical?'crop=608:1080:772:0,scale=1080:1920':'crop=1920:1080:0:0';
   let filter;
   if(i===0||i===10)filter=`[0:v]trim=start=${f(base)}:duration=${length},setpts=PTS-STARTPTS,${crop},fps=30,setsar=1[v]`;
   else{
    const action=base+b.actionStart,proof=base+b.proofStart;
    if(proof<=action)throw Error('Missing action timestamps');
    filter=`[0:v]split=3[a][b][c];[a]trim=start=${f(base)}:end=${f(action)},setpts=(PTS-STARTPTS)*${f(1/b.actionStart)},fps=30,tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame=30,${crop},setsar=1[before];`+
      `[b]trim=start=${f(action)}:end=${f(proof)},setpts=(PTS-STARTPTS)*${f((47/30)/(b.proofStart-b.actionStart))},fps=30,tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame=47,${crop},setsar=1[action];`+
      `[c]trim=start=${f(proof)}:duration=${f(length-voiceStart+.1)},setpts=PTS-STARTPTS,fps=30,trim=end_frame=${frames-77},${crop},setsar=1[proof];[before][action][proof]concat=n=3:v=1:a=0[v]`;
   }
   filter+=`;[1:a]adelay=${Math.round(voiceStart*48000)}S:all=1,apad,atrim=duration=${f(length)},asetpts=PTS-STARTPTS[audio]`;
   const output=path.join(out,'clips',name+(vertical?'-vertical':'')+'.mp4');
   ff(['-i',path.resolve(b.source),'-i',path.resolve(v.file),'-filter_complex',filter,'-map','[v]','-map','[audio]','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-r','30','-frames:v',String(frames),'-video_track_timescale','90000','-movflags','+faststart',output]);
  }
  const namedAt=timeline+voiceStart+v.namedAt;
  report.push({scene:i,product:scenes[i].product,target:b.target,start:timeline,end:timeline+length,duration:length,voiceStart:timeline+voiceStart,productNamedAt:namedAt,proofVisibleAt:i>0&&i<10?timeline+voiceStart:null,stripePrefix:b.result?.proof?.id?(b.result.proof.id.startsWith('cs_test_')?'cs_test_':b.result.proof.id.split('_')[0]+'_'):null,status:b.result?.proof?.status??(b.result?.proof?.active===true?'active':null),line:v.line});
  timeline+=length;
 }
 if(timeline<50||timeline>60)throw Error('Duration outside 50–60 seconds: '+timeline);
 for(const vertical of [false,true]){
  const list=path.resolve(out,'clips',vertical?'vertical.txt':'landscape.txt');await fs.writeFile(list,beats.map((_,i)=>`file '${path.resolve(out,'clips','scene-'+String(i).padStart(2,'0')+(vertical?'-vertical':'')+'.mp4')}'`).join('\n'));
  ff(['-copyts','-f','concat','-safe','0','-i',list,'-c:v','copy','-c:a','aac','-b:a','192k','-af','aresample=async=1:first_pts=0','-avoid_negative_ts','disabled','-movflags','+faststart',path.join(out,vertical?'agent9-demo-vertical.mp4':'agent9-demo.mp4')]);
 }
 for(const row of report.slice(1,10)){
  const name=String(row.scene).padStart(2,'0')+'-'+row.product.toLowerCase().replaceAll(' ','-');
  // A frame at the provider-aligned first product phoneme, rounded to the next video frame.
  const t=Math.ceil(row.productNamedAt*30)/30;
  for(const vertical of [false,true])ff(['-ss',f(t),'-i',path.join(out,vertical?'agent9-demo-vertical.mp4':'agent9-demo.mp4'),'-frames:v','1',path.join(out,'proof',name+(vertical?'-vertical':'')+'.png')]);
 }
 const publicBeats=beats.map((b,i)=>({scene:i,product:b.product,target:b.target,capture:{source:b.source,markerEnd:b.captureOffset,beforeStart:b.beforeStart,actionStart:b.actionStart,proofStart:b.proofStart,end:b.end},edit:report[i],proof:b.result?{...b.result.proof,...(b.result.audit?{execution:b.result.audit}:{})}:null}));
 await fs.writeFile(out+'/beats.json',JSON.stringify(publicBeats,null,2));
 await fs.writeFile(out+'/timeline.json',JSON.stringify(report,null,2));
 const table='# Agent 9 proof table\n\nProduct names are aligned using ElevenLabs character timestamps. Frames come from the final exports at the first product phoneme (rounded up to the next frame). Full object IDs and statuses are readable in the frames; this table uses prefixes only. Payment Links has an `active` flag rather than a `status` field. All objects are test mode.\n\n| Product | Product named at | Stripe prefix | Status | Voiceover |\n| --- | ---: | --- | --- | --- |\n'+report.slice(1,10).map(r=>`| ${r.product} | ${r.productNamedAt.toFixed(3)}s | ${r.stripePrefix} | ${r.status}${r.scene===5?'; approved: false':''} | ${r.line} |`).join('\n')+`\n\nRuntime: ${timeline.toFixed(3)}s. Opening: 0–6s. Closing slate: ${(timeline-4).toFixed(3)}–${timeline.toFixed(3)}s. Natural Jessica Gallagher voice at speed 1. No captions, subtitles, music, zoom, pan or crossfades. Issuing is captured on the hosted test app by explicit user direction; all other financial scenes run locally against real Stripe test objects.\n`;
 await fs.writeFile(out+'/proof-table.md',table);
 console.log('Edited both formats: '+timeline.toFixed(2)+'s');return report;
}
