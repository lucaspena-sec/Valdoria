// Tablero (fase 1): cuadrícula hexagonal o cuadrada, fondo (foto, GIF o video) y fichas que se mueven.
// Todo es local (se guarda en este dispositivo), sin SQL. Necesita app.js cargado ANTES (usa cabecera y getU).
// Vive dentro de una función: no deja variables globales, así no choca con app.js ni comun.js.
(function(){
'use strict';
const $=id=>document.getElementById(id);
const R3=Math.sqrt(3),KEY='valdoriaTablero1',MIN_K=.05,MAX_K=6;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const COL={pj:'#2e6fd8',criatura:'#c0392b'};
const EMO={pj:['🧙','🛡️','🏹','🗡️','🧝'],criatura:['🐺','👹','🐲','💀','🕷️']};
/* Estado: es lo único que se guarda. Las fichas viven en CELDAS (a,b), no en píxeles:
   así mañana se pueden mandar tal cual a la base de datos. */
const DEF=()=>({forma:'hex',orient:'punta',size:56,ox:0,oy:0,ver:true,color:'#ffffff',alpha:.45,W:1400,H:1000,bg:{tipo:'',url:''},
 fichas:[{id:'f1',tipo:'pj',nombre:'Aria',em:'🧙',tam:1,a:2,b:2},{id:'f2',tipo:'criatura',nombre:'Lobo',em:'🐺',tam:1,a:5,b:3},{id:'f3',tipo:'criatura',nombre:'Troll',em:'👹',tam:2,a:7,b:5}]});
let S=DEF(),V={x:0,y:0,k:1},sel=null,G=null,blobUrl='',tG=null;
const P=new Map();
try{const j=JSON.parse(localStorage.getItem(KEY)||'null');
 if(j&&typeof j==='object'){const d=DEF();S={...d,...j,bg:{...d.bg,...(j.bg||{})}};
  if(!Array.isArray(S.fichas))S.fichas=d.fichas;
  S.fichas=S.fichas.filter(f=>f&&f.id).map(f=>({tipo:'criatura',nombre:'?',em:'❓',tam:1,a:0,b:0,...f,tam:f.tam==2?2:1}));
  S.size=clamp(+S.size||56,24,140);S.ox=clamp(+S.ox||0,-140,140);S.oy=clamp(+S.oy||0,-140,140);S.alpha=clamp(+S.alpha||.45,.05,1);
  if(S.forma!=='cuad')S.forma='hex';if(S.orient!=='plano')S.orient='punta';
  S.W=1400;S.H=1000}}catch(e){S=DEF()}

const aviso=(t,ok)=>{const m=$('msg');m.className=ok?'ok':'err';m.textContent=t||''};
const fmt=d=>{const ft=d*5;return getU()==='m'?(ft*.3).toFixed(1).replace(/,0$|\.0$/,'').replace('.',',')+' m':ft+' pies'};
const ficha=id=>S.fichas.find(f=>f.id===id);
const elF=id=>$('fichasEl').querySelector('[data-id="'+id+'"]');

/* ---------- matemática de la cuadrícula ---------- */
// centro de una celda en coordenadas de la cuadrícula (sin el desplazamiento)
function centroLocal(a,b){const s=S.size;
 if(S.forma==='hex')return S.orient==='punta'?{x:s*R3*(a+b/2),y:s*1.5*b}:{x:s*1.5*a,y:s*R3*(b+a/2)};
 return{x:(a+.5)*s,y:(b+.5)*s}}
function centroCelda(a,b){const c=centroLocal(a,b);return{x:c.x+S.ox,y:c.y+S.oy}}
// en cuadrícula cuadrada, las fichas de tamaño 2 (grandes) se apoyan en un vértice, no en el centro de una celda
const vertice=f=>S.forma==='cuad'&&f.tam===2;
const centroFicha=f=>vertice(f)?{x:f.a*S.size+S.ox,y:f.b*S.size+S.oy}:centroCelda(f.a,f.b);
function hexRedondo(q,r){const x=q,z=r,y=-x-z;let rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);
 const dx=Math.abs(rx-x),dy=Math.abs(ry-y),dz=Math.abs(rz-z);
 if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;
 return{a:rx,b:rz}}
// de un punto del mundo (px) a la celda que lo contiene
function celdaEn(x,y,f){const s=S.size,lx=x-S.ox,ly=y-S.oy;
 if(S.forma==='hex')return S.orient==='punta'?hexRedondo((R3/3*lx-ly/3)/s,(2/3*ly)/s):hexRedondo((2/3*lx)/s,(-lx/3+R3/3*ly)/s);
 if(f&&vertice(f))return{a:Math.round(lx/s),b:Math.round(ly/s)};
 return{a:Math.floor(lx/s),b:Math.floor(ly/s)}}
function distancia(c1,c2){const da=c2.a-c1.a,db=c2.b-c1.b;
 return S.forma==='hex'?(Math.abs(da)+Math.abs(da+db)+Math.abs(db))/2:Math.max(Math.abs(da),Math.abs(db))}
// vértices de una celda, en coordenadas de la cuadrícula
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
  nm.textContent=f.nombre;nm.style.fontSize=Math.max(9,S.size*.22)+'px';
  el.classList.toggle('sel',f.id===sel)});
 [...box.children].forEach(el=>{if(!vivas.has(el.dataset.id))el.remove()})}
function syncUI(){
 $('bForma').textContent=S.forma==='hex'?'⬡ Hexágonos (tocá para cuadrados)':'▦ Cuadrados (tocá para hexágonos)';
 $('bOri').style.display=S.forma==='hex'?'':'none';
 $('bOri').textContent=S.orient==='punta'?'△ Punta arriba (girar)':'▭ Lado plano arriba (girar)';
 $('verC').checked=S.ver;$('colC').value=S.color;$('sizeR').value=S.size;$('alR').value=Math.round(S.alpha*100);
 $('oxR').value=S.ox;$('oyR').value=S.oy;$('sizeL').textContent=S.size+' px = 5 pies'}
let tmG;function guardar(){clearTimeout(tmG);tmG=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify({forma:S.forma,orient:S.orient,size:S.size,ox:S.ox,oy:S.oy,ver:S.ver,color:S.color,alpha:S.alpha,bg:S.bg,fichas:S.fichas}))}catch(e){}},300)}
function todo(){dibujarGrid();pintarFichas();syncUI();guardar()}
// cambia forma u orientación sin que las fichas salten de lugar: se pasan de celda vieja a celda nueva por su posición real
function cambiarGrid(fn){
 const antes=S.fichas.map(f=>({f,c:centroFicha(f)}));
 fn();antes.forEach(o=>{const c=celdaEn(o.c.x,o.c.y,o.f);o.f.a=c.a;o.f.b=c.b});todo()}

/* ---------- vista: zoom y arrastre del mapa ---------- */
const rect=()=>$('vista').getBoundingClientRect();
const aMundo=(cx,cy)=>{const r=rect();return{x:(cx-r.left-V.x)/V.k,y:(cy-r.top-V.y)/V.k}};
function aplicarV(){$('mundo').style.transform='translate('+V.x+'px,'+V.y+'px) scale('+V.k+')'}
function encajar(){const r=rect();V.k=clamp(Math.min(r.width/S.W,r.height/S.H),MIN_K,MAX_K);V.x=(r.width-S.W*V.k)/2;V.y=(r.height-S.H*V.k)/2;aplicarV()}
function zoomEn(cx,cy,f){const r=rect(),w=aMundo(cx,cy);V.k=clamp(V.k*f,MIN_K,MAX_K);V.x=cx-r.left-w.x*V.k;V.y=cy-r.top-w.y*V.k;aplicarV()}

/* ---------- mover fichas ---------- */
function estado(t){$('estado').textContent=t}
const AYUDA='Tocá una ficha para elegirla y después tocá la celda de destino (o arrastrala). Dos dedos o la rueda del mouse: zoom. Arrastrá el fondo para moverte.';
function mover(f,c){
 const d=distancia(f,c),box=$('fichasEl');
 box.classList.add('mov');clearTimeout(tG);tG=setTimeout(()=>box.classList.remove('mov'),300);
 f.a=c.a;f.b=c.b;sel=f.id;pintarFichas();pintarHl();guardar();
 estado(f.nombre+' se movió '+d+' celda'+(d==1?'':'s')+' ('+fmt(d)+').')}
function textoHover(c){const f=ficha(sel);let t='Celda '+c.a+', '+c.b;
 if(f)t+=' · 📏 '+distancia(f,c)+' celda'+(distancia(f,c)==1?'':'s')+' desde '+f.nombre+' ('+fmt(distancia(f,c))+')';return t}
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
 const el=e.target.closest('.ficha');
 if(el){const f=ficha(el.dataset.id),w=aMundo(e.clientX,e.clientY),c=centroFicha(f);
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
  if(!G.moved&&mv>6){G.moved=true;const el=elF(G.id);el.classList.add('drag')}
  if(G.moved){const w=aMundo(p.x,p.y),f=ficha(G.id),el=elF(G.id);
   G.px=w.x-G.dx;G.py=w.y-G.dy;el.style.left=G.px+'px';el.style.top=G.py+'px';
   const c=celdaEn(G.px,G.py,f);mostrarHh(c);
   const o={a:f.a,b:f.b},d=distancia(o,c);estado(f.nombre+': '+d+' celda'+(d==1?'':'s')+' ('+fmt(d)+')')}}});
function fin(e,cancel){
 if(!P.has(e.pointerId))return;P.delete(e.pointerId);
 if(!G)return;
 if(G.t==='pinch'){if(P.size<2)G=null;return}
 const g=G;G=null;
 if(g.t==='token'){const f=ficha(g.id),el=elF(g.id);if(!f||!el)return;
  if(g.moved){el.classList.remove('drag');mostrarHh(null);
   if(cancel)pintarFichas();else mover(f,celdaEn(g.px,g.py,f))}
  else if(!cancel){sel=sel===f.id?null:f.id;pintarFichas();pintarHl();estado(sel?f.nombre+' elegido. Tocá una celda para moverlo.':AYUDA)}}
 else if(g.t==='pan'&&!g.moved&&!cancel){
  const w=aMundo(e.clientX,e.clientY),f=ficha(sel);
  if(f&&w.x>=0&&w.y>=0&&w.x<=S.W&&w.y<=S.H)mover(f,celdaEn(w.x,w.y,f));
  else if(sel){sel=null;pintarFichas();pintarHl();estado(AYUDA)}}}
vista.addEventListener('pointerup',e=>fin(e,false));
vista.addEventListener('pointercancel',e=>fin(e,true));
vista.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!P.size)mostrarHh(null)});
vista.addEventListener('wheel',e=>{e.preventDefault();zoomEn(e.clientX,e.clientY,Math.exp(-e.deltaY*.0015))},{passive:false});

/* ---------- fondo (foto, GIF o video en bucle) ---------- */
function limpiarBg(){$('bgBox').innerHTML='';if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=''}}
function despuesDelFondo(){const m=$('mundo');m.style.width=S.W+'px';m.style.height=S.H+'px';encajar();todo()}
function ponerBg(tipo,url,persistir,esBlob){
 limpiarBg();if(esBlob)blobUrl=url;
 if(!tipo){S.bg={tipo:'',url:''};S.W=1400;S.H=1000;despuesDelFondo();return}
 const el=document.createElement(tipo==='video'?'video':'img');
 const listo=(w,h)=>{S.W=w||1400;S.H=h||1000;S.bg={tipo,url:persistir?url:''};despuesDelFondo()};
 el.onerror=()=>{limpiarBg();S.bg={tipo:'',url:''};S.W=1400;S.H=1000;despuesDelFondo();aviso('No se pudo cargar el fondo. Revisá que el archivo o la URL sean válidos (en videos, mejor mp4 o webm).')};
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
async function desdeArchivo(file){
 const esV=file.type.indexOf('video/')===0,esI=file.type.indexOf('image/')===0;
 if(!esV&&!esI){aviso('Elegí una foto, un GIF o un video.');return}
 const nota=' Los fondos de archivo no se guardan al recargar la página (en la fase 2 se suben al servidor).';
 try{
  if(esV){ponerBg('video',URL.createObjectURL(file),false,true);aviso('Video cargado ('+MB(file.size)+').'+(file.size>25e6?' Pesa bastante: para el celular conviene uno de pocos MB.':'')+nota,true);return}
  if(file.type==='image/gif'){ponerBg('image',URL.createObjectURL(file),false,true);aviso('GIF cargado ('+MB(file.size)+').'+(file.size>8e6?' Pesa mucho: puede ir lento en el celular. Un mp4 corto en bucle pesa mucho menos.':'')+nota,true);return}
  const b=await comprimir(file,2400);ponerBg('image',URL.createObjectURL(b),false,true);
  aviso('Foto achicada de '+MB(file.size)+' a '+MB(b.size)+' (máx. 2400 px).'+nota,true)}
 catch(e){aviso('No se pudo usar ese archivo: '+(e.message||e))}}
const tipoUrl=u=>/\.(mp4|webm|ogv|m4v|mov)(\?|#|$)/i.test(u)?'video':'image';

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
$('bUrl').onclick=()=>{const u=$('urlIn').value.trim();if(!/^https?:\/\//i.test(u)){aviso('Pegá una URL que empiece con http:// o https://');return}aviso('',true);ponerBg(tipoUrl(u),u,true,false)};
$('bQuitarBg').onclick=()=>{aviso('',true);ponerBg('','',false,false)};
function celdaLibreCerca(){const r=rect(),w=aMundo(r.left+r.width/2,r.top+r.height/2),c=celdaEn(w.x,w.y),ocup=new Set(S.fichas.map(f=>f.a+','+f.b));
 let i=0;while(ocup.has((c.a+i)+','+c.b))i++;return{a:c.a+i,b:c.b}}
function agregar(tipo){
 if(S.fichas.length>=40){aviso('Máximo 40 fichas.');return}
 const n=S.fichas.filter(f=>f.tipo===tipo).length,c=celdaLibreCerca();
 const f={id:'f'+Date.now().toString(36)+Math.floor(Math.random()*99),tipo,nombre:(tipo==='pj'?'PJ ':'Criatura ')+(n+1),em:EMO[tipo][n%EMO[tipo].length],tam:1,a:c.a,b:c.b};
 S.fichas.push(f);sel=f.id;aviso('',true);pintarFichas();pintarHl();guardar();estado(f.nombre+' agregado.')}
$('bPJ').onclick=()=>agregar('pj');
$('bCR').onclick=()=>agregar('criatura');
const elegida=()=>{const f=ficha(sel);if(!f)aviso('Primero tocá una ficha para elegirla.');else aviso('',true);return f};
$('bDel').onclick=()=>{const f=elegida();if(!f||!confirm('¿Quitar a '+f.nombre+' del tablero?'))return;S.fichas=S.fichas.filter(x=>x.id!==f.id);sel=null;pintarFichas();pintarHl();guardar();estado(AYUDA)};
$('bRen').onclick=()=>{const f=elegida();if(!f)return;const n=prompt('Nombre de la ficha',f.nombre);if(n===null||!n.trim())return;f.nombre=n.trim().slice(0,30);pintarFichas();guardar()};
$('bTam').onclick=()=>{const f=elegida();if(!f)return;const c0=centroFicha(f);f.tam=f.tam===1?2:1;const c=celdaEn(c0.x,c0.y,f);f.a=c.a;f.b=c.b;pintarFichas();pintarHl();guardar();estado(f.nombre+': tamaño '+(f.tam===1?'normal':'grande')+'.')};
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
 estado(AYUDA);
 if(S.bg.tipo&&S.bg.url)ponerBg(S.bg.tipo,S.bg.url,true,false);
 else{S.bg={tipo:'',url:''};$('mundo').style.width=S.W+'px';$('mundo').style.height=S.H+'px';encajar();todo()}
})();
})();
