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
dotenv.config({path:'demo/.env',quiet:true});
const root=path.resolve('demo/work/agent9'),out=path.resolve('demo/out');let server;
try{
 await fs.mkdir(root,{recursive:true});
 if(!process.argv.includes('--edit-only')&&!process.argv.includes('--verify-only')){
  if(!process.env.APP_URL||!process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_'))throw Error('APP_URL and a Stripe test key are required');
  await voices(root);
  const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const localURL='http://127.0.0.1:'+port;
  // No messaging/Cognee/Issuing credentials are passed to the local app.
  server=spawn(process.execPath,['--import','tsx','src/server.ts'],{env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,STRIPE_SECRET_KEY:process.env.STRIPE_SECRET_KEY,PORT:String(port),PUBLIC_URL:localURL},stdio:'ignore'});
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(localURL+'/agent9')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}if(!ready)throw Error('Local test app did not start');
  await prepareVenue(localURL);
  await record(root,localURL,process.argv.includes('--resume'));
 }
 if(!process.argv.includes('--verify-only'))await edit(root,out);
 await verify(out);
}catch(e){
 let message=String(e.message).replace(/https?:\S+/g,'[private URL]');for(const[k,v]of Object.entries(process.env))if(v&&(k.includes('KEY')||k==='APP_URL'))message=message.replaceAll(v,'[redacted]');console.error(message);process.exitCode=1;
}finally{server?.kill('SIGTERM')}
