import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import push from 'web-push';
const cfg=JSON.parse(process.env.OMNI_CONFIG||'{}'), devices=JSON.parse(process.env.OMNI_DEVICES||'[]');
const data=vm.runInNewContext(fs.readFileSync('ephemerides.js','utf8')+'\nDATA');
const fallback=JSON.parse(fs.readFileSync('fallback.json','utf8'));
const file='.omni-state/state.json', state=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
const P=['','Caos','Nacimiento','Forma','Pregunta','Aprendizaje','Justicia','Aceptación','Olvido','Mentira','Dolor','Vacío','Existencia','Amor','Reflexión','Madurez','Recuerdo','Dualidad','Verdad','Reconocimiento','Equilibrio','Calma','Decisión','Orden','Despertar','Responsabilidad','Propósito','Espíritu','Gracia','Nada','Todo','Infinito','Omni'];
const langs={es:'español rioplatense',en:'English',pt:'português brasileiro'}, stages=['inicio de expansión','aceleración expansiva','expansión intensificada','desaceleración expansiva','inicio de integración','aceleración integrativa','integración intensificada','desaceleración integrativa'];
const phases={es:['Luna nueva','Cuarto creciente','Luna llena','Cuarto menguante','Luna creciente','Gibosa creciente','Gibosa menguante','Luna menguante'],en:['New moon','First quarter','Full moon','Last quarter','Waxing crescent','Waxing gibbous','Waning gibbous','Waning crescent'],pt:['Lua nova','Quarto crescente','Lua cheia','Quarto minguante','Lua crescente','Gibosa crescente','Gibosa minguante','Lua minguante']};
const identity='Sos la voz de OMNI Lunar: dualidad en equilibrio dinámico fractal. Expansión exterior e integración interior son complementarias. En subida: iniciar, decidir, animarse, crear, asumir riesgos conscientes. En bajada: introspección, integrar sombras, escuchar, observar, silencio, soltar. Impulso creciente, intensificado en la segunda mitad, desaceleración antes del giro. Mensajes positivos, variados y profundos. No horóscopos, ideología, predicciones ni promesas de resultados. No negar riesgos reales. Pisadas exactas: '+P.slice(1).map((x,i)=>(i+1)+'. '+x).join('; ')+'. No inventar asociaciones. Una o dos frases, hasta 30 palabras.';
const now=Date.now(), DAY=86400000;
function parts(t,z){let a=new Intl.DateTimeFormat('en-GB',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(t);let p=Object.fromEntries(a.map(x=>[x.type,x.value]));return {date:p.year+'-'+p.month+'-'+p.day,h:+p.hour,m:+p.minute}}
function localTime(date,minute,z){let [y,m,d]=date.split('-').map(Number),target=Date.UTC(y,m-1,d,0,minute),guess=target;for(let i=0;i<4;i++){let p=parts(guess,z),[a,b,c]=p.date.split('-').map(Number),delta=target-Date.UTC(a,b-1,c,p.h,p.m);if(!delta)break;guess+=delta}let p=parts(guess,z);return p.date===date&&p.h*60+p.m===minute?guess:null}
function context(t){let q=data.phases,i=q.findIndex(x=>x[0]>t);if(i<1)i=1;let j=i-1;while(j>0&&q[j][1]!==0)j--;let p=q.slice(j,j+5);if(p.length<5)return {g:0,phase:0};let up=q[i-1][1]<2,k=up?0:2,u=t<p[k+1][0]?.5*(t-p[k][0])/(p[k+1][0]-p[k][0]):.5+.5*(t-p[k+1][0])/(p[k+2][0]-p[k+1][0]);return {g:(up?0:4)+Math.max(0,Math.min(3,Math.floor(u*4))),phase:[4,5,6,7][q[i-1][1]]}}
function slots(date,id){let a=Array.from({length:992},(_,i)=>i);for(let i=a.length-1;i>0;i--){let x=crypto.createHmac('sha256',cfg.vapidPrivateKey||'test').update(date+'|'+id+'|'+i).digest().readUInt32BE(0)%(i+1);[a[i],a[x]]=[a[x],a[i]]}return a.slice(0,32).sort((a,b)=>a-b).map((x,i)=>x+14*i)}
function code(n){return n>=1&&n<=32?String(n).padStart(2,'0')+'. '+P[n]:null}
function valid(s){return typeof s==='string'&&s.length>5&&s.length<=350}
function local(g,l,i){let a=fallback[l][g];return a[i%a.length]}
async function gemini(prompt){if(!cfg.geminiKey)return null;for(let model of ['gemini-3.1-flash-lite','gemini-3.5-flash-lite','gemini-2.5-flash-lite']){try{let r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':cfg.geminiKey},body:JSON.stringify({systemInstruction:{parts:[{text:identity}]},contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:1.05,maxOutputTokens:8192,responseMimeType:'application/json'}}),signal:AbortSignal.timeout(45000)});if(!r.ok){console.log('Gemini HTTP '+r.status);if(r.status===401||r.status===403)return null;continue}let j=await r.json();return JSON.parse(j.candidates[0].content.parts.filter(x=>!x.thought).map(x=>x.text||'').join(''))}catch{console.log('Gemini fallback')}}return null}
async function bank(){let old={};try{old=JSON.parse(fs.readFileSync('resonances.json'))}catch{};if(old.generatedAt&&now-Date.parse(old.generatedAt)<20*3600000&&(!cfg.geminiKey||old.source==='gemini'))return;
let out={generatedAt:new Date(now).toISOString(),source:'local',sources:{},messages:{}};
for(let l of Object.keys(langs)){let j=await gemini('Idioma: '+langs[l]+'. Generá un objeto JSON con claves 0 a 7, cada valor array de 10 mensajes distintos. Etapas: '+JSON.stringify(stages)+'. Evitá repetir: '+JSON.stringify(old.messages?.[l]||{}).slice(0,2500));let good=true;out.messages[l]=[];for(let g=0;g<8;g++){let a=Array.isArray(j?.[g])?[...new Set(j[g].filter(valid))]:[];if(a.length<5){good=false;a=fallback[l][g]}out.messages[l][g]=a}out.sources[l]=good?'gemini':'local';if(good)out.source='gemini'}fs.writeFileSync('resonances.json',JSON.stringify(out));}
async function makePlan(date,id,zone,lang){let a=slots(date,id).map((m,i)=>{let t=localTime(date,m,zone);if(t===null)return null;let c=context(t);return {i,t,h:Math.floor(m/60),m:m%60,g:c.g,phase:c.phase}}).filter(Boolean);
let items=a.map(s=>({id:s.i,pisadas:[code(s.h),code(s.m)].filter(Boolean),etapa:stages[s.g],fase:phases.es[s.phase]}));
let j=await gemini('Idioma: '+langs[lang]+'. Fecha: '+date+'. Generá una frase distinta para cada contexto. JSON objeto: clave id, valor frase. No incluyas numeración. '+JSON.stringify(items));
for(let s of a)s.text=valid(j?.[s.i])?j[s.i]:local(s.g,lang,s.i);return a}
async function send(d,title,body,tag){try{await push.sendNotification(d.subscription,JSON.stringify({title,body,tag}),{TTL:900,urgency:'normal',timeout:15000});return true}catch(e){console.log('Push status '+(e.statusCode||'network'));return false}}
function milestones(){let a=data.samples,out=data.phases.map(q=>({t:q[0],phase:q[1]})),map={2:4,92:5,182:6,272:7};for(let i=1;i<a.length;i++){let p=a[i-1][0],q=a[i][0];if(q<p)q+=360;for(let ang of [2,92,182,272]){let k=ang;if(k<p)k+=360;if(k>p&&k<=q&&q>p)out.push({t:data.start+(i-1+(k-p)/(q-p))*21600000,phase:map[ang]})}}return out.filter(x=>Math.abs(x.t-now)<2*DAY)}
await bank();
if(devices.length&&cfg.vapidPrivateKey&&cfg.vapidPublicKey){
push.setVapidDetails('https://zauberfizzt-bot.github.io/Omni-lunar/',cfg.vapidPublicKey,cfg.vapidPrivateKey);
let ev=milestones();
for(let d of devices){try{
if(!d.subscription?.endpoint||!d.subscription?.keys||new URL(d.subscription.endpoint).protocol!=='https:')continue;
let id=crypto.createHash('sha256').update(d.subscription.endpoint).digest('hex').slice(0,24),l=langs[d.language]?d.language:'es',z=d.timezone||'America/Argentina/Buenos_Aires',date=parts(now,z).date;
if(process.env.OMNI_TEST==='true'){await send(d,'OMNI Lunar',l==='es'?'Notificaciones OMNI activas.':l==='pt'?'Notificações OMNI ativas.':'OMNI notifications are active.','test-'+now);continue}
let p=state[id]||{};if(p.date!==date){p={date,slots:await makePlan(date,id,z,l),sent:[],events:p.events||[],last:p.last||0};state[id]=p}
let due=p.slots.filter(s=>s.t<=now&&s.t>now-45*60000&&!p.sent.includes(s.i)).sort((a,b)=>b.t-a.t);
if(due.length&&now-p.last>=15*60000){let s=due[0],t=parts(now,z),head=[code(t.h),code(t.m)].filter(Boolean).join('\n'),title=String(t.h).padStart(2,'0')+':'+String(t.m).padStart(2,'0')+' · OMNI';if(await send(d,title,(head?head+'\n\n':'')+s.text,'omni-'+date+'-'+s.i)){p.sent.push(s.i);p.last=now}}
for(let e of ev){for(let h of [24,1,0]){let at=e.t-h*3600000,key=e.t+'-'+h;if(at>now||at<=now-12*60000||p.events.includes(key))continue;let name=phases[l][e.phase],prefix=l==='es'?(h?'En '+h+' h · ':'Comienza · '):l==='pt'?(h?'Em '+h+' h · ':'Começa · '):(h?'In '+h+' h · ':'Begins · ');if(await send(d,'OMNI · '+name,prefix+name,'phase-'+key))p.events.push(key)}}
p.events=p.events.filter(x=>Number(x.split('-')[0])>now-3*DAY);
}catch{console.log('Device configuration or delivery failed')}}
}else console.log('No registered devices or VAPID configuration yet');
fs.mkdirSync('.omni-state',{recursive:true});fs.writeFileSync(file,JSON.stringify(state));
