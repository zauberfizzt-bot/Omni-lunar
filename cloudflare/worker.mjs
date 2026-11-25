import {DurableObject} from 'cloudflare:workers';
import {buildPushPayload} from '@block65/webcrypto-web-push';
import data from './ephemerides.mjs';
import fallback from '../fallback.json';
const origin='https://zauberfizzt-bot.github.io', root=origin+'/Omni-lunar/', DAY=86400000;
const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const b64=a=>btoa(String.fromCharCode(...a)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hash=async s=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))));
function validate(x){const s=x?.subscription;let u=new URL(s.endpoint);const h=u.hostname;
if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||s.endpoint.length>2048||!(h==='fcm.googleapis.com'||h==='android.googleapis.com'||h==='updates.push.services.mozilla.com'||h==='push.services.mozilla.com'||h==='web.push.apple.com'||h.endsWith('.push.apple.com'))||!/^[-_A-Za-z0-9]{87}$/.test(s.keys?.p256dh||'')||!/^[-_A-Za-z0-9]{22}$/.test(s.keys?.auth||''))throw Error('Invalid subscription');
const timezone=String(x.timezone||'UTC');new Intl.DateTimeFormat('en',{timeZone:timezone});
return {subscription:{endpoint:s.endpoint,expirationTime:null,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}},language:['es','en','pt'].includes(x.language)?x.language:'es',timezone}}
function registry(env){return env.REGISTRY.get(env.REGISTRY.idFromName('omni-registry-v1'))}
function same(a,b){return a?.subscription.keys.auth===b?.subscription.keys.auth&&a?.subscription.keys.p256dh===b?.subscription.keys.p256dh}
function cors(r){const h=new Headers(r.headers);h.set('Access-Control-Allow-Origin',origin);h.set('Vary','Origin');h.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');h.set('Access-Control-Allow-Headers','Content-Type');return new Response(r.body,{status:r.status,headers:h})}
export default {async fetch(req,env){const p=new URL(req.url).pathname;
if(req.method==='GET'&&p==='/health')return cors(reply({ok:true,backend:'cloudflare'}));
if(req.method==='GET'&&p==='/config'){const key=await registry(env).publicKey();return cors(reply({publicKey:key}))}
if(req.headers.get('Origin')!==origin)return reply({error:'Forbidden'},403);
if(req.method==='OPTIONS')return cors(new Response(null,{status:204}));
if(req.method!=='POST'||!['/register','/status','/test','/unregister'].includes(p))return cors(reply({error:'Not found'},404));
try{const raw=await req.text();if(raw.length>8192)return cors(reply({error:'Too large'},413));const d=validate(JSON.parse(raw));const id=await hash(d.subscription.endpoint);const stub=env.DEVICES.get(env.DEVICES.idFromName(id));return cors(await stub.action(p.slice(1),id,d))}catch(e){return cors(reply({error:'Request or push service unavailable'},400))}
}};
export class Registry extends DurableObject {
constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;this.ready=ctx.blockConcurrencyWhile(async()=>{let k=await ctx.storage.get('keys');if(!k){const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const pub=await crypto.subtle.exportKey('raw',pair.publicKey),jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);k={subject:root,publicKey:b64(new Uint8Array(pub)),privateKey:jwk.d};await ctx.storage.put('keys',k)}this.keys=k})}
async publicKey(){await this.ready;return this.keys.publicKey}
async vapid(){await this.ready;return this.keys}
async claim(id){return this.ctx.storage.transaction(async t=>{const ids=await t.get('ids')||[];if(ids.includes(id))return true;if(ids.length>=150)return false;ids.push(id);await t.put('ids',ids);return true})}
async release(id){await this.ctx.storage.transaction(async t=>{const ids=await t.get('ids')||[];await t.put('ids',ids.filter(x=>x!==id))})}
}
const P=['','Caos','Nacimiento','Forma','Pregunta','Aprendizaje','Justicia','Aceptación','Olvido','Mentira','Dolor','Vacío','Existencia','Amor','Reflexión','Madurez','Recuerdo','Dualidad','Verdad','Reconocimiento','Equilibrio','Calma','Decisión','Orden','Despertar','Responsabilidad','Propósito','Espíritu','Gracia','Nada','Todo','Infinito','Omni'];
const langs={es:'español rioplatense',en:'English',pt:'português brasileiro'}, stages=['inicio de expansión','aceleración expansiva','expansión intensificada','desaceleración expansiva','inicio de integración','aceleración integrativa','integración intensificada','desaceleración integrativa'];
const phases={es:['Luna nueva','Cuarto creciente','Luna llena','Cuarto menguante','Luna creciente','Gibosa creciente','Gibosa menguante','Luna menguante'],en:['New moon','First quarter','Full moon','Last quarter','Waxing crescent','Waxing gibbous','Waning gibbous','Waning crescent'],pt:['Lua nova','Quarto crescente','Lua cheia','Quarto minguante','Lua crescente','Gibosa crescente','Gibosa minguante','Lua minguante']};
function parts(t,z){let a=new Intl.DateTimeFormat('en-GB',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(t);let p=Object.fromEntries(a.map(x=>[x.type,x.value]));return {date:p.year+'-'+p.month+'-'+p.day,h:+p.hour,m:+p.minute}}
function localTime(date,minute,z){let [y,m,d]=date.split('-').map(Number),target=Date.UTC(y,m-1,d,0,minute),guess=target;for(let i=0;i<4;i++){let p=parts(guess,z),[a,b,c]=p.date.split('-').map(Number),delta=target-Date.UTC(a,b-1,c,p.h,p.m);if(!delta)break;guess+=delta}let p=parts(guess,z);return p.date===date&&p.h*60+p.m===minute?guess:null}
function context(t){let q=data.phases,i=q.findIndex(x=>x[0]>t);if(i<1)i=1;let j=i-1;while(j>0&&q[j][1]!==0)j--;let p=q.slice(j,j+5);if(p.length<5)return {g:0,phase:0};let up=q[i-1][1]<2,k=up?0:2,u=t<p[k+1][0]?.5*(t-p[k][0])/(p[k+1][0]-p[k][0]):.5+.5*(t-p[k+1][0])/(p[k+2][0]-p[k+1][0]);return {g:(up?0:4)+Math.max(0,Math.min(3,Math.floor(u*4))),phase:[4,5,6,7][q[i-1][1]]}}
function code(n){return n>=1&&n<=32?String(n).padStart(2,'0')+'. '+P[n]:null}
function valid(s){return typeof s==='string'&&s.length>5&&s.length<=350}
function local(g,l,i){let a=fallback[l][g];return a[i%a.length]}

function milestones(now){let a=data.samples,out=data.phases.map(q=>({t:q[0],phase:q[1]})),map={2:4,92:5,182:6,272:7};for(let i=1;i<a.length;i++){let p=a[i-1][0],q=a[i][0];if(q<p)q+=360;for(let ang of [2,92,182,272]){let k=ang;if(k<p)k+=360;if(k>p&&k<=q&&q>p)out.push({t:data.start+(i-1+(k-p)/(q-p))*21600000,phase:map[ang]})}}return out.filter(x=>Math.abs(x.t-now)<3*DAY)}

function slots(){const a=Array.from({length:992},(_,i)=>i),r=new Uint32Array(a.length);crypto.getRandomValues(r);for(let i=a.length-1;i>0;i--){const x=r[i]%(i+1);[a[i],a[x]]=[a[x],a[i]]}return a.slice(0,32).sort((a,b)=>a-b).map((x,i)=>x+14*i)}
function tomorrow(date){const [y,m,d]=date.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+1)).toISOString().slice(0,10)}
async function bank(){try{const r=await fetch('https://raw.githubusercontent.com/zauberfizzt-bot/Omni-lunar/main/resonances.json',{signal:AbortSignal.timeout(5000)});if(r.ok){const j=await r.json();if(Date.now()-Date.parse(j.generatedAt)<48*3600000)return j.messages}}catch{}return null}
function status(d){return {registered:!!d?.verified,lastDelivery:d?.lastDelivery||null,automaticLastDelivery:d?.automaticLastDelivery||null,nextDelivery:d?.queue?.[0]?new Date(d.queue[0].t).toISOString():null}}
async function send(env,d,payload){const vapid=await registry(env).vapid();const req=await buildPushPayload({data:JSON.stringify(payload),options:{ttl:900}},d.subscription,vapid);const r=await fetch(d.subscription.endpoint,{...req,redirect:'error',signal:AbortSignal.timeout(15000)});await r.body?.cancel();return r.status}
export class Device extends DurableObject {
constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;this.tail=Promise.resolve()}
serial(fn){const p=this.tail.then(fn,fn);this.tail=p.catch(()=>{});return p}
async store(d){await this.ctx.storage.put('device',d)}
async remove(d){await this.ctx.storage.deleteAlarm();await this.ctx.storage.delete('device');if(d?.id)await registry(this.env).release(d.id)}
async plan(d,now){const date=parts(now,d.timezone).date;d.queue=d.queue||[];d.days=d.days||[];d.sent=d.sent||[];const day2=tomorrow(date);d.days=d.days.filter(x=>x>=date);d.sent=d.sent.filter(x=>x.t>now-3*DAY);
const missing=[date,day2].filter(x=>!d.days.includes(x));if(missing.length){const messages=await bank();for(const dt of missing){for(const [i,m] of slots().entries()){const t=localTime(dt,m,d.timezone);if(t===null||t<now)continue;const c=context(t),l=d.language,b=messages?.[l]?.[c.g],text=Array.isArray(b)&&b.length&&valid(b[i%b.length])?b[i%b.length]:local(c.g,l,i);d.queue.push({t,id:'omni-'+dt+'-'+i,kind:'resonance',text})}d.days.push(dt)}}
for(const e of milestones(now))for(const h of [24,1,0]){const t=e.t-h*3600000,id='phase-'+e.t+'-'+h;if(t>=now&&t<now+2*DAY&&!d.queue.some(q=>q.id===id)&&!d.sent.some(q=>q.id===id)){d.queue.push({t,id,kind:'phase',phase:e.phase,h})}}
d.queue=d.queue.filter(x=>x.t>now-15*60000).sort((a,b)=>a.t-b.t);return d}
async schedule(d){const n=Date.now();await this.ctx.storage.setAlarm(Math.max(n+1000,Math.min(d.queue?.[0]?.retryAt||d.queue?.[0]?.t||n+3600000,n+3600000)))}
async test(d){if(Date.now()-(d.lastTest||0)<60000)return 429;d.lastTest=Date.now();await this.store(d);const msg={es:'OMNI Lunar · conexión remota verificada.',en:'OMNI Lunar · remote connection verified.',pt:'OMNI Lunar · conexão remota verificada.'}[d.language];let s;try{s=await send(this.env,d,{title:'OMNI Lunar',body:msg,tag:'omni-remote-test-'+Date.now()})}catch{return 502}if(s>=200&&s<300){d.lastDelivery=new Date().toISOString();d.verified=true;await this.store(d);return 200}if(s===404||s===410)await this.remove(d);return 502}
async action(action,id,x){return this.serial(async()=>{let d=await this.ctx.storage.get('device');if(d&&!same(d,x))return reply({error:'Invalid device credentials'},403);
if(action==='status')return reply(status(d));
if(action==='unregister'){if(d)await this.remove(d);return reply({registered:false})}
if(action==='test'&&!d?.verified)return reply({error:'Not registered'},404);
if(action==='register'){if(!d){if(!await registry(this.env).claim(id))return reply({error:'Free registry capacity reached'},503);d={...x,id,verified:false,queue:[],days:[],sent:[]};await this.store(d)}else if(d.timezone!==x.timezone||d.language!==x.language){d={...d,...x,queue:[],days:[]};await this.store(d)}
if(!d.verified){const code=await this.test(d);if(code!==200){if(code!==429)await this.remove(d);return reply({error:'Remote test failed'},code)}}
await this.plan(d,Date.now());await this.store(d);await this.schedule(d);return reply(status(d))}
if(action==='test'){const code=await this.test(d);return code===200?reply(status(d)):reply({error:'Remote test failed or rate limited'},code)}
return reply({error:'Not found'},404)})}
async alarm(){return this.serial(async()=>{let d=await this.ctx.storage.get('device');if(!d?.verified)return;const now=Date.now();d=await this.plan(d,now);const e=d.queue[0];
if(e&&Math.max(e.t,e.retryAt||0)<=now){let payload;if(e.kind==='resonance'){const t=parts(now,d.timezone),head=[code(t.h),code(t.m)].filter(Boolean).join('\n');payload={title:String(t.h).padStart(2,'0')+':'+String(t.m).padStart(2,'0')+' · OMNI',body:(head?head+'\n\n':'')+e.text,tag:e.id}}else{const l=d.language,name=phases[l][e.phase],h=e.h,prefix=l==='es'?(h?'En '+h+' h · ':'Comienza · '):l==='pt'?(h?'Em '+h+' h · ':'Começa · '):(h?'In '+h+' h · ':'Begins · ');payload={title:'OMNI · '+name,body:prefix+name,tag:e.id}}
let s;try{s=await send(this.env,d,payload)}catch{s=503}if(s===404||s===410){await this.remove(d);return}
if(s>=200&&s<300){d.lastDelivery=d.automaticLastDelivery=new Date(now).toISOString();d.sent.push({id:e.id,t:now});d.queue.shift()}else if((s===429||s>=500)&&(e.tries||0)<3&&e.t>now-12*60000){e.tries=(e.tries||0)+1;e.retryAt=now+60000*e.tries}else d.queue.shift()}
await this.store(d);await this.schedule(d)})}
}
