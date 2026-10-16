import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import dotenv from 'dotenv';
dotenv.config({path:'demo/.env',quiet:true});
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const python=path.resolve('demo/work/modal-venv/bin/python');
const work=path.resolve('demo/work/chat-card');await fs.mkdir(work,{recursive:true});
if(!process.env.APP_URL?.startsWith('https://'))throw Error('APP_URL must identify the existing hosted test app');
if(git(['status','--porcelain']))throw Error('Commit and push the reviewable changes before deployment');
const sha=git(['rev-parse','HEAD']);const branch=git(['branch','--show-current']);if(branch!=='codex/agent9-demo')throw Error('Expected PR #10 branch');
if(git(['ls-remote','origin','refs/heads/'+branch]).split(/\s+/)[0]!==sha)throw Error('Push the exact commit before deploying');
try{
 execFileSync(python,['-c',`import modal,os,urllib.parse
f=modal.Function.from_name("agent-offramp","web")
u=f.get_web_url()
a=urllib.parse.urlparse(u or "")
b=urllib.parse.urlparse(os.environ["APP_URL"])
if a.scheme!="https" or a.hostname.split(".")[0]!=b.hostname.split(".")[0]:
 raise RuntimeError("Authenticated Modal workspace does not match the configured test app")
`],{env:process.env,stdio:['ignore','pipe','pipe'],timeout:30000});
}catch{throw Error('Modal authentication or existing test-app workspace verification failed; no deployment started')}
console.log('Confirmed existing hosted test app; deploying pinned commit '+sha.slice(0,8));
const logFile=work+'/modal-deploy-private.log';const log=await fs.open(logFile,'w',0o600);
const child=spawn(python,['-m','modal','deploy','modal_app.py'],{env:{...process.env,REF:sha},stdio:['ignore','pipe','pipe']});
child.stdout.on('data',b=>log.write(b));child.stderr.on('data',b=>log.write(b));
const timer=setInterval(()=>console.log('Modal deployment is still running; build logs are saved privately.'),45000);
const code=await new Promise(r=>{child.on('exit',r);child.on('error',()=>r(-1))});clearInterval(timer);await log.close();
if(code!==0)throw Error('Modal deployment failed; inspect the ignored private deployment log');
let verified=false;
for(let i=0;i<60;i++){
 try{const r=await fetch(new URL('/api/build',process.env.APP_URL),{signal:AbortSignal.timeout(10000)});if(r.ok){const b=await r.json();if(b.commit===sha&&b.testMode===true){verified=true;break}}}catch{}
 await new Promise(r=>setTimeout(r,1000));
}
if(!verified)throw Error('Deployment completed but the hosted commit was not verified');
await fs.writeFile(work+'/deployment.json',JSON.stringify({commit:sha,target:'existing-hosted-test-app',verifiedAt:new Date().toISOString()},null,2));
console.log('Hosted test app verified at commit '+sha.slice(0,8)+'. No merge performed.');
