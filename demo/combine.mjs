import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ff=args=>execFileSync('ffmpeg',['-y','-v','error',...args],{stdio:['ignore','pipe','pipe']});
export async function combine(root,out){
 const overview=path.join(out,'overview');
 const original=JSON.parse(await fs.readFile(overview+'/timeline.json','utf8'));
 const beats=JSON.parse(await fs.readFile(root+'/beats.json','utf8'));
 const voices=JSON.parse(await fs.readFile(root+'/voice.json','utf8'));
 if(beats.length!==8||beats.some(b=>!b))throw Error('Eight complete walkthrough captures required');
 await fs.mkdir(out+'/clips',{recursive:true});await fs.mkdir(out+'/proof',{recursive:true});
 const rows=original.slice(0,10).map(r=>({...r,kind:'overview',voiceFile:path.resolve('demo/work/agent9/voice/'+String(r.scene).padStart(2,'0')+'.wav')}));
 let cursor=original[10].start;
 for(let i=0;i<8;i++){
  const b=beats[i],v=voices[i];const lead=2,frames=60+Math.ceil((v.duration+.2)*30),length=frames/30;
  if(b.proofStart<=b.actionStart||b.actionStart<=0)throw Error('Invalid walkthrough phase stamps '+i);
  for(const vertical of [false,true]){
   const c=b.verticalCrop;const crop=vertical?`crop=${c.width}:${c.height}:${c.x}:${c.y},scale=1080:1920`:'crop=1920:1080:0:0';
   const beforeCrop=vertical?'crop=608:1080:772:0,scale=1080:1920':crop;
   const proofFilter=vertical&&i===7?
    `[p]split=2[p1][p2];[p1]trim=start=${b.proofStart}:duration=2.8,setpts=PTS-STARTPTS,fps=30,trim=end_frame=84,${crop},setsar=1[details];[p2]trim=start=${b.proofStart+2.8},setpts=PTS-STARTPTS,fps=30,trim=end_frame=${frames-60-84},crop=608:1080:400:0,scale=1080:1920,setsar=1[downloads];[details][downloads]concat=n=2:v=1:a=0[proof];`:
    `[p]trim=start=${b.proofStart},setpts=PTS-STARTPTS,fps=30,trim=end_frame=${frames-60},${crop},setsar=1[proof];`;
   const filter=`[0:v]split=3[b][a][p];[b]trim=end=${b.actionStart},setpts=(PTS-STARTPTS)*${.7/b.actionStart},fps=30,tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame=21,${beforeCrop},setsar=1[before];`+
    `[a]trim=start=${b.actionStart}:end=${b.proofStart},setpts=(PTS-STARTPTS)*${1.3/(b.proofStart-b.actionStart)},fps=30,tpad=stop_mode=clone:stop_duration=0.1,trim=end_frame=39,${beforeCrop},setsar=1[action];`+
    proofFilter+
    `[before][action][proof]concat=n=3:v=1:a=0[video];[1:a]adelay=96000S:all=1,apad,atrim=duration=${length},asetpts=PTS-STARTPTS[audio]`;
   ff(['-i',path.resolve(b.source),'-i',v.file,'-filter_complex',filter,'-map','[video]','-map','[audio]','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-r','30','-frames:v',String(frames),'-video_track_timescale','90000','-movflags','+faststart',path.join(out,'clips','walkthrough-'+(i+1)+(vertical?'-vertical':'')+'.mp4')]);
  }
  rows.push({scene:11+i,walkthrough:i,kind:'walkthrough',product:b.product,start:cursor,end:cursor+length,duration:length,voiceStart:cursor+lead,productNamedAt:cursor+lead+v.namedAt,proofVisibleAt:cursor+lead,stripePrefix:b.objectPrefix,status:b.status,line:v.line,voiceFile:v.file,capture:b});cursor+=length;
 }
 const closing=original[10];rows.push({...closing,kind:'overview',start:cursor,end:cursor+4,voiceStart:cursor,productNamedAt:cursor,voiceFile:path.resolve('demo/work/agent9/voice/10.wav')});cursor+=4;
 if(cursor<95||cursor>120)throw Error('Combined cut must be 95–120 seconds, got '+cursor);
 for(const vertical of [false,true]){
  const suffix=vertical?'-vertical':'';
  const clips=[...Array.from({length:10},(_,i)=>path.join(overview,'clips','scene-'+String(i).padStart(2,'0')+suffix+'.mp4')),...beats.map((_,i)=>path.join(out,'clips','walkthrough-'+(i+1)+suffix+'.mp4')),path.join(overview,'clips','scene-10'+suffix+'.mp4')];
  const list=path.join(out,'clips','combined'+suffix+'.txt');await fs.writeFile(list,clips.map(f=>`file '${path.resolve(f)}'`).join('\n'));
  ff(['-copyts','-f','concat','-safe','0','-i',list,'-c:v','copy','-c:a','aac','-b:a','192k','-af','aresample=async=1:first_pts=0','-avoid_negative_ts','disabled','-movflags','+faststart',path.join(out,'agent9-demo'+suffix+'.mp4')]);
 }
 // Existing product names retain their original timestamps; extract all proof from the combined exports.
 for(const r of rows.filter(r=>r.proofVisibleAt!==null)){
  const name=r.kind==='walkthrough'?'walkthrough-'+String(r.walkthrough+1).padStart(2,'0'):String(r.scene).padStart(2,'0')+'-'+r.product.toLowerCase().replaceAll(' ','-');
  for(const vertical of [false,true])ff(['-ss',String(Math.ceil(r.productNamedAt*30)/30),'-i',out+'/agent9-demo'+(vertical?'-vertical':'')+'.mp4','-frames:v','1',out+'/proof/'+name+(vertical?'-vertical':'')+'.png']);
 }
 const originalBeats=JSON.parse(await fs.readFile(overview+'/beats.json','utf8'));
 await fs.writeFile(out+'/timeline.json',JSON.stringify(rows.map(({voiceFile,...r})=>r),null,2));
 await fs.writeFile(out+'/beats.json',JSON.stringify([...originalBeats.slice(0,10),...rows.filter(r=>r.kind==='walkthrough').map(r=>({scene:r.scene,product:r.product,target:'hosted-test-app-original-chat',capture:r.capture,edit:{start:r.start,end:r.end,voiceStart:r.voiceStart},status:r.status,objectPrefix:r.stripePrefix})),{...originalBeats[10],edit:rows.at(-1)}],null,2));
 await fs.writeFile(root+'/combined-timeline-private.json',JSON.stringify(rows,null,2),{mode:0o600});
 await fs.writeFile(out+'/proof-table.md','# Combined Agent 9 video proof\n\nThe first nine products preserve the original overview, followed by four real chat journeys. All financial actions are test mode. Draft invoices are unsent; deposit checkout is unpaid. Table identifiers use prefixes only.\n\n| Scene | Proof / voice starts | Object prefix | Status | Voiceover |\n| --- | ---: | --- | --- | --- |\n'+rows.filter(r=>r.proofVisibleAt!==null).map(r=>`| ${r.product} | ${r.productNamedAt.toFixed(3)}s | ${r.stripePrefix} | ${r.status} | ${r.line} |`).join('\n')+`\n\nCombined runtime: ${cursor.toFixed(3)}s. Original overview: ${original.at(-1).end.toFixed(3)}s, preserved under overview/. Final slate: ${(cursor-4).toFixed(3)}–${cursor.toFixed(3)}s. Hard cuts, fixed crops, no captions, subtitles, music, zoom or camera pans. Original app capture uses presentation-only white/ink CSS; Stripe-hosted pages keep native branding.\n`);
 console.log('Combined both formats: '+cursor.toFixed(2)+'s');return rows;
}
