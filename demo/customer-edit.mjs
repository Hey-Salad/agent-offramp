import fs from 'node:fs/promises';import path from 'node:path';import{execFileSync}from'node:child_process';
const ff=args=>execFileSync('ffmpeg',['-y','-v','error',...args],{stdio:['ignore','pipe','pipe']});
export async function editCustomers(root,out){
 const beats=JSON.parse(await fs.readFile(root+'/beats.json','utf8')),voices=JSON.parse(await fs.readFile(root+'/voice.json','utf8')),overview=JSON.parse(await fs.readFile(out+'/timeline.json','utf8'));
 if(beats.length!==5||beats.some(b=>!b))throw Error('Five complete customer stages required');await fs.mkdir(out+'/customer-proof',{recursive:true});await fs.mkdir(out+'/customer-clips',{recursive:true});
 let cursor=overview[10].start;const rows=[];
 for(let i=0;i<5;i++){
  const b=beats[i],v=voices[i],lead=2.8,frames=84+Math.ceil((v.duration+.25)*30),length=frames/30;
  for(const vertical of[false,true]){
   const source=i===4&&!vertical&&b.landscape?b.landscape:b;
   const start=source.captureOffset||0;
   const c=b.verticalCrop,proofCrop=vertical?`crop=${c.width}:${c.height}:${c.x}:${c.y},scale=1080:1920`:'crop=1920:1080:0:0',beforeCrop=vertical?'crop=608:1080:772:0,scale=1080:1920':proofCrop;
   const f=`[0:v]split=3[b][a][p];[b]trim=start=${start}:end=${source.actionStart},setpts=(PTS-STARTPTS)*${.8/(source.actionStart-start)},fps=30,tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame=24,${i===4?proofCrop:beforeCrop},setsar=1[before];`+
   `[a]trim=start=${source.actionStart}:end=${source.proofStart},setpts=(PTS-STARTPTS)*${2/(source.proofStart-source.actionStart)},fps=30,tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame=60,${beforeCrop},setsar=1[action];`+
   `[p]trim=start=${source.proofStart},setpts=PTS-STARTPTS,fps=30,trim=end_frame=${frames-84},${proofCrop},setsar=1[proof];[before][action][proof]concat=n=3:v=1:a=0[v];[1:a]adelay=134400S:all=1,apad,atrim=duration=${length},asetpts=PTS-STARTPTS[a]`;
   ff(['-i',path.resolve(source.source),'-i',v.file,'-filter_complex',f,'-map','[v]','-map','[a]','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-r','30','-frames:v',String(frames),'-video_track_timescale','90000','-movflags','+faststart',out+'/customer-clips/'+i+(vertical?'-vertical':'')+'.mp4']);
  }
  rows.push({...b,line:v.line,start:cursor,end:cursor+length,voiceStart:cursor+lead,proofVisibleAt:cursor+lead,voiceFile:v.file});cursor+=length;
 }
 for(const vertical of[false,true]){
  const suffix=vertical?'-vertical':'';const clips=[...Array.from({length:10},(_,i)=>out+'/clips/scene-'+String(i).padStart(2,'0')+suffix+'.mp4'),...beats.map((_,i)=>out+'/customer-clips/'+i+suffix+'.mp4'),out+'/clips/scene-10'+suffix+'.mp4'];
  const list=path.resolve(out+'/customer-clips/concat'+suffix+'.txt');await fs.writeFile(list,clips.map(f=>`file '${path.resolve(f)}'`).join('\n'));
  ff(['-copyts','-f','concat','-safe','0','-i',list,'-c:v','copy','-c:a','aac','-b:a','192k','-af','aresample=async=1:first_pts=0','-avoid_negative_ts','disabled','-movflags','+faststart',out+'/agent9-walkthrough'+suffix+'.mp4']);
  for(const r of rows)ff(['-ss',String(Math.ceil((r.proofVisibleAt+.2)*30)/30),'-i',out+'/agent9-walkthrough'+suffix+'.mp4','-frames:v','1',out+'/customer-proof/'+r.scene+suffix+'.png']);
 }
 const timeline=[...overview.slice(0,10).map(r=>({...r,voiceFile:path.resolve('demo/work/nine-chat/voice/'+String(r.scene).padStart(2,'0')+'.wav')})),...rows,{...overview[10],start:cursor,end:cursor+4,voiceStart:cursor,voiceFile:path.resolve('demo/work/nine-chat/voice/10.wav')}];
 await fs.writeFile(root+'/timeline-private.json',JSON.stringify(timeline,null,2),{mode:0o600});
 await fs.writeFile(out+'/customer-beats.json',JSON.stringify(rows.map(({voiceFile,...r})=>r),null,2));
 await fs.writeFile(out+'/customer-proof-table.md','# Customer-facing walkthrough\n\nThe 59.133s overview remains unchanged. The longer version keeps all nine original-chat scenes and adds these real customer pages before the final four-second slate. Stripe-hosted pages keep native branding. Empty card-number placeholders are never entered card details. The paid invoice and its original PDF share one invoice id/number; the PDF is the bill, not a receipt or a draft.\n\n| Page | Visible / voice starts | Object prefix | State | Voiceover |\n| --- | ---: | --- | --- | --- |\n'+rows.map(r=>`| ${r.product} | ${r.voiceStart.toFixed(3)}s | ${r.proof.id.split('_')[0]}_ | ${r.proof.status} | ${r.line} |`).join('\n')+`\n\nLonger runtime: ${(cursor+4).toFixed(3)}s. No captions, music, camera zoom or pan. The native PDF viewer opens at a fixed document scale so its full page fits the portrait crop.\n`);
 console.log('Edited customer walkthrough: '+(cursor+4).toFixed(3)+'s');return timeline;
}
