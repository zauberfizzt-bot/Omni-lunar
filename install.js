(()=>{let pending=null,btn,note,busy=false;
const installed=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const lang=()=>document.documentElement.lang?.slice(0,2)||'es';
const tr=(es,en,pt)=>({es,en,pt}[lang()]||es);
function refresh(){if(!btn)return;btn.hidden=installed();btn.style.display=installed()?'none':'block';btn.disabled=busy;btn.textContent=busy?tr('Instalando…','Installing…','Instalando…'):tr('↓ Instalar OMNI Lunar','↓ Install OMNI Lunar','↓ Instalar OMNI Lunar');if(installed()&&note)note.hidden=true}
function instructions(){note.hidden=false;const ua=navigator.userAgent;if(/iPhone|iPad|iPod/.test(ua)){note.textContent=tr('En Safari: Compartir → Añadir a pantalla de inicio.','In Safari: Share → Add to Home Screen.','No Safari: Compartilhar → Adicionar à Tela de Início.');return}
note.textContent=tr('Abrí esta página en Chrome (no dentro de ChatGPT ni WhatsApp). Tocá ⋮ → Instalar aplicación o Añadir a pantalla principal. Si figura Abrir aplicación, OMNI ya está instalado.','Open this page in Chrome (not inside ChatGPT or WhatsApp). Tap ⋮ → Install app or Add to Home screen. If Open app appears, OMNI is already installed.','Abra esta página no Chrome (não dentro do ChatGPT ou WhatsApp). Toque em ⋮ → Instalar aplicativo ou Adicionar à tela inicial. Se aparecer Abrir aplicativo, OMNI já está instalado.');}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();pending=e;refresh()});
window.addEventListener('appinstalled',()=>{pending=null;note&&(note.hidden=true);if(btn){btn.hidden=true;btn.style.display='none'}});
document.addEventListener('DOMContentLoaded',()=>{if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});if(installed())return;const shell=document.querySelector('.shell');if(!shell)return;const wrap=document.createElement('div');wrap.style.cssText='text-align:center;margin:0 auto 14px';
btn=document.createElement('button');btn.type='button';btn.style.cssText='margin:0 auto;padding:10px 20px;border-radius:30px;border:1px solid #d6caff77;color:#f2eaff;background:#342650aa;font:inherit';
note=document.createElement('p');note.hidden=true;note.setAttribute('role','status');note.style.cssText='font-size:13px;line-height:1.5;color:#ded8f2;max-width:360px;margin:10px auto 0';
btn.onclick=async()=>{if(busy)return;if(!pending){instructions();return}const p=pending;pending=null;busy=true;refresh();try{await p.prompt();const choice=await p.userChoice;if(choice.outcome==='accepted'){btn.hidden=true;btn.style.display='none';note.hidden=true;return}instructions()}catch{instructions()}finally{busy=false;refresh()}};
wrap.append(btn,note);shell.prepend(wrap);refresh()});})();
