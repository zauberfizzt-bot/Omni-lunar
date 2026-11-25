import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import push from 'web-push';
import {spawn} from 'node:child_process';
const cfg=JSON.parse(process.env.OMNI_CONFIG||'{}');
const origin='https://zauberfizzt-bot.github.io';
const file=process.env.OMNI_REGISTRY_FILE||'./data/devices.json';
const dir=path.dirname(path.resolve(file));fs.mkdirSync(dir,{recursive:true,mode:0o700});
const keyFile=path.join(dir,'vapid.json');
if(!cfg.vapidPrivateKey||!cfg.vapidPublicKey){let k;if(fs.existsSync(keyFile)){k=JSON.parse(fs.readFileSync(keyFile,'utf8'))}else{k=push.generateVAPIDKeys();fs.writeFileSync(keyFile,JSON.stringify(k),{mode:0o600,flag:'wx'})}cfg.vapidPublicKey=k.publicKey;cfg.vapidPrivateKey=k.privateKey}
const admin=process.env.OMNI_REGISTRY_TOKEN||null;
push.setVapidDetails(origin+'/Omni-lunar/',cfg.vapidPublicKey,cfg.vapidPrivateKey);
let devices=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
function save(){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(devices),{mode:0o600});fs.renameSync(tmp,file)}
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function same(a,b){return typeof a==='string'&&typeof b==='string'&&crypto.timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)))}
function validate(x){const s=x?.subscription;let u;try{u=new URL(s.endpoint)}catch{throw Error('Invalid subscription')};
const allowed=u.hostname==='fcm.googleapis.com'||u.hostname==='android.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.push.apple.com')||u.hostname==='push.services.mozilla.com';
if(!allowed||u.protocol!=='https:'||u.port||u.username||u.password||u.hash||s.endpoint.length>2048||!/^[-_A-Za-z0-9]{87}$/.test(s.keys?.p256dh||'')||!/^[-_A-Za-z0-9]{22}$/.test(s.keys?.auth||''))throw Error('Invalid push endpoint or keys');
const zone=String(x.timezone||'UTC');new Intl.DateTimeFormat('en',{timeZone:zone});return {subscription:{endpoint:s.endpoint,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}},language:['es','en','pt'].includes(x.language)?x.language:'es',timezone:zone}}
let schedulerDelivery={};const deliveryFile=path.join(dir,'delivery-status.json');
function result(d){const automatic=d&&schedulerDelivery.devices?.[hash(d.subscription.endpoint).slice(0,24)]?.lastDelivery;return {registered:!!d,lastDelivery:[d?.lastDelivery,automatic].filter(Boolean).sort().at(-1)||null,automaticLastDelivery:automatic||null}}
let child=null,lastCycle=null;
function schedule(){if(child||!Object.keys(devices).length)return;const snapshot=path.join(dir,'dispatch-devices.json');fs.writeFileSync(snapshot,JSON.stringify(Object.values(devices)),{mode:0o600});child=spawn(process.execPath,['scripts/dispatch.mjs'],{cwd:'/app',env:{...process.env,OMNI_CONFIG:JSON.stringify(cfg),OMNI_DEVICES:'[]',OMNI_DEVICES_FILE:snapshot,OMNI_REGISTRY_URL:'',OMNI_REGISTRY_TOKEN:'',OMNI_STATE_DIR:path.join(dir,'scheduler'),OMNI_DELIVERY_FILE:deliveryFile,OMNI_SELF_HOSTED:'true',OMNI_TEST:'false',OMNI_FORCE:'false'},stdio:['ignore','inherit','inherit']});let p=child;const timer=setTimeout(()=>p.kill('SIGKILL'),240000);p.once('error',()=>{clearTimeout(timer);child=null});p.once('exit',code=>{clearTimeout(timer);child=null;if(code===0){lastCycle=new Date().toISOString();try{schedulerDelivery=JSON.parse(fs.readFileSync(deliveryFile,'utf8'))}catch{}}});}
try{schedulerDelivery=JSON.parse(fs.readFileSync(deliveryFile,'utf8'))}catch{}
setInterval(schedule,60000).unref();
setTimeout(schedule,5000).unref();
const limits=new Map();function limit(key,max,period){let n=Date.now(),v=limits.get(key);if(!v||v.until<n){v={count:0,until:n+period};limits.set(key,v)}return ++v.count<=max}setInterval(()=>{for(const [k,v] of limits)if(v.until<Date.now())limits.delete(k)},60000).unref();
async function body(req){let a=[],n=0;for await(const x of req){n+=x.length;if(n>8192)throw Error('Body too large');a.push(x)}return JSON.parse(Buffer.concat(a).toString('utf8'))}
async function test(d){if(Date.now()-(d.lastTest||0)<60000)throw Error('Wait 60 seconds before another test');d.lastTest=Date.now();save();const message={es:'OMNI Lunar · conexión remota verificada.',en:'OMNI Lunar · remote connection verified.',pt:'OMNI Lunar · conexão remota verificada.'}[d.language];await push.sendNotification(d.subscription,JSON.stringify({title:'OMNI Lunar',body:message,tag:'omni-remote-test-'+Date.now()}),{TTL:120,timeout:15000,urgency:'high'});d.lastDelivery=new Date().toISOString();save()}
const server=http.createServer(async(req,res)=>{const o=req.headers.origin;res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');if(o===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type')}
const reply=(code,data)=>{res.writeHead(code);res.end(JSON.stringify(data))};
try{const route=new URL(req.url,'http://localhost').pathname;
if(req.method==='GET'&&route==='/health')return reply(200,{ok:true,lastCycle});
if(req.method==='GET'&&route==='/config')return reply(200,{publicKey:cfg.vapidPublicKey});
if(req.method==='OPTIONS')return reply(o===origin?204:403,{});
if(req.method==='GET'&&route==='/admin/devices'){if(!admin||!same(req.headers.authorization,'Bearer '+admin))return reply(401,{error:'Unauthorized'});return reply(200,Object.values(devices).map(({subscription,language,timezone})=>({subscription,language,timezone})))}
if(req.method!=='POST'||o!==origin||!['/register','/status','/test','/unregister'].includes(route))return reply(404,{error:'Not found'});
if(!limit('ip:'+req.socket.remoteAddress,120,60000))return reply(429,{error:'Too many requests'});
const d=validate(await body(req)),id=hash(d.subscription.endpoint),old=devices[id];
if(old&&(!same(old.subscription.keys.auth,d.subscription.keys.auth)||!same(old.subscription.keys.p256dh,d.subscription.keys.p256dh)))return reply(403,{error:'Invalid device credentials'});
if(route==='/status')return reply(200,result(old));
if(route==='/unregister'){delete devices[id];save();return reply(200,{registered:false})}
if(route==='/register'){if(!old&&Object.keys(devices).length>=10000)return reply(503,{error:'Registry capacity reached'});devices[id]={...old,...d};save();if(!old||!old.lastDelivery){try{await test(devices[id])}catch(e){if([404,410].includes(e.statusCode)){delete devices[id];save()}return reply(502,{error:'Push test failed; retry',registered:!!devices[id]})}}return reply(200,result(devices[id]))}
if(!old)return reply(404,{error:'Not registered'});if(!limit('test:'+id,1,60000))return reply(429,{error:'Wait before retrying'});try{await test(old)}catch(e){if([404,410].includes(e.statusCode)){delete devices[id];save()}return reply(502,{error:'Push test failed'})}return reply(200,result(old));
}catch{return reply(400,{error:'Invalid request'})}});
server.requestTimeout=25000;server.listen(Number(process.env.PORT||8080),'0.0.0.0');
