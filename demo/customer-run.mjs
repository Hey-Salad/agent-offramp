import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import dotenv from 'dotenv';
import {exportDocuments}from'./export-documents.mjs';
import {recordWidePDF}from'./customer-pdf-landscape.mjs';
import {voices}from'./voice.mjs';import {customerScenes}from'./customer-scenes.mjs';import {recordCustomers}from'./customer-record.mjs';import {editCustomers}from'./customer-edit.mjs';import{verifyCustomers}from'./customer-verify.mjs';
dotenv.config({path:'demo/.env',quiet:true});
export async function customers({editOnly=false,verifyOnly=false,onlyJourney=null}={}){
 const root=path.resolve('demo/work/customers'),out=path.resolve('demo/out');await fs.mkdir(root,{recursive:true});
 const unchanged=async()=>Promise.all(['','-vertical'].map(async s=>crypto.createHash('sha256').update(await fs.readFile(out+'/agent9-demo'+s+'.mp4')).digest('hex')));const before=await unchanged();
 if(!editOnly&&!verifyOnly){await voices(root,customerScenes);await recordCustomers(root,onlyJourney);await recordWidePDF(root)}
 if(!verifyOnly)await editCustomers(root,out);await verifyCustomers(root,out);await exportDocuments(root,out,{verifyOnly});
 if(JSON.stringify(before)!==JSON.stringify(await unchanged()))throw Error('Short overview changed during customer edit');
}
if(process.argv[1]?.endsWith('/customer-run.mjs'))customers({editOnly:process.argv.includes('--edit-only'),verifyOnly:process.argv.includes('--verify-only'),onlyJourney:process.argv.some(a=>a.startsWith('--journey='))?Number(process.argv.find(a=>a.startsWith('--journey=')).split('=')[1]):null}).catch(e=>{let m=String(e.message).replace(/https?:\S+/g,'[private URL]');for(const[k,v]of Object.entries(process.env))if(v&&(k.includes('KEY')||k==='APP_URL'))m=m.replaceAll(v,'[redacted]');console.error(m);process.exitCode=1});
