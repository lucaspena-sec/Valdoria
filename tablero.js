// Tablero (fase 2): cuadrícula hexagonal o cuadrada, fondo (foto, GIF o video) y fichas que se mueven, compartido en vivo.
// Con setup_tablero.sql: el DM que dirige la mesa edita y los jugadores ven (y, si el DM lo permite, mueven su ficha).
// Sin el SQL funciona en modo local, como la fase 1. Necesita app.js y rt.js cargados ANTES (usa cabecera, getU, rtIniciar).
// Vive dentro de una función: no deja variables globales, así no choca con app.js, comun.js ni rt.js.
(function(){
'use strict';
const $=id=>document.getElementById(id);
const R3=Math.sqrt(3),KEY='valdoriaTablero1',MIN_K=.05,MAX_K=6;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const COL={pj:'#2e6fd8',criatura:'#c0392b'};
const EMO={pj:['🧙','🛡️','🏹','🗡️','🧝'],criatura:['🐺','👹','🐲','💀','🕷️']};
/* Estado. Las fichas viven en CELDAS (a,b), no en píxeles. */
const DEF=()=>({forma:'hex',orient:'punta',size:56,ox:0,oy:0,ver:true,color:'#ffffff',alpha:.45,W:1400,H:1000,bg:{tipo:'',url:''},activo:false,mover:false,yo:null,
 fichas:[{id:'f1',tipo:'pj',nombre:'Aria',em:'🧙',imagen:'',tam:1,a:2,b:2,jugador:null,cid:null,vis:true},{id:'f2',tipo:'criatura',nombre:'Lobo',em:'🐺',imagen:'',tam:1,a:5,b:3,jugador:null,cid:null,vis:true},{id:'f3',tipo:'criatura',nombre:'Troll',em:'👹',imagen:'',tam:2,a:7,b:5,jugador:null,cid:null,vis:true}]});
const normFicha=f=>({tipo:'criatura',nombre:'?',em:'❓',imagen:'',a:0,b:0,jugador:null,cid:null,...f,tam:f.tam==2?2:1,vis:f.vis!==false});
let S=DEF(),V={x:0,y:0,k:1},sel=null,G=null,blobUrl='',tG=null;
let modo='local';        // 'local' (sin SQL) · 'dm' (dirige la mesa: edita) · 'jug' (mira y, si se permite, mueve la suya)
let pend=0,tmC=null,ULT='',primera=true,CRS=[];
const P=new Map();
function cargarLocal(){try{const j=JSON.parse(localStorage.getItem(KEY)||'null');
 if(j&&typeof j==='object'){const d=DEF();S={...d,...j,bg:{...d.bg,...(j.bg||{})}};
  if(!Array.isArray(S.fichas))S.fichas=d.fichas;
  S.fichas=S.fichas.filter(f=>f&&f.id).map(normFicha);
  S.size=clamp(+S.size||56,24,140);S.ox=clamp(+S.ox||0,-140,140);S.oy=clamp(+S.oy||0,-140,140);S.alpha=clamp(+S.alpha||.45,.05,1);
  if(S.forma!=='cuad')S.forma='hex';if(S.orient!=='plano')S.orient='punta';
  S.W=1400;S.H=1000;S.activo=false;S.mover=false;S.yo=null}}catch(e){S=DEF()}}

const aviso=(t,ok)=>{const m=$('msg');m.className=ok?'ok':'err';m.textContent=t||''};
const nuevoId=()=>'f'+Date.now().toString(36)+Math.floor(Math.random()*999);
const fmt=d=>{const ft=d*5;return getU()==='m'?(ft*.3).toFixed(1).replace('.',',').replace(/,0$/,'')+' m':ft+' pies'};
const ficha=id=>S.fichas.find(f=>f.id===id);
const elF=id=>$('fichasEl').querySelector('[data-id="'+id+'"]');
const puedeMover=f=>!!f&&(modo!=='jug'||(S.mover&&f.tipo==='pj'&&!!f.jugador&&f.jugador===S.yo&&f.vis!==false));

/* ---------- matemática de la cuadrícula ---------- */
function centroLocal(a,b){const s=S.size;
 if(S.forma==='hex')return S.orient==='punta'?{x:s*R3*(a+b/2),y:s*1.5*b}:{x:s*1.5*a,y:s*R3*(b+a/2)};
 return{x:(a+.5)*s,y:(b+.5)*s}}
function centroCelda(a,b){const c=centroLocal(a,b);return{x:c.x+S.ox,y:c.y+S.oy}}
// en cuadrícula cuadrada, las fichas grandes (tamaño 2) se apoyan en un vértice, no en el centro de una celda
const vertice=f=>S.forma==='cuad'&&f.tam===2;
const centroFicha=f=>vertice(f)?{x:f.a*S.size+S.ox,y:f.b*S.size+S.oy}:centroCelda(f.a,f.b);
function hexRedondo(q,r){const x=q,z=r,y=-x-z;let rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);
 const dx=Math.abs(rx-x),dy=Math.abs(ry-y),dz=Math.abs(rz-z);
 if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;
 return{a:rx,b:rz}}
function celdaEn(x,y,f){const s=S.size,lx=x-S.ox,ly=y-S.oy;
 if(S.forma==='hex')return S.orient==='punta'?hexRedondo((R3/3*lx-ly/3)/s,(2/3*ly)/s):hexRedondo((2/3*lx)/s,(-lx/3+R3/3*ly)/s);
 if(f&&vertice(f))return{a:Math.round(lx/s),b:Math.round(ly/s)};
 return{a:Math.floor(lx/s),b:Math.floor(ly/s)}}
function distancia(c1,c2){const da=c2.a-c1.a,db=c2.b-c1.b;
 return S.forma==='hex'?(Math.abs(da)+Math.abs(da+db)+Math.abs(db))/2:Math.max(Math.abs(da),Math.abs(db))}
function poligono(a,b){const s=S.size,c=centroLocal(a,b),p=[];
 if(S.forma==='hex'){const off=S.orient==='punta'?30:0;
  for(let i=0;i<6;i++){const t=(60*i-off)*Math.PI/180;p.push((c.x+s*Math.cos(t)).toFixed(1)+','+(c.y+s*Math.sin(t)).toFixed(1))}}
 else{const h=s/2;p.push((c.x-h)+','+(c.y-h),(c.x+h)+','+(c.y-h),(c.x+h)+','+(c.y+h),(c.x-h)+','+(c.y+h))}
 return p.join(' ')}

/* ---------- dibujo ---------- */
function dibujarGrid(){
 const s=S.size,W=S.W,H=S.H,ox=S.ox,oy=S.oy;let d='';
 if(S.forma==='cuad'){
  for(let k=Math.floor(-ox/s);k<=Math.ceil((W-ox)/s);k++)d+='M'+(k*s)+' '+(-oy-s)+'V'+(H-oy+s);
  for(let k=Math.floor(-oy/s);k<=Math.ceil((H-oy)/s);k++)d+='M'+(-ox-s)+' '+(k*s)+'H'+(W-ox+s);
 }else{
  const cel=(a,b)=>'M'+poligono(a,b).split(' ').join('L')+'Z';
  if(S.orient==='punta'){
   for(let r=Math.floor(-oy/(1.5*s))-1;r<=Math.ceil((H-oy)/(1.5*s))+1;r++){
    const q0=Math.floor(-ox/(s*R3)-r/2)-1,q1=Math.ceil((W-ox)/(s*R3)-r/2)+1;
    for(let q=q0;q<=q1;q++)d+=cel(q,r)}
  }else{
   for(let q=Math.floor(-ox/(1.5*s))-1;q<=Math.ceil((W-ox)/(1.5*s))+1;q++){
    const r0=Math.floor(-oy/(s*R3)-q/2)-1,r1=Math.ceil((H-oy)/(s*R3)-q/2)+1;
    for(let r=r0;r<=r1;r++)d+=cel(q,r)}}}
 const svg=$('svg');svg.setAttribute('width',W);svg.setAttribute('height',H);
 svg.innerHTML='<g transform="translate('+ox+' '+oy+')"><path d="'+d+'" fill="none" stroke="'+S.color+'" stroke-opacity="'+S.alpha+'" stroke-width="1.5" vector-effect="non-scaling-stroke" style="display:'+(S.ver?'inline':'none')+'"/>'+
  '<polygon id="hs" points="" fill="rgba(255,213,74,.22)" stroke="#ffd54a" stroke-width="2" vector-effect="non-scaling-stroke"/>'+
  '<polygon id="hh" points="" fill="rgba(255,255,255,.2)" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke"/></g>';
 pintarHl()}
function pintarHl(){const hs=$('hs');if(!hs)return;const f=ficha(sel);
 hs.setAttribute('points',f&&!vertice(f)?poligono(f.a,f.b):'')}
function mostrarHh(c){const hh=$('hh');if(hh)hh.setAttribute('points',c?poligono(c.a,c.b):'')}
function pintarFichas(){
 const box=$('fichasEl'),vivas=new Set();
 S.fichas.forEach(f=>{vivas.add(f.id);let el=elF(f.id);
  if(!el){el=document.createElement('div');el.className='ficha';el.dataset.id=f.id;
   el.innerHTML='<span class="em"></span><span class="nm"></span>';box.appendChild(el)}
  const c=centroFicha(f),w=(S.forma==='hex'?R3*S.size:S.size)*.9*f.tam;
  el.style.left=c.x+'px';el.style.top=c.y+'px';el.style.width=w+'px';el.style.height=w+'px';
  el.style.setProperty('--c',COL[f.tipo]||'#888');
  const em=el.firstChild,nm=el.lastChild;em.textContent=f.em;em.style.fontSize=(w*.55)+'px';
  nm.textContent=(f.vis===false?'🙈 ':'')+f.nombre;nm.style.fontSize=Math.max(9,S.size*.22)+'px';
  el.classList.toggle('sel',f.id===sel);el.classList.toggle('oculta',f.vis===false);el.classList.toggle('mia',modo==='jug'&&puedeMover(f));
  // foto del retrato o de la criatura (si no carga, se queda el emoji)
  if(el._img!==f.imagen){el._img=f.imagen;el.classList.remove('conimg');el.style.backgroundImage='';
   if(f.imagen){const im=new Image(),u=f.imagen;im.onload=()=>{if(el._img===u){el.style.backgroundImage="url('"+u.replace(/'/g,'%27')+"')";el.classList.add('conimg')}};im.src=u}}});
 [...box.children].forEach(el=>{if(!vivas.has(el.dataset.id))el.remove()})}
function syncUI(){
 $('bForma').textContent=S.forma==='hex'?'⬡ Hexágonos (tocá para cuadrados)':'▦ Cuadrados (tocá para hexágonos)';
 $('bOri').style.display=S.forma==='hex'?'':'none';
 $('bOri').textContent=S.orient==='punta'?'△ Punta arriba (girar)':'▭ Lado plano arriba (girar)';
 $('verC').checked=S.ver;$('colC').value=S.color;$('sizeR').value=S.size;$('alR').value=Math.round(S.alpha*100);
 $('oxR').value=S.ox;$('oyR').value=S.oy;$('sizeL').textContent=S.size+' px = 5 pies';
 $('bAct').textContent=S.activo?'⬛ Ocultar a los jugadores':'📺 Mostrar a los jugadores';
 $('live').textContent=S.activo?'📺 Los jugadores están viendo el tablero.':'⬛ Los jugadores NO ven el tablero todavía.';
 $('jugMueve').checked=!!S.mover}

/* ---------- guardado: local, o en la base si dirige el DM ---------- */
let tmG;function guardarLocal(){clearTimeout(tmG);tmG=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify({forma:S.forma,orient:S.orient,size:S.size,ox:S.ox,oy:S.oy,ver:S.ver,color:S.color,alpha:S.alpha,bg:S.bg,fichas:S.fichas}))}catch(e){}},300)}
const ocupado=()=>pend>0||!!tmC;
// corre una operación contra la base: avisa si falla, pide refrescar y le avisa a los demás que cambió algo
async function op(p,resync){pend++;let rs=!!resync;
 try{const r=await p;if(r&&r.error){aviso(r.error.message);rs=true}}catch(e){aviso(String(e.message||e));rs=true}
 finally{pend--}
 if(rs)ver(true);else rtPing('tablero')}
function flushCfg(){tmC=null;
 op(sb.from('tablero_estado').update({forma:S.forma,orient:S.orient,size:S.size,ox:S.ox,oy:S.oy,ver:S.ver,color:S.color,alpha:S.alpha,bg_tipo:S.bg.tipo||'',bg_url:S.bg.url||'',jug_mueven:!!S.mover,activo:!!S.activo,actualizado:new Date().toISOString()}).eq('id',1))}
function persistirCfg(){if(modo==='local')guardarLocal();else if(modo==='dm'){clearTimeout(tmC);tmC=setTimeout(flushCfg,400)}}
const aFila=f=>({id:f.id,tipo:f.tipo,nombre:f.nombre,em:f.em,imagen:f.imagen||'',tam:f.tam,a:f.a,b:f.b,jugador:f.jugador||null,criatura_id:f.cid||null,visible:f.vis!==false});
function persistirF(lista){if(modo==='local')guardarLocal();else if(modo==='dm'&&lista.length)op(sb.from('tablero_fichas').upsert(lista.map(aFila)))}
function moverRemoto(f){
 if(modo==='local')guardarLocal();
 else if(modo==='dm')op(sb.from('tablero_fichas').update({a:f.a,b:f.b}).eq('id',f.id));
 else op(sb.rpc('tablero_mover',{p_id:f.id,p_a:f.a,p_b:f.b}))}
function todo(g){dibujarGrid();pintarFichas();syncUI();if(g!==false)persistirCfg()}
// cambia forma u orientación sin que las fichas salten de lugar: pasan de celda vieja a celda nueva según su posición real
function cambiarGrid(fn){
 const antes=S.fichas.map(f=>({f,c:centroFicha(f)}));
 fn();antes.forEach(o=>{const c=celdaEn(o.c.x,o.c.y,o.f);o.f.a=c.a;o.f.b=c.b});todo();persistirF(S.fichas)}

/* ---------- vista: zoom y arrastre del mapa ---------- */
const rect=()=>$('vista').getBoundingClientRect();
const aMundo=(cx,cy)=>{const r=rect();return{x:(cx-r.left-V.x)/V.k,y:(cy-r.top-V.y)/V.k}};
function aplicarV(){$('mundo').style.transform='translate('+V.x+'px,'+V.y+'px) scale('+V.k+')'}
function encajar(){const r=rect();if(!r.width)return;V.k=clamp(Math.min(r.width/S.W,r.height/S.H),MIN_K,MAX_K);V.x=(r.width-S.W*V.k)/2;V.y=(r.height-S.H*V.k)/2;aplicarV()}
function zoomEn(cx,cy,f){const r=rect(),w=aMundo(cx,cy);V.k=clamp(V.k*f,MIN_K,MAX_K);V.x=cx-r.left-w.x*V.k;V.y=cy-r.top-w.y*V.k;aplicarV()}

/* ---------- mover fichas ---------- */
function estado(t){$('estado').textContent=t}
const ayuda=()=>modo==='jug'?(S.mover?'Tocá tu ficha (borde dorado) y después la celda de destino, o arrastrala. Dos dedos: zoom.':'El DM mueve las fichas. Dos dedos o la rueda: zoom; arrastrá el fondo para moverte.'):'Tocá una ficha para elegirla y después tocá la celda de destino (o arrastrala). Dos dedos o la rueda del mouse: zoom. Arrastrá el fondo para moverte.';
function mover(f,c){
 const d=distancia(f,c),box=$('fichasEl');
 box.classList.add('mov');clearTimeout(tG);tG=setTimeout(()=>box.classList.remove('mov'),300);
 f.a=c.a;f.b=c.b;sel=f.id;pintarFichas();pintarHl();moverRemoto(f);
 estado(f.nombre+' se movió '+d+' celda'+(d==1?'':'s')+' ('+fmt(d)+').')}
function textoHover(c){const f=ficha(sel);let t='Celda '+c.a+', '+c.b;
 if(f){const d=distancia(f,c);t+=' · 📏 '+d+' celda'+(d==1?'':'s')+' desde '+f.nombre+' ('+fmt(d)+')'}return t}
function hover(e){if(e.pointerType!=='mouse')return;const w=aMundo(e.clientX,e.clientY),dentro=w.x>=0&&w.y>=0&&w.x<=S.W&&w.y<=S.H;
 if(!dentro){mostrarHh(null);return}const c=celdaEn(w.x,w.y,ficha(sel));mostrarHh(c);estado(textoHover(c))}
function cancelarFicha(){if(G&&G.t==='token'&&G.moved){const el=elF(G.id);if(el)el.classList.remove('drag');mostrarHh(null);pintarFichas()}}

const vista=$('vista');
vista.addEventListener('pointerdown',e=>{
 if(e.target.closest('#zctl'))return;
 if(e.pointerType==='mouse'&&e.button!==0)return;
 try{vista.setPointerCapture(e.pointerId)}catch(_){}
 P.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});
 if(P.size>2)return;
 if(P.size===2){
  cancelarFicha();
  const [p1,p2]=[...P.values()],cx=(p1.x+p2.x)/2,cy=(p1.y+p2.y)/2;
  G={t:'pinch',d0:Math.hypot(p1.x-p2.x,p1.y-p2.y)||1,k0:V.k,wc:aMundo(cx,cy)};return}
 const el=e.target.closest('.ficha'),f=el&&ficha(el.dataset.id);
 if(f&&puedeMover(f)){const w=aMundo(e.clientX,e.clientY),c=centroFicha(f);
  G={t:'token',id:f.id,moved:false,dx:w.x-c.x,dy:w.y-c.y,px:c.x,py:c.y}}
 else G={t:'pan',moved:false,vx:V.x,vy:V.y}});
vista.addEventListener('pointermove',e=>{
 const p=P.get(e.pointerId);if(!p){hover(e);return}
 p.x=e.clientX;p.y=e.clientY;if(!G)return;
 if(G.t==='pinch'&&P.size>=2){
  const [p1,p2]=[...P.values()],cx=(p1.x+p2.x)/2,cy=(p1.y+p2.y)/2,r=rect();
  V.k=clamp(G.k0*Math.hypot(p1.x-p2.x,p1.y-p2.y)/G.d0,MIN_K,MAX_K);
  V.x=cx-r.left-G.wc.x*V.k;V.y=cy-r.top-G.wc.y*V.k;aplicarV();return}
 const mv=Math.hypot(p.x-p.sx,p.y-p.sy);
 if(G.t==='pan'){if(mv>6)G.moved=true;if(G.moved){V.x=G.vx+p.x-p.sx;V.y=G.vy+p.y-p.sy;aplicarV()}return}
 if(G.t==='token'){
  if(!G.moved&&mv>6){G.moved=true;const el=elF(G.id);if(el)el.classList.add('drag')}
  if(G.moved){const w=aMundo(p.x,p.y),f=ficha(G.id),el=elF(G.id);if(!f||!el)return;
   G.px=w.x-G.dx;G.py=w.y-G.dy;el.style.left=G.px+'px';el.style.top=G.py+'px';
   const c=celdaEn(G.px,G.py,f);mostrarHh(c);
   const d=distancia({a:f.a,b:f.b},c);estado(f.nombre+': '+d+' celda'+(d==1?'':'s')+' ('+fmt(d)+')')}}});
function fin(e,cancel){
 if(!P.has(e.pointerId))return;P.delete(e.pointerId);
 if(!G)return;
 if(G.t==='pinch'){if(P.size<2)G=null;return}
 const g=G;G=null;
 if(g.t==='token'){const f=ficha(g.id),el=elF(g.id);if(!f||!el)return;
  if(g.moved){el.classList.remove('drag');mostrarHh(null);
   if(cancel)pintarFichas();else mover(f,celdaEn(g.px,g.py,f))}
  else if(!cancel){sel=sel===f.id?null:f.id;pintarFichas();pintarHl();estado(sel?f.nombre+' elegido. Tocá una celda para moverlo.':ayuda())}}
 else if(g.t==='pan'&&!g.moved&&!cancel){
  const w=aMundo(e.clientX,e.clientY),f=ficha(sel);
  if(f&&puedeMover(f)&&w.x>=0&&w.y>=0&&w.x<=S.W&&w.y<=S.H)mover(f,celdaEn(w.x,w.y,f));
  else if(sel){sel=null;pintarFichas();pintarHl();estado(ayuda())}}}
vista.addEventListener('pointerup',e=>fin(e,false));
vista.addEventListener('pointercancel',e=>fin(e,true));
vista.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!P.size)mostrarHh(null)});
vista.addEventListener('wheel',e=>{e.preventDefault();zoomEn(e.clientX,e.clientY,Math.exp(-e.deltaY*.0015))},{passive:false});

/* ---------- fondo (foto, GIF o video en bucle) ---------- */
function limpiarBg(){$('bgBox').innerHTML='';if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=''}}
function despuesDelFondo(guardar){const m=$('mundo');m.style.width=S.W+'px';m.style.height=S.H+'px';encajar();todo(guardar)}
// o={blob:true si es un archivo local temporal, save:false para no guardar (cuando solo se está mostrando lo que ya hay)}
function ponerBg(tipo,url,o){o=o||{};const guardar=o.save!==false;
 limpiarBg();if(o.blob)blobUrl=url;
 if(!tipo){S.bg={tipo:'',url:''};S.W=1400;S.H=1000;despuesDelFondo(guardar);return}
 const el=document.createElement(tipo==='video'?'video':'img');
 const listo=(w,h)=>{S.W=w||1400;S.H=h||1000;S.bg={tipo,url:o.blob?'':url};despuesDelFondo(guardar)};
 el.onerror=()=>{limpiarBg();S.bg={tipo:'',url:''};S.W=1400;S.H=1000;despuesDelFondo(guardar);aviso('No se pudo cargar el fondo. Revisá que el archivo o la URL sean válidos (en videos, mejor mp4 o webm).')};
 if(tipo==='video'){
  el.muted=true;el.defaultMuted=true;el.loop=true;el.autoplay=true;el.playsInline=true;
  el.setAttribute('muted','');el.setAttribute('playsinline','');
  el.onloadedmetadata=()=>{listo(el.videoWidth,el.videoHeight);el.play().catch(()=>{})};el.src=url}
 else{el.draggable=false;el.onload=()=>listo(el.naturalWidth,el.naturalHeight);el.src=url}
 $('bgBox').appendChild(el)}
async function comprimir(file,max){
 let bmp;try{bmp=await createImageBitmap(file,{imageOrientation:'from-image'})}
 catch(e){bmp=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('formato de imagen no válido'));i.src=URL.createObjectURL(file)})}
 const W=bmp.width||bmp.naturalWidth,H=bmp.height||bmp.naturalHeight,r=Math.min(1,max/Math.max(W,H)),w=Math.max(1,Math.round(W*r)),h=Math.max(1,Math.round(H*r));
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,w,h);x.drawImage(bmp,0,0,w,h);
 return new Promise((ok,no)=>c.toBlob(b=>b?ok(b):no(new Error('no se pudo achicar la foto')),'image/jpeg',.85))}
const MB=n=>(n/1048576).toFixed(1).replace('.',',')+' MB';
const bgBorrable=u=>{const m=/\/storage\/v1\/object\/public\/tablero\/([^?#]+)/.exec(u||'');return m?decodeURIComponent(m[1]):''};
function borrarArchivoBg(u){const n=bgBorrable(u);if(n)sb.storage.from('tablero').remove([n]).catch(()=>{})}
async function desdeArchivo(file){
 const esV=file.type.indexOf('video/')===0,esI=file.type.indexOf('image/')===0;
 if(!esV&&!esI){aviso('Elegí una foto, un GIF o un video.');return}
 try{
  if(modo==='dm'){   // se sube al servidor: lo ven los jugadores
   let blob=file,ext,tipo=esV?'video':'image';
   if(esV){if(!/^video\/(mp4|webm)$/.test(file.type)){aviso('Para el tablero usá un video mp4 o webm.');return}ext=file.type==='video/webm'?'webm':'mp4'}
   else if(file.type==='image/gif')ext='gif';
   else{blob=await comprimir(file,2400);ext='jpg'}
   if(blob.size>30e6){aviso('Pesa '+MB(blob.size)+' y el máximo es 30 MB. Probá con uno más corto o más liviano.');return}
   aviso('Subiendo '+MB(blob.size)+'…',true);
   const nom=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2))+'.'+ext,b=sb.storage.from('tablero');
   const up=await b.upload(nom,blob,{contentType:esV?file.type:(ext==='gif'?'image/gif':'image/jpeg'),cacheControl:'3600'});
   if(up.error)throw up.error;
   const viejo=S.bg.url;ponerBg(tipo,b.getPublicUrl(nom).data.publicUrl,{save:true});if(viejo)borrarArchivoBg(viejo);
   aviso('Fondo subido ('+MB(blob.size)+'). Los jugadores lo ven cuando muestres el tablero.'+(file.type==='image/gif'&&blob.size>8e6?' Ojo: el GIF pesa bastante; un mp4 corto pesa mucho menos.':''),true);return}
  const nota=' Los fondos de archivo no se guardan al recargar la página (con setup_tablero.sql se suben al servidor).';
  if(esV){ponerBg('video',URL.createObjectURL(file),{blob:true});aviso('Video cargado ('+MB(file.size)+').'+nota,true);return}
  if(file.type==='image/gif'){ponerBg('image',URL.createObjectURL(file),{blob:true});aviso('GIF cargado ('+MB(file.size)+').'+nota,true);return}
  const b2=await comprimir(file,2400);ponerBg('image',URL.createObjectURL(b2),{blob:true});aviso('Foto achicada de '+MB(file.size)+' a '+MB(b2.size)+'.'+nota,true)}
 catch(e){aviso('No se pudo usar ese archivo: '+(e.message||e))}}
const tipoUrl=u=>/\.(mp4|webm|ogv|m4v|mov)(\?|#|$)/i.test(u)?'video':'image';

/* ---------- ver lo que hay en la base (jugadores y DM) ---------- */
function aplicar(d){
 const mostrar=modo!=='jug'||d.activo;
 $('vista').style.display=mostrar?'':'none';$('estado').style.display=mostrar?'':'none';$('vacio').style.display=mostrar?'none':'block';
 if(!mostrar||!d.cfg){if(modo==='jug')S.activo=false;return}
 const c=d.cfg,bgCambio=(c.bg.url||'')!==(S.bg.url||'')||(c.bg.tipo||'')!==(S.bg.tipo||'');
 Object.assign(S,{forma:c.forma,orient:c.orient,size:c.size,ox:c.ox,oy:c.oy,ver:c.ver,color:c.color,alpha:+c.alpha,activo:!!d.activo,mover:!!d.mover,yo:d.yo||null});
 S.fichas=(d.fichas||[]).map(f=>normFicha({id:f.id,tipo:f.tipo,nombre:f.nombre,em:f.em,imagen:f.imagen,tam:f.tam,a:f.a,b:f.b,jugador:f.jugador,cid:f.cid,vis:f.vis}));
 if(sel&&!ficha(sel))sel=null;
 if(bgCambio)ponerBg(c.bg.tipo,c.bg.url,{save:false});
 else{if(primera){const m=$('mundo');m.style.width=S.W+'px';m.style.height=S.H+'px';encajar()}todo(false)}
 primera=false}
async function ver(forzar){
 if(modo==='local')return;
 if(!forzar&&(document.hidden||G||ocupado()))return;
 const r=await sb.rpc('tablero_ver');if(r.error||!r.data)return;
 const k=JSON.stringify(r.data);if(!forzar&&k===ULT)return;ULT=k;
 const antes=$('vista').style.display==='none';aplicar(r.data);
 if(antes&&$('vista').style.display!=='none')encajar()}

/* ---------- controles ---------- */
$('bForma').onclick=()=>cambiarGrid(()=>{S.forma=S.forma==='hex'?'cuad':'hex'});
$('bOri').onclick=()=>cambiarGrid(()=>{S.orient=S.orient==='punta'?'plano':'punta'});
$('verC').onchange=e=>{S.ver=e.target.checked;todo()};
$('colC').oninput=e=>{S.color=e.target.value;todo()};
$('sizeR').oninput=e=>{S.size=+e.target.value;todo()};
$('alR').oninput=e=>{S.alpha=e.target.value/100;todo()};
$('oxR').oninput=e=>{S.ox=+e.target.value;todo()};
$('oyR').oninput=e=>{S.oy=+e.target.value;todo()};
$('fileIn').onchange=e=>{const f=e.target.files[0];e.target.value='';if(f)desdeArchivo(f)};
$('bUrl').onclick=()=>{const u=$('urlIn').value.trim();if(!/^https?:\/\//i.test(u)){aviso('Pegá una URL que empiece con http:// o https://');return}
 aviso('',true);const viejo=S.bg.url;ponerBg(tipoUrl(u),u,{save:true});if(modo==='dm'&&viejo&&viejo!==u)borrarArchivoBg(viejo)};
$('bQuitarBg').onclick=()=>{aviso('',true);const viejo=S.bg.url;ponerBg('','',{save:true});if(modo==='dm'&&viejo)borrarArchivoBg(viejo)};
$('bAct').onclick=()=>{S.activo=!S.activo;syncUI();persistirCfg();estado(S.activo?'Los jugadores ya ven el tablero.':'Tablero oculto para los jugadores.')};
$('jugMueve').onchange=e=>{S.mover=e.target.checked;persistirCfg();estado(S.mover?'Cada jugador puede mover su propia ficha.':'Solo vos movés las fichas.')};

function centroVista(){const r=rect(),w=aMundo(r.left+r.width/2,r.top+r.height/2),c=celdaEn(w.x,w.y);return{a:clamp(c.a,-400,400),b:clamp(c.b,-400,400)}}
function celdaLibre(c0,ocup){let i=0;while(ocup.has((c0.a+i)+','+c0.b)&&i<400)i++;const c={a:clamp(c0.a+i,-500,500),b:c0.b};ocup.add(c.a+','+c.b);return c}
const ocupadas=()=>new Set(S.fichas.map(f=>f.a+','+f.b));
function agregar(tipo){
 if(S.fichas.length>=60){aviso('Máximo 60 fichas.');return}
 const n=S.fichas.filter(f=>f.tipo===tipo&&!f.jugador&&!f.cid).length,c=celdaLibre(centroVista(),ocupadas());
 const f=normFicha({id:nuevoId(),tipo,nombre:(tipo==='pj'?'PJ ':'Criatura ')+(n+1),em:EMO[tipo][n%EMO[tipo].length],a:c.a,b:c.b});
 S.fichas.push(f);sel=f.id;aviso('',true);pintarFichas();pintarHl();persistirF([f]);estado(f.nombre+' agregado.')}
$('bPJ').onclick=()=>agregar('pj');
$('bCR').onclick=()=>agregar('criatura');
const elegida=()=>{const f=ficha(sel);if(!f)aviso('Primero tocá una ficha para elegirla.');else aviso('',true);return f};
$('bDel').onclick=()=>{const f=elegida();if(!f||!confirm('¿Quitar a '+f.nombre+' del tablero?'))return;
 S.fichas=S.fichas.filter(x=>x.id!==f.id);sel=null;pintarFichas();pintarHl();
 if(modo==='dm')op(sb.from('tablero_fichas').delete().eq('id',f.id));else guardarLocal();estado(ayuda())};
$('bRen').onclick=()=>{const f=elegida();if(!f)return;const n=prompt('Nombre de la ficha',f.nombre);if(n===null||!n.trim())return;f.nombre=n.trim().slice(0,30);pintarFichas();persistirF([f])};
$('bTam').onclick=()=>{const f=elegida();if(!f)return;const c0=centroFicha(f);f.tam=f.tam===1?2:1;const c=celdaEn(c0.x,c0.y,f);f.a=c.a;f.b=c.b;pintarFichas();pintarHl();persistirF([f]);estado(f.nombre+': tamaño '+(f.tam===1?'normal':'grande')+'.')};
$('bVis').onclick=()=>{const f=elegida();if(!f)return;f.vis=f.vis===false;pintarFichas();persistirF([f]);estado(f.nombre+(f.vis===false?' quedó oculta para los jugadores.':' ahora la ven los jugadores.'))};
// una ficha por cada jugador con personaje activo (con su retrato y su nombre)
$('bJugs').onclick=async()=>{
 const[pr,fi]=await Promise.all([sb.from('profiles').select('id,username,nombre,is_dm,es_actual,borrado_en'),sb.from('fichas').select('user_id,datos')]);
 if(pr.error){aviso(pr.error.message);return}
 const nom={};(fi.data||[]).forEach(x=>{nom[x.user_id]=((x.datos||{}).nombre||'').trim()});
 const ya=new Set(S.fichas.filter(f=>f.jugador).map(f=>f.jugador)),ocup=ocupadas(),c0=centroVista(),nuevas=[];
 (pr.data||[]).filter(p=>!p.is_dm&&p.es_actual!==false&&!p.borrado_en&&!ya.has(p.id)).forEach(p=>{
  const c=celdaLibre(c0,ocup);
  nuevas.push(normFicha({id:nuevoId(),tipo:'pj',nombre:(nom[p.id]||p.nombre||p.username).slice(0,30),em:'🧙',imagen:sb.storage.from('retratos').getPublicUrl(p.id+'.jpg').data.publicUrl,a:c.a,b:c.b,jugador:p.id}))});
 if(!nuevas.length){aviso('Todos los jugadores ya tienen su ficha en el tablero.',true);return}
 if(S.fichas.length+nuevas.length>60){aviso('Se pasaría de 60 fichas.');return}
 aviso('',true);S.fichas.push(...nuevas);pintarFichas();persistirF(nuevas);estado('Se agregaron '+nuevas.length+' ficha'+(nuevas.length==1?'':'s')+' de jugadores.')};
// criatura del bestiario (con su foto)
function opcionesCR(){const q=$('crQ').value.trim().toLowerCase(),v=$('crSel').value;
 $('crSel').innerHTML=CRS.filter(c=>!q||c.nombre.toLowerCase().includes(q)).map(c=>'<option value="'+c.id+'">'+esc(c.nombre)+' · '+esc(c.tipo)+'</option>').join('')||'<option value="">(sin resultados)</option>';
 if([...$('crSel').options].some(o=>o.value===v))$('crSel').value=v}
$('crQ').oninput=opcionesCR;
$('bCrB').onclick=()=>{const c=CRS.find(x=>String(x.id)===$('crSel').value);if(!c){aviso('Elegí una criatura de la lista.');return}
 if(S.fichas.length>=60){aviso('Máximo 60 fichas.');return}
 const n=S.fichas.filter(f=>f.cid===c.id).length,p=celdaLibre(centroVista(),ocupadas());
 const f=normFicha({id:nuevoId(),tipo:'criatura',nombre:(c.nombre+(n?' '+(n+1):'')).slice(0,30),em:'👹',imagen:c.imagen||'',a:p.a,b:p.b,cid:c.id});
 S.fichas.push(f);sel=f.id;aviso('',true);pintarFichas();pintarHl();persistirF([f]);estado(f.nombre+' agregada.')};
$('zMas').onclick=()=>{const r=rect();zoomEn(r.left+r.width/2,r.top+r.height/2,1.3)};
$('zMenos').onclick=()=>{const r=rect();zoomEn(r.left+r.width/2,r.top+r.height/2,1/1.3)};
$('zFit').onclick=encajar;
if(vista.requestFullscreen)$('bFs').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else vista.requestFullscreen()};
else $('bFs').style.display='none';
document.addEventListener('fullscreenchange',()=>setTimeout(encajar,120));
window.addEventListener('resize',()=>{if(!G)encajar()});

/* ---------- arranque ---------- */
(async()=>{
 const p=await cabecera('Tablero');if(!p)return;
 const r=await sb.rpc('tablero_ver');
 if(r.error){
  if(/tablero_ver|PGRST202|could not find|does not exist/i.test(r.error.message||'')){modo='local';cargarLocal();aviso('Modo local: para compartir el tablero con los jugadores corré setup_tablero.sql en Supabase.',true)}
  else{aviso(r.error.message);return}}
 else modo=r.data.dir?'dm':'jug';
 document.body.classList.add('m-'+modo);
 if(modo==='local'||modo==='dm'){
  $('panel').style.display='block';
  if(modo==='dm'){S=DEF();S.fichas=[];sb.from('criaturas').select('id,nombre,tipo,imagen').order('nombre').then(x=>{CRS=x.data||[];opcionesCR()})}}
 else $('panel').style.display='none';
 if(modo==='local'){
  estado(ayuda());
  if(S.bg.tipo&&S.bg.url)ponerBg(S.bg.tipo,S.bg.url,{save:false});
  else{S.bg={tipo:'',url:''};despuesDelFondo(false)}
  return}
 ULT=JSON.stringify(r.data);aplicar(r.data);estado(ayuda());
 if($('vista').style.display!=='none')encajar();
 rtIniciar('tablero',()=>ver());
 setInterval(()=>{if(rtTocaPoll(8))ver()},4000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)ver(true)});
})();
})();
