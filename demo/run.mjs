import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import {voices} from './voice.mjs';
import {recordNineChat} from './nine-chat-record.mjs';
import {prepareVenue} from './setup.mjs';
import {edit} from './edit.mjs';
import {verify} from './verify.mjs';
import {verifyNineChat} from './nine-chat-check.mjs';
import {customers} from './customer-run.mjs';
dotenv.config({path:'demo/.env',quiet:true});
const root=path.resolve('demo/work/nine-chat'),out=path.resolve('demo/out');
try{
 const walkthroughOnly=process.argv.includes('--walkthrough-only');
 if(!walkthroughOnly){
 await fs.mkdir(root,{recursive:true});
 const editOnly=process.argv.includes('--edit-only'),verifyOnly=process.argv.includes('--verify-only');
 if(!editOnly&&!verifyOnly){
  if(!process.env.APP_URL?.startsWith('https://'))throw Error('APP_URL must identify the hosted test app');
  const build=await(await fetch(new URL('/api/build',process.env.APP_URL))).json();if(build.testMode!==true)throw Error('Test app required');
  // Reuse the provider cache for unchanged narration; no duplicate TTS spend.
  await fs.mkdir(root+'/voice',{recursive:true});
  try{for(const n of await fs.readdir('demo/work/agent9/voice'))if(n.endsWith('.json'))await fs.copyFile('demo/work/agent9/voice/'+n,root+'/voice/'+n)}catch{}
  await voices(root);await prepareVenue(process.env.APP_URL);
  const selected=process.argv.find(a=>a.startsWith('--scene='));const onlyScene=selected?Number(selected.split('=')[1]):null;
  if(onlyScene!==null&&(!Number.isInteger(onlyScene)||onlyScene<0||onlyScene>10))throw Error('Scene must be 0–10');
  await recordNineChat(root,{resume:process.argv.includes('--resume'),onlyScene});
 }
 if(!verifyOnly){
  // Keep former combined edit locally; new primary export is nine examples in one chat.
  if(!await fs.stat(out+'/previous-combined').catch(()=>null)){
   await fs.mkdir(out+'/previous-combined',{recursive:true});
   for(const n of ['agent9-demo.mp4','agent9-demo-vertical.mp4'])try{await fs.copyFile(out+'/'+n,out+'/previous-combined/'+n)}catch{}
  }
  await fs.rm(out+'/proof',{recursive:true,force:true});await edit(root,out);
 }
 await verify(out,root);await verifyNineChat();
 }
 if(!process.argv.includes('--overview-only'))await customers({editOnly:process.argv.includes('--edit-only'),verifyOnly:process.argv.includes('--verify-only')});
}catch(e){let message=String(e.message).replace(/https?:\S+/g,'[private URL]');for(const[k,v]of Object.entries(process.env))if(v&&(k.includes('KEY')||k==='APP_URL'))message=message.replaceAll(v,'[redacted]');console.error(message);process.exitCode=1}
