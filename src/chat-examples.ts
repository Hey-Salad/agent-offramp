// Fixed, human-selected test examples. No model-generated money parameters.
import {runAgent9,AGENT9_PRODUCTS} from './agent9.js';
export const CHAT_EXAMPLES = [
  {text:'Pay my approved suppliers',title:'Pay suppliers'},
  {text:'Create a £32.50 checkout',title:'Collect a payment'},
  {text:'Create a deposit link for six guests',title:'Take a deposit'},
  {text:'Draft a £120 invoice for completed work',title:'Invoice a customer'},
  {text:'Spend £80 at Ocado',title:'Control card spending'},
  {text:'Pay my partner £60',title:'Pay a partner'},
  {text:'Start a £9 monthly subscription',title:'Start a subscription'},
  {text:'Pay £9.60 without sharing card details',title:'Pay with a safe token'},
  {text:'Use Stripe tools to draft a £75 services invoice',title:'Use agent tools'},
].map((e,index)=>({...e,index,product:AGENT9_PRODUCTS[index]}));
export function chatExampleIndex(text:unknown){
  return typeof text==='string'?CHAT_EXAMPLES.findIndex(e=>e.text.toLowerCase()===text.trim().toLowerCase()):-1;
}
export async function runChatExample(index:number,port:number,origin:string,channel:string){
  if(index===4||!CHAT_EXAMPLES[index])throw new Error('Use the verified original-chat card flow');
  return runAgent9(index,port,{request:CHAT_EXAMPLES[index].text,clause:'C9',channel,origin});
}
