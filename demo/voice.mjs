import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {scenes} from './scenes.mjs';
export const duration = file => Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8'}).trim());
export async function voices(root) {
 const dir=root+'/voice';await fs.mkdir(dir,{recursive:true});const manifest=[];
 if(!process.env.ELEVENLABS_API_KEY)throw Error('ELEVENLABS_API_KEY is required');
 for(let i=0;i<scenes.length;i++){
  const request={text:scenes[i].line,model_id:'eleven_multilingual_v2',seed:20261016+i,voice_settings:{stability:.5,similarity_boost:.75,style:.1,use_speaker_boost:true,speed:1}};
  const hash=crypto.createHash('sha256').update(JSON.stringify(request)+'DbwWo4rVEd5NrejHYUnm').digest('hex');
  const cache=dir+'/'+i+'-'+hash+'.json';let result;
  try{result=JSON.parse(await fs.readFile(cache,'utf8'));}catch{
   const response=await fetch('https://api.elevenlabs.io/v1/text-to-speech/DbwWo4rVEd5NrejHYUnm/with-timestamps?output_format=mp3_44100_128',{method:'POST',headers:{'xi-api-key':process.env.ELEVENLABS_API_KEY,'content-type':'application/json'},body:JSON.stringify(request)});
   if(!response.ok)throw Error('ElevenLabs request failed: '+response.status);
   result=await response.json();await fs.writeFile(cache,JSON.stringify(result),{mode:0o600});
  }
  const mp3=dir+'/'+String(i).padStart(2,'0')+'.mp3';await fs.writeFile(mp3,Buffer.from(result.audio_base64,'base64'));
  const wav=dir+'/'+String(i).padStart(2,'0')+'.wav';execFileSync('ffmpeg',['-y','-v','error','-i',mp3,'-ar','48000','-ac','1',wav]);
  const alignment=result.alignment; if(!alignment?.characters?.length)throw Error('Voice alignment missing');
  const namedAt=alignment.character_start_times_seconds[0];
  const item={...scenes[i],index:i,file:wav,duration:duration(wav),namedAt,alignment};manifest.push(item);
  console.log('Voice '+i+': '+item.duration.toFixed(2)+'s');
 }
 await fs.writeFile(root+'/voice.json',JSON.stringify(manifest,null,2));return manifest;
}
