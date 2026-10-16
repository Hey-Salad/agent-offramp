import fs from 'node:fs/promises';
import {scenes} from './scenes.mjs';
const paths=[
 '<path d="M12 3v18M17 6H9a3 3 0 000 6h6a3 3 0 010 6H6"/>',
 '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 15h4"/>',
 '<path d="M10 14l4-4M8 16l-2 2a4 4 0 01-5-5l4-4a4 4 0 016 0M16 8l2-2a4 4 0 015 5l-4 4a4 4 0 01-6 0"/>',
 '<path d="M6 3h9l4 4v14H6zM15 3v5h4M9 12h7M9 16h7"/>',
 '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
 '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 8l8 8M18 8V4h-4M6 16v4h4"/>',
 '<path d="M21 10a9 9 0 10-2 8M21 3v7h-7M12 7v5l3 2"/>',
 '<path d="M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6zM8 12l3 3 5-6"/>',
 '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 13h18M9 13v4h6v-4"/>'
];
export async function cardHTML(closing=false){
 const logo=await fs.readFile('public/heysalad-logo-black.svg','utf8');
 const stripe=await fs.readFile('demo/assets/stripe-wordmark.svg','utf8');
 return `<!doctype html><html><head><style>@font-face{font-family:Figtree;src:url(data:font/ttf;base64,${(await fs.readFile('demo/assets/Figtree.ttf')).toString('base64')})}*{box-sizing:border-box}body{margin:0;background:white;color:#171717;font-family:Figtree,Arial}main{position:absolute;left:786px;top:60px;width:580px}.logo svg{width:160px;height:45px}.stripe svg{width:160px;height:72px}h1{font-size:64px;letter-spacing:-2px;margin:40px 0 12px}.tag{font-size:34px;line-height:1.23;margin:0 0 22px}.built{display:flex;gap:18px;align-items:center;font-size:20px;color:#444;margin:18px 0 35px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:34px 10px}.item{font-size:18px;line-height:1.25}.item svg{display:block;width:38px;height:38px;margin-bottom:13px;fill:none;stroke:#171717;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}main.end{top:190px}.end h1{margin-top:85px}.end .tag{font-size:43px;line-height:1.2}</style></head><body><main class="${closing?'end':''}"><div class="logo">${logo}</div><h1>Agent 9${closing?'.':''}</h1><p class="tag">${closing?'Give your agent a financial operating system.':'A financial operating system<br>for your agent.'}</p>${closing?'':`<div class="built">Built on <div class="stripe">${stripe}</div></div><div class="grid">${scenes.slice(1,10).map((s,i)=>`<div class="item"><svg viewBox="0 0 24 24">${paths[i]}</svg>${s.product}</div>`).join('')}</div>`}</main></body></html>`;
}
