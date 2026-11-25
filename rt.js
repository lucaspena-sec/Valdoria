// Tiempo real por "ping" (Supabase Realtime, canal broadcast). Necesita app.js cargado ANTES.
// Por el canal NO viajan datos: solo el aviso "refrescá". Cada cliente vuelve a pedir lo suyo con las mismas
// funciones filtradas de siempre (combate_ver2, escenario_ver...), así que lo oculto nunca sale del servidor.
// Si Realtime no conecta, todo sigue funcionando con el polling de antes (cada 3-4 s).
// Uso: rtIniciar('canal', funcionQueRefresca) · rtPing('canal') · rtTocaPoll(n) para espaciar el polling.
const RT={ch:null,ok:false,fn:{},t:{},last:{}};
function rtIniciar(canal,alPing){
 RT.fn[canal]=alPing;
 if(RT.ch)return;
 try{
  RT.ch=sb.channel('valdoria',{config:{broadcast:{self:false}}});
  RT.ch.on('broadcast',{event:'ping'},m=>{
   const c=m&&m.payload&&m.payload.c,f=RT.fn[c];
   if(!f||RT.t[c])return;   /* ya hay un refresco en camino: los pings juntos cuentan como uno */
   /* como mucho un refresco por segundo y por canal, aunque llegue una ráfaga de pings */
   RT.t[c]=setTimeout(()=>{RT.t[c]=null;RT.last[c]=Date.now();try{f()}catch(e){}},Math.max(200,1000-(Date.now()-(RT.last[c]||0))))});
  RT.ch.subscribe(st=>{RT.ok=(st==='SUBSCRIBED');rtMarca()})
 }catch(e){RT.ch=null;RT.ok=false}}
function rtPing(canal){try{if(RT.ch&&RT.ok)RT.ch.send({type:'broadcast',event:'ping',payload:{c:canal}})}catch(e){}}
/* con Realtime conectado alcanza con consultar una vez cada "cada" ciclos; sin Realtime, siempre */
const rtTocaPoll=(()=>{let n=0;return cada=>{if(!RT.ok){n=0;return true}if(++n>=cada){n=0;return true}return false}})();
/* cartelito discreto "⚡ en vivo" (se ve solo si Realtime está conectado; en modo TV no se muestra) */
function rtMarca(){
 let b=document.getElementById('rtBadge');
 if(!RT.ok||!document.body||document.body.classList.contains('tv')){if(b)b.remove();return}
 if(!b){b=document.createElement('div');b.id='rtBadge';b.textContent='⚡ en vivo';
  b.style.cssText='position:fixed;left:6px;bottom:4px;font:11px Tahoma,Verdana,sans-serif;color:#fff;background:#000a;padding:1px 6px;border-radius:8px;z-index:40;pointer-events:none;opacity:.7';
  document.body.appendChild(b)}}
