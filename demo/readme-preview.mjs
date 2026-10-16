import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const work=path.resolve('demo/work/gif'),out=path.resolve('demo/out/gif-proof');await fs.mkdir(work,{recursive:true});await fs.mkdir(out,{recursive:true});
const beforeRef=process.argv.find(a=>a.startsWith('--before='))?.slice(9)||'HEAD';
const before=execFileSync('git',['show',beforeRef+':README.md'],{encoding:'utf8'}),after=await fs.readFile('README.md','utf8');
const browser=await chromium.launch({headless:true});const evidence=[];
try{for(const theme of ['light','dark'])for(const [version,markdown]of[['before',before],['after',after]]){
 const renderedMarkdown=version==='before'&&markdown.includes('alt="Agent 9 demo: card declines an overspend"')?markdown.replace('src="demo/out/agent9.gif"','src="demo/out/agent9-decline.gif"'):markdown;
 const body=execFileSync('gh',['api','markdown','--input','-'],{input:JSON.stringify({text:renderedMarkdown,mode:'gfm',context:'Hey-Salad/agent-offramp'}),encoding:'utf8'});
 const dark=theme==='dark',bg=dark?'#0d1117':'#ffffff',fg=dark?'#f0f6fc':'#1f2328',border=dark?'#3d444d':'#d1d9e0';
 const html=`<!doctype html><html><head><meta charset="utf-8"><base href="${pathToFileURL(process.cwd()+'/').href}"><style>html{color-scheme:${theme}}*{box-sizing:border-box}body{margin:0;padding:24px;background:${bg};color:${fg};font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.file{max-width:1012px;margin:auto;border:1px solid ${border};border-radius:6px}.bar{padding:12px 20px;border-bottom:1px solid ${border};font-size:14px;font-weight:600}.markdown-body{padding:32px 40px;overflow:hidden}img{max-width:100%;height:auto}picture img{height:48px}p{margin:0 0 16px}h1{font-size:32px;line-height:1.25;margin:24px 0 16px;padding-bottom:10px;border-bottom:1px solid ${border}}h2{font-size:24px;padding-bottom:8px;border-bottom:1px solid ${border}}a{color:${dark?'#4493f8':'#0969da'}}pre{padding:16px;background:${dark?'#151b23':'#f6f8fa'};overflow:auto;font-size:13px;border-radius:6px}code{font-family:ui-monospace,SFMono-Regular,monospace}table{border-collapse:collapse}td,th{padding:6px 13px;border:1px solid ${border}}</style></head><body><div class="file"><div class="bar">README.md</div><article class="markdown-body">${body}</article></div></body></html>`;
 const file=work+'/readme-'+version+'-'+theme+'.html';await fs.writeFile(file,html);
 const context=await browser.newContext({viewport:{width:1280,height:1400},deviceScaleFactor:1,colorScheme:theme});const page=await context.newPage();await page.goto(pathToFileURL(file).href,{waitUntil:'load'});
 const images=await page.locator('img').evaluateAll(imgs=>imgs.map(i=>({alt:i.alt,loaded:i.complete&&i.naturalWidth>0,current:i.currentSrc.split('/').at(-1),width:i.width})));
 if(images.some(i=>!i.loaded))throw Error('README image failed to load '+version+' '+theme);
 if(version==='after'&&!images.some(i=>i.alt==='Agent 9 demo: nine Stripe workflows, checkout, receipts and invoice PDF'&&i.width===720))throw Error('README GIF missing or clipped');
 if(!images.some(i=>i.alt==='HeySalad'&&i.current===('logo-'+theme+'.svg')))throw Error('Incorrect theme logo');
 await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.screenshot({path:out+'/readme-'+version+'-'+theme+'.png'});evidence.push({version,theme,allImagesLoaded:true,gifWidth:version==='after'?720:null});await context.close();
}}finally{await browser.close()}
await fs.writeFile(out+'/readme-previews.json',JSON.stringify({beforeRef,renderer:'GitHub Markdown API, local GitHub-style light/dark framing; not a deployed README screenshot',evidence},null,2));console.log('README before/after screenshots verified in light and dark themes');
