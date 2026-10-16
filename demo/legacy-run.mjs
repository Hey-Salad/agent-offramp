import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import dotenv from 'dotenv';
import {voices} from './voice.mjs';
import {record} from './record.mjs';
import {edit} from './edit.mjs';
import {verify} from './verify.mjs';
import {prepareVenue} from './setup.mjs';
import {walkthroughScenes} from './walkthrough-scenes.mjs';
import {recordWalkthrough} from './walkthrough-record.mjs';
import {combine} from './combine.mjs';
import {verifyCombined} from './combined-verify.mjs';
dotenv.config({path:'demo/.env',quiet:true});
const root=path.resolve('demo/work/agent9'),out=path.resolve('demo/out'),overview=out+'/overview',walkRoot=path.resolve('demo/work/combined');
const combinedOnly=process.argv.includes('--combine-only')||process.argv.includes('--walkthrough-only');let server;
try{
 await fs.mkdir(root,{recursive:true});
 if(!combinedOnly&&!process.argv.includes('--edit-only')&&!process.argv.includes('--verify-only')){
  if(!process.env.APP_URL||!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))throw Error('APP_URL and a Stripe test key are required');
  await voices(root);
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const localURL='http://127.0.0.1:'+port;
  // No messaging/Cognee/Issuing credentials are passed to the local app.
  server=spawn(process.execPath,['--import','tsx','src/server.ts'],{env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,STRIPE_SECRET_KEY:process.env.STRIPE_SECRET_KEY,AGENT9_DEMO:'1',PORT:String(port),PUBLIC_URL:localURL},stdio:'ignore'});
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(localURL+'/agent9')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}if(!ready)throw Error('Local test app did not start');
  await prepareVenue(localURL);
  const selection=process.argv.find(a=>a.startsWith('--scene='));
  const onlyScene=selection?Number(selection.split('=')[1]):null;
  if(onlyScene!==null&&(!Number.isInteger(onlyScene)||onlyScene<0||onlyScene>10))throw Error('Scene must be 0–10');
  await record(root,localURL,process.argv.includes('--resume'),onlyScene);
 }
 if(!combinedOnly){
  if(!process.argv.includes('--verify-only'))await edit(root,overview);
  await verify(overview);
 }
 if(!process.argv.includes('--overview-only')){
  if(!process.argv.includes('--edit-only')&&!process.argv.includes('--verify-only')&&!process.argv.includes('--combine-only')){
   await voices(walkRoot,walkthroughScenes);await recordWalkthrough(walkRoot);
  }
  if(!process.argv.includes('--verify-only'))await combine(walkRoot,out);
  await verifyCombined(walkRoot,out);
 }
}catch(e){
 let message=String(e.message).replace(/https?:\S+/g,'[private URL]');for(const[k,v]of Object.entries(process.env))if(v&&(k.includes('KEY')||k==='APP_URL'))message=message.replaceAll(v,'[redacted]');console.error(message);process.exitCode=1;
}finally{server?.kill('SIGTERM')}
