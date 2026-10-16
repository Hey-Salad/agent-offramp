import crypto from 'node:crypto';
import {memory} from './memory.js';
import {stripeI, extraState, testAuthorization, decideAuthorization} from './stripe-extra.js';
import {POLICY} from './policy.js';

// Fixed, documented test scenarios. Unrecognised spending requests never go to AI.
export function cardCommand(text: string) {
 if (!/\b(card|ocado|off[- ]licence|off[- ]license)\b/i.test(text)||!/\b(spend|pay|try|purchase|test)\b/i.test(text))return null;
 if (!/£|\b(?:gbp|pounds)\b/i.test(text)||/[€$¥]|\b(?:usd|eur|cad|aud|jpy|chf|zar|dollars|euros|yen)\b/i.test(text))return {unsupported:true} as const;
 const n=text.match(/(?:£\s*)?(\d+(?:\.\d{1,2})?)(?![\d.])\s*(?:pounds|gbp)?/i);const amount=n?Number(n[1]):NaN;
 const off=/off[- ]licen[cs]e/i.test(text);
 if(!off&&!/\bocado\b/i.test(text))return {unsupported:true} as const;
 if((!off&&[12,80].includes(amount))||(off&&amount===10))return {amount,merchant:off?'Off-licence':'Ocado',category:off?'package_stores_beer_wine_and_liquor':'grocery_stores_supermarkets'};
 return {unsupported:true} as const;
}
export async function stripeCardAttempt(command: {amount:number;merchant:string;category:string}) {
 const state=extraState();if(!stripeI||!state.card?.card)throw Error('Test card unavailable');
 const opts=state.card.account?{stripeAccount:state.card.account}:undefined;
 const card=await stripeI.issuing.cards.retrieve(state.card.card,{},opts);
 const cap=card.spending_controls?.spending_limits?.find(l=>l.interval==='per_authorization'&&(!l.categories||l.categories.length===0));
 if(card.livemode!==false||card.status!=='active'||card.currency!=='gbp'||!cap||cap.amount!==POLICY.maxCapGBP*100)throw Error('Test card controls not verified');
 const result=await testAuthorization(command.amount,command.category,command.merchant);
 if(!result.ok||'simulated' in result||!('authorization' in result)||!result.authorization)throw Error('No real Stripe authorization');
 const auth=await stripeI.issuing.authorizations.retrieve(result.authorization,{},opts);
 if(auth.livemode!==false||auth.amount!==command.amount*100||auth.currency!=='gbp'||typeof auth.approved!=='boolean'||(typeof auth.card==='string'?auth.card:auth.card.id)!==card.id)throw Error('Authorization readback mismatch');
 return {proof:{id:auth.id,object:auth.object,status:auth.status,approved:auth.approved,amount:auth.amount,currency:auth.currency,livemode:false,last4:card.last4},limitGBP:cap.amount/100};
}
export async function runCardChat(command: {amount:number;merchant:string;category:string},text:string,channel:string,execute=stripeCardAttempt) {
 const now=()=>new Date().toISOString();const decision=decideAuthorization({amount:command.amount*100,currency:'gbp',merchant_data:{category:command.category}});
 const record:any={id:'card_'+crypto.randomUUID().slice(0,8),demo:'card',createdAt:now(),request:text,agent:'Sally',channel,status:'checking',total:command.amount,cardAttempt:{...command,limitGBP:POLICY.maxCapGBP},decisions:[],stripe:{},audit:[{at:now(),event:'card_request',channel,amount:command.amount,clause:decision.clause,reason:decision.reason}]};memory.save(record);
 let reply:string;
 try{
  const result=await execute(command),p=result.proof;
  if(p.livemode!==false||!/^iauth_/.test(p.id)||typeof p.approved!=='boolean'||p.amount!==command.amount*100||p.currency!=='gbp'||p.object!=='issuing.authorization'||!/^\d{4}$/.test(p.last4)||result.limitGBP!==POLICY.maxCapGBP||(p.approved&&!decision.approved))throw Error('Unverified card result');
  record.status=p.approved?'authorized':'declined';record.cardAttempt.limitGBP=result.limitGBP;record.stripe.authorization={id:p.id,object:p.object,status:p.status,approved:p.approved,amount:p.amount,currency:p.currency,livemode:p.livemode,last4:p.last4};
  const reason=p.approved?`£${command.amount.toFixed(2)} is within your card rules.`:decision.clause==='P2'?`£${command.amount.toFixed(2)} is over your £${result.limitGBP} card limit.`:decision.clause==='P3'?"That shop category isn't allowed on your card.":'Stripe declined this card attempt.';
  record.decisions=[{name:command.merchant,price:command.amount,status:record.status,clause:decision.clause,reason}];
  record.audit.push({at:now(),event:'card_authorization',channel,amount:command.amount,clause:decision.clause,reason,authorization:p.id,approved:p.approved,via:'stripe-test-helper',tools:['testHelpers.issuing.authorizations.create','issuing.authorizations.retrieve']});
  reply=p.approved?`Approved. £${command.amount.toFixed(2)} at ${command.merchant} is authorised on the test card. This is an authorisation, not a completed payment.`:`Declined. ${reason} No money was taken.`;
 }catch{
  record.status='unavailable';record.decisions=[{name:command.merchant,price:command.amount,status:'unavailable',clause:decision.clause,reason:'No real card result was confirmed.'}];record.audit.push({at:now(),event:'card_unavailable',channel,clause:decision.clause,reason:'Test card or verified Stripe result unavailable'});
  reply="I can't check that card right now. No real card result was confirmed.";
 }
 memory.save(record);return {record,reply};
}
