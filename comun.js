// Funciones compartidas por varias páginas (no tocar los nombres)
// Las distancias se guardan en pies ("30 ft") y se muestran en la unidad elegida arriba (pies o metros).
function convUni(t,dest){return String(t??'').replace(/(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)[\s-]*(metros?|m|ft|feet|foot|pies)(\.?)(?![A-Za-zÀ-ÿ])/gi,(a,nums,u,pt,off,s)=>{
 const origen=/^m/i.test(u)?'m':'ft';if(origen==dest&&dest=='m')return a;
 const c=nums.split('/').map(x=>{if(origen==dest)return x.trim();const n=parseFloat(x.replace(',','.'));return dest=='ft'?String(Math.round(n/0.3)):String(Math.round(n*3)/10).replace('.',',')});
 const sig=s.slice(off+a.length).trimStart()[0],punto=(/^ft$/i.test(u)&&pt)?((!sig||/[A-ZÁÉÍÓÚÑ]/.test(sig))?'.':''):pt;
 return c.join('/')+' '+(dest=='ft'?'pies':'m')+punto})}
const uni=t=>convUni(t,getU()),aPies=t=>convUni(t,'ft');
const md=s=>Math.floor((s-10)/2),sgn=n=>(n>=0?'+':'')+n;
const AB=[['fue','Fuerza'],['des','Destreza'],['con','Constitución'],['int','Inteligencia'],['sab','Sabiduría'],['car','Carisma']];
const HAB=[['Acrobacias','des'],['Arcanos','int'],['Atletismo','fue'],['Engaño','car'],['Historia','int'],['Interpretación','car'],['Intimidación','car'],['Investigación','int'],['Juego de manos','des'],['Medicina','sab'],['Naturaleza','int'],['Percepción','sab'],['Perspicacia','sab'],['Persuasión','car'],['Religión','int'],['Sigilo','des'],['Supervivencia','sab'],['Trato con animales','sab']];
const CATN={armas:'Armas',armaduras:'Armaduras',escudos:'Escudos',consumibles:'Consumibles',accesorios:'Accesorios',pergaminos:'Pergaminos',valiosos:'Objetos valiosos'};
const RARN={comun:'Común',infrecuente:'Infrecuente',rara:'Rara',epica:'Épica',legendaria:'Legendaria'};

function resumenItem(d){d=d||{};const p=[];
 if(d.dano)p.push(d.dano+' '+(d.tipoDano||''));
 if(d.armCA)p.push('CA '+d.armCA);
 if((d.props||[]).length)p.push(d.props.join(', '));
 return p.join(' · ')}

function tarjetaItem(i){const d=i.datos||{};
 const ln=(t,v)=>v?'<p><b>'+t+':</b> '+esc(uni(v))+'</p>':'';
 const gr=(t,a)=>(a&&a.length)?'<h4>'+t+'</h4>'+a.map(e=>'<p><b><i>'+esc(e.n)+'.</i></b> '+esc(uni(e.t))+'</p>').join(''):'';
 let x='';
 if(d.dano)x+=ln('Daño',d.dano+' '+(d.tipoDano||'')+(d.versatil?' (versátil: '+d.versatil+')':''));
 x+=ln('Competencia',[d.comp,d.tipoArma].filter(Boolean).join(' · '))+ln('Propiedades',(d.props||[]).join(', '))+ln('Alcance',d.alcance)+ln('Maestría',d.maestria);
 x+=ln('Tipo de armadura',d.armTipo)+ln('CA',d.armCA)+ln('Requisito de Fuerza',d.armFue)+(d.armSig?'<p><b>Desventaja en Sigilo</b></p>':'');
 x+=ln('Peso',d.peso)+(i.precio!=null&&i.precio!==''?ln('Valor',i.precio+' po'):'');
 return '<div class="sb">'+(i.imagen?'<img class="foto-cr" src="'+esc(i.imagen)+'" alt="">':'')+
  '<p><i>'+esc(CATN[d.cat]||'')+(d.cat?' · ':'')+esc(RARN[i.rareza]||'')+(d.sint?' · requiere sintonización':'')+'</i></p>'+
  (i.descripcion?'<p style="white-space:pre-wrap">'+esc(uni(i.descripcion))+'</p>':'')+x+
  gr('Pasivas',d.pasivas)+gr('Acción',d.accion)+gr('Acción adicional',d.adicional)+gr('Reacción',d.reaccion)+gr('Multiataque',d.multi)+'<div style="clear:both"></div></div>'}

// ---- Combate: sangre sobre las fotos ----
const etapaSangre=p=>p<=0?4:p<=25?3:p<=50?2:p<=75?1:0;
// Manchas de sangre sobre una foto (0 = limpia ... 4 = tachada). Se dibuja dentro de un <svg viewBox="0 0 100 120" preserveAspectRatio="none">
function sangreSvg(s){if(!s)return'';const R='#a30f17',D='#7a0a10';let o='';
 if(s>=1)o+=[[22,30,3.2],[70,22,2.4],[48,68,3.6],[80,88,2.6]].map(a=>'<circle cx="'+a[0]+'" cy="'+a[1]+'" r="'+a[2]+'" fill="'+R+'" opacity=".85"/>').join('');
 if(s>=2)o+=[[12,50],[35,16],[60,45],[86,60],[28,90],[64,100],[90,15]].map(a=>'<path d="M'+a[0]+' '+a[1]+' q-3 7 0 11 q3 -4 0 -11z" fill="'+R+'"/><circle cx="'+a[0]+'" cy="'+(a[1]+13)+'" r="2.6" fill="'+R+'"/>').join('');
 if(s>=3){o+='<rect x="0" y="0" width="100" height="12" fill="'+D+'" opacity=".92"/>';
  o+=[[4,60,7],[16,95,6],[28,42,8],[43,80,6],[56,52,8],[70,105,6],[82,68,8],[94,45,6]].map(a=>'<rect x="'+a[0]+'" y="0" width="'+a[2]+'" height="'+a[1]+'" rx="'+a[2]/2+'" fill="'+D+'" opacity=".92"/><circle cx="'+(a[0]+a[2]/2)+'" cy="'+a[1]+'" r="'+a[2]*.75+'" fill="'+D+'" opacity=".92"/>').join('')}
 if(s>=4)o+='<rect width="100" height="120" fill="#000" opacity=".25"/><path d="M12 14 L88 106 M88 14 L12 106" stroke="#8b0000" stroke-width="10" stroke-linecap="round"/><path d="M12 14 L88 106 M88 14 L12 106" stroke="#d11a24" stroke-width="5" stroke-linecap="round"/>';
 return o}

// ---- Ficha de criatura (la usan dm-criaturas y combate) ----
// o.rev = Set de claves reveladas a los jugadores: si viene, se dibujan los casilleros del bestiario (solo DM)
const pbVD=v=>{const p=String(v||'0').split('/'),n=p.length>1?p[0]/p[1]:+p[0];return n<5?2:n<9?3:n<13?4:n<17?5:n<21?6:n<25?7:n<29?8:9};
function bloque(c,o){o=o||{};const R=o.rev||null,d=c.datos||{},car=d.car||{},pb=pbVD(d.vd),m=k=>md(car[k]??10);
 const ini=d.ini!=null&&d.ini!==''?+d.ini:m('des');
 const cb=k=>R?'<input type="checkbox" class="rv" data-c="'+c.id+'" data-k="'+esc(k)+'"'+(R.has(k)?' checked':'')+' onchange="revTog(this)" title="Que lo vean los jugadores"> ':'';
 const tabla='<table class="tb2"><tr>'+AB.map(([k])=>'<th>'+k.toUpperCase()+'</th>').join('')+'</tr><tr>'+AB.map(([k])=>'<td>'+(car[k]??10)+'<br>'+sgn(m(k))+(R?'<br>'+cb('car.'+k):'')+'</td>').join('')+'</tr><tr>'+AB.map(([k])=>'<td><small>Salv.</small><br>'+sgn(m(k)+((d.salv||{})[k]?pb:0))+(R?'<br>'+cb('salv.'+k):'')+'</td>').join('')+'</tr></table>';
 const hl=HAB.map(([n,a],i)=>[n,a,(d.hab||[])[i]||0,i]).filter(x=>x[2]),ht=x=>x[0]+' '+sgn(m(x[1])+pb*x[2]);
 const habs=!hl.length?'':R?'<p><b>Habilidades</b></p>'+hl.map(x=>'<div>'+cb('hab.'+x[3])+esc(ht(x))+'</div>').join(''):'<p><b>Habilidades</b> '+esc(hl.map(ht).join(', '))+'</p>';
 const ln=(t,v,k)=>v?'<p>'+(k?cb(k):'')+'<b>'+t+'</b> '+esc(uni(v))+'</p>':'';
 const gr=(t,a,g)=>(a&&a.length)?'<h4>'+t+'</h4>'+a.map(e=>'<p>'+cb(g+'|'+e.n)+'<b><i>'+esc(e.n)+'.</i></b> '+esc(uni(e.t))+'</p>').join(''):'';
 const top=R?'<div class="revtop"><label>'+cb('u')+'<b>Desbloqueada</b> (aparece en el Bestiario con su nombre y foto)</label><br><button onclick="revBulk('+c.id+',\'todo\')">Revelar todo</button> <button onclick="revBulk('+c.id+',\'basico\')">Solo lo básico</button> <button onclick="revBulk('+c.id+',\'nada\')">Ocultar todo</button><br><small>Tildá lo que los jugadores pueden ver. Las notas del DM nunca se muestran.</small></div>':'';
 return '<div class="sb">'+top+(c.imagen?'<img class="foto-cr" src="'+esc(c.imagen)+'" alt="">':'')+
  '<p>'+cb('tipo')+'<i>'+esc(d.tamano||'')+' '+esc(c.tipo)+(d.alin?', '+esc(d.alin):'')+'</i></p>'+(d.desc?'<p style="white-space:pre-wrap">'+cb('desc')+esc(uni(d.desc))+'</p>':'')+
  '<p>'+cb('ca')+'<b>CA</b> '+esc(d.ca)+(d.caNota?' ('+esc(d.caNota)+')':'')+' &nbsp; '+cb('ini')+'<b>Iniciativa</b> '+sgn(ini)+' ('+(10+ini)+')</p><p>'+cb('pg')+'<b>PG</b> '+esc(d.pg)+(d.dados?' ('+esc(d.dados)+')':'')+'</p>'+
  ln('Velocidad',d.vel,'vel')+tabla+habs+ln('Vulnerabilidades',d.vul,'vul')+ln('Resistencias',d.res,'res')+ln('Inmunidades a daño',d.inmD,'inmD')+ln('Inmunidades a estados',d.inmE,'inmE')+ln('Sentidos',d.sentidos,'sentidos')+ln('Idiomas',d.idiomas,'idiomas')+
  '<p>'+cb('vd')+'<b>VD</b> '+esc(d.vd)+' (bonificador de competencia +'+pb+')</p>'+
  gr('Rasgos',d.rasgos,'rasgos')+gr('Acciones',d.acciones,'acciones')+gr('Acciones adicionales',d.adicionales,'adicionales')+gr('Reacciones',d.reacciones,'reacciones')+gr('Acciones legendarias',d.legendarias,'legendarias')+
  (d.notas&&notaMia(c)?'<h4>Notas del DM</h4><p style="white-space:pre-wrap">'+esc(uni(d.notas))+'</p>':'')+'<div style="clear:both"></div></div>'}

// ---- Bestiario revelable: qué ve cada jugador de una criatura ----
// revelado = {u:true (desbloqueada), k:[claves]}. Claves: tipo, desc, ca, ini, pg, vel, vd, vul, res, inmD, inmE, sentidos, idiomas,
// car.fue…, salv.fue…, hab.<n>, y "rasgos|Nombre" (también acciones, adicionales, reacciones, legendarias).
// Cada página que usa los casilleros define revGet(id) (devuelve la criatura) y revRedraw(id) (vuelve a dibujar la ficha).
const REVG=['rasgos','acciones','adicionales','reacciones','legendarias'];
function revSet(c){const r=c.revelado||{},s=new Set(r.k||[]);if(r.u)s.add('u');return s}
function revClaves(c){const d=c.datos||{},k=['tipo','ca','ini','pg'];if(d.desc)k.push('desc');
 ['vel','vd','vul','res','inmD','inmE','sentidos','idiomas'].forEach(x=>{if(d[x])k.push(x)});
 AB.forEach(([a])=>k.push('car.'+a,'salv.'+a));(d.hab||[]).forEach((v,i)=>{if(v)k.push('hab.'+i)});
 REVG.forEach(g=>(d[g]||[]).forEach(e=>k.push(g+'|'+e.n)));return k}
async function revGuardar(c){const{error}=await sb.from('criaturas').update({revelado:c.revelado}).eq('id',c.id);
 const m=document.getElementById('msg');if(m)m.textContent=error?error.message:'';return error}
async function revTog(el){const c=revGet(+el.dataset.c);if(!c)return;const k=el.dataset.k,r=c.revelado=c.revelado||{};
 if(k=='u')r.u=el.checked;else{const s=new Set(r.k||[]);if(el.checked)s.add(k);else s.delete(k);r.k=[...s]}
 if(await revGuardar(c))el.checked=!el.checked}
async function revBulk(id,modo){const c=revGet(id);if(!c)return;
 c.revelado=modo=='todo'?{u:true,k:revClaves(c)}:modo=='basico'?{u:true,k:['tipo']}:{u:false,k:[]};
 await revGuardar(c);revRedraw(id)}
// Lo que ve un jugador (viene filtrado desde el servidor): lo que falta se muestra como ???
function bloqueJ(f){const Q='<span class="qq">???</span>',has=k=>Object.prototype.hasOwnProperty.call(f,k),car=f.car||{},salv=f.salv||{},hab=f.hab||{},oc=f.oc||{};
 const val=(k,fn)=>has(k)?(f[k]===null||f[k]===''?'—':esc(uni(fn?fn(f[k]):String(f[k])))):Q;
 const ln=(t,k)=>'<p><b>'+t+'</b> '+val(k)+'</p>';
 const tabla='<table class="tb2"><tr>'+AB.map(([k])=>'<th>'+k.toUpperCase()+'</th>').join('')+'</tr><tr>'+AB.map(([k])=>'<td>'+(k in car?car[k]+'<br>'+sgn(md(car[k])):Q)+'</td>').join('')+'</tr><tr>'+AB.map(([k])=>'<td><small>Salv.</small><br>'+(k in salv?sgn(salv[k]):Q)+'</td>').join('')+'</tr></table>';
 const hl=Object.keys(hab).map(i=>esc(HAB[i][0]+' '+sgn(hab[i]))).concat(f.habOc>0?[Q]:[]);
 const gr=(t,g)=>{const a=f[g]||[];return(a.length||oc[g])?'<h4>'+t+'</h4>'+a.map(e=>'<p><b><i>'+esc(e.n)+'.</i></b> '+esc(uni(e.t||''))+'</p>').join('')+(oc[g]?'<p><b><i>'+Q+'.</i></b> '+Q+'</p>':''):''};
 return '<div class="sb">'+(f.imagen?'<img class="foto-cr" src="'+esc(f.imagen)+'" alt="">':'')+
  '<p><i>'+(has('tipo')?esc((f.tamano||'')+' '+f.tipo+(f.alin?', '+f.alin:'')):Q)+'</i></p>'+(f.desc?'<p style="white-space:pre-wrap">'+esc(uni(f.desc))+'</p>':'')+
  '<p><b>CA</b> '+(has('ca')?esc(f.ca)+(f.caNota?' ('+esc(f.caNota)+')':''):Q)+' &nbsp; <b>Iniciativa</b> '+(has('ini')?sgn(f.ini)+' ('+(10+f.ini)+')':Q)+'</p>'+
  '<p><b>PG</b> '+(has('pg')?esc(f.pg)+(f.dados?' ('+esc(f.dados)+')':''):Q)+'</p>'+ln('Velocidad','vel')+tabla+
  (hl.length?'<p><b>Habilidades</b> '+hl.join(', ')+'</p>':'')+ln('Vulnerabilidades','vul')+ln('Resistencias','res')+ln('Inmunidades a daño','inmD')+ln('Inmunidades a estados','inmE')+ln('Sentidos','sentidos')+ln('Idiomas','idiomas')+
  '<p><b>VD</b> '+(has('vd')?esc(f.vd)+' (bonificador de competencia +'+pbVD(f.vd)+')':Q)+'</p>'+
  gr('Rasgos','rasgos')+gr('Acciones','acciones')+gr('Acciones adicionales','adicionales')+gr('Reacciones','reacciones')+gr('Acciones legendarias','legendarias')+'<div style="clear:both"></div></div>'}

// ---- Ficha de jugador, con el mismo formato que la de las criaturas (la usa combate) ----
function bloquePJ(f,o){o=o||{};
 const d=f.datos||{},car=d.car||{},salv=d.salv||{},hab=d.hab||[],nv=Math.max(1,Math.min(20,parseInt(d.nivel)||1)),pb=Math.ceil(nv/4)+1,m=k=>md(car[k]??10);
 const tabla='<table class="tb2"><tr>'+AB.map(([k])=>'<th>'+k.toUpperCase()+'</th>').join('')+'</tr><tr>'+AB.map(([k])=>'<td>'+(car[k]??10)+'<br>'+sgn(m(k))+'</td>').join('')+'</tr><tr>'+AB.map(([k])=>'<td><small>Salv.'+(salv[k]?' ●':'')+'</small><br>'+sgn(m(k)+(salv[k]?pb:0))+'</td>').join('')+'</tr></table>';
 const habs=HAB.map(([n,a],i)=>[n,a,hab[i]||0]).filter(x=>x[2]).map(x=>x[0]+' '+sgn(m(x[1])+pb*x[2])+(x[2]==2?' ◆':' ●')).join(', ');
 const perc=10+m('sab')+pb*(hab[11]||0);
 const ln=(t,v)=>v?'<p><b>'+t+'</b> '+esc(uni(String(v)))+'</p>':'';
 const lim=a=>(a||[]).filter(e=>(e.n||'').trim()||(e.t||'').trim());
 const gr=(t,a)=>{a=lim(a);return a.length?'<h4>'+t+'</h4>'+a.map(e=>'<p><b><i>'+esc(e.n||'(sin nombre)')+'.</i></b> '+esc(uni(e.t||''))+'</p>').join(''):''};
 const cab=[(d.clase||'')+(d.sub?' ('+d.sub+')':'')+' nivel '+nv,d.esp,d.tras,d.ali].filter(Boolean).map(esc).join(' · ');
 let cj='';
 if(d.conj){const ab=AB.find(x=>x[0]==d.conj),pre=(d.conjuros||[]).filter(x=>x.prep).sort((x,y)=>x.nv-y.nv||String(x.n).localeCompare(String(y.n),'es'));
  cj='<p><b>Conjuros</b> ('+esc(ab?ab[1]:'')+') CD '+(8+pb+m(d.conj))+' · Ataque '+sgn(pb+m(d.conj))+'</p>'+
   [...new Set(pre.map(x=>x.nv))].map(n=>'<p><b>'+(n==0?'Trucos':'Nivel '+n)+':</b> '+pre.filter(x=>x.nv==n).map(x=>esc(x.n)).join(', ')+'</p>').join('')}
 const usos=(d.cmb||[]).filter(x=>(x.n||'').trim()).map(x=>esc(x.n)+' '+x.act+'/'+x.max).join(' · ');
 return '<div class="sb">'+(o.img?'<img class="foto-cr" src="'+esc(o.img)+'" alt="" onerror="this.style.display=\'none\'">':'')+
  '<p><i>'+cab+'</i></p>'+
  '<p><b>CA</b> '+esc(d.ca||'—')+' &nbsp; <b>Iniciativa</b> '+sgn(m('des'))+' ('+(10+m('des'))+')</p>'+
  '<p><b>PG</b> '+f.hp+'/'+f.hp_max+(f.hp_temp?' (+'+f.hp_temp+' temporales)':'')+'</p>'+
  ln('Velocidad',d.vel)+tabla+ln('Habilidades',habs)+ln('Percepción pasiva',perc)+ln('Idiomas',d.idiomas)+
  '<p><b>Bonificador de competencia</b> +'+pb+'</p>'+cj+(usos?'<p><b>Usos y espacios</b> '+usos+'</p>':'')+
  gr('Rasgos de especie',d.rasgosEsp)+gr('Dotes',d.dotes)+gr('Rasgos de clase',d.rasgosClase)+gr('Rasgos de subclase',d.rasgosSub)+
  (o.notas&&d.notas?'<h4>Notas del jugador</h4><p style="white-space:pre-wrap">'+esc(uni(d.notas))+'</p>':'')+'<div style="clear:both"></div></div>'}

// ===== Estados (condiciones) de D&D 2024 para el combate =====
// k = clave guardada en la base · ic = ícono · c = color del marco · r = resumen corto · d = descripción completa
const ESTADOS=[
 {k:'agarrado',n:'Agarrado',ic:'✊',c:'#a0522d',r:'Velocidad 0. Desventaja al atacar a quien no lo agarra.',d:'Velocidad 0 (no puede aumentar). Desventaja en tiradas de ataque contra objetivos distintos a quien lo agarra. Quien agarra puede arrastrarlo o cargarlo pagando 1 pie extra de movimiento por pie (salvo si es Diminuto o dos tamaños menor).'},
 {k:'apresado',n:'Apresado',ic:'⛓',c:'#8d6e63',r:'Velocidad 0. Ventaja en ataques contra él; desventaja en sus ataques y salvaciones de Destreza.',d:'Velocidad 0 (no puede aumentar). Ataques contra la criatura tienen ventaja; sus propios ataques tienen desventaja y tiene desventaja en salvaciones de Destreza.'},
 {k:'asustado',n:'Asustado',ic:'😱',c:'#8e44ad',r:'Desventaja en pruebas y ataques mientras vea la fuente del miedo; no puede acercarse a ella.',d:'Desventaja en pruebas de característica y tiradas de ataque mientras la fuente del miedo esté a la vista. No puede acercarse voluntariamente a la fuente.'},
 {k:'aturdido',n:'Aturdido',ic:'💫',c:'#f1c40f',r:'Incapacitado, no habla; ataques en su contra con ventaja.',d:'Está Incapacitado, no puede hablar y los ataques en su contra tienen ventaja.'},
 {k:'cegado',n:'Cegado',ic:'🙈',c:'#546e7a',r:'No ve. Ataques en su contra con ventaja; los suyos con desventaja.',d:'No puede ver; falla automáticamente pruebas de característica que requieran vista. Ataques en su contra tienen ventaja y sus ataques tienen desventaja.'},
 {k:'encantado',n:'Encantado',ic:'💘',c:'#ec407a',r:'No puede atacar ni dañar a quien lo encantó.',d:'No puede atacar ni elegir como objetivo de efectos dañinos o mágicos a quien lo encantó. Quien encantó tiene ventaja en pruebas de característica para interactuar socialmente.'},
 {k:'ensordecido',n:'Ensordecido',ic:'🔇',c:'#78909c',r:'No oye; falla pruebas que requieran oído.',d:'No puede oír; falla automáticamente pruebas de característica que requieran oído.'},
 {k:'envenenado',n:'Envenenado',ic:'🤢',c:'#2ecc40',r:'Desventaja en ataques y pruebas de característica.',d:'Tiene desventaja en tiradas de ataque y en pruebas de característica.'},
 {k:'agotado',n:'Agotado',ic:'😩',c:'#c19a3a',r:'',d:'Tiene hasta 6 niveles acumulados. Por cada nivel, resta -2 a todas las pruebas con d20 (pruebas de característica, ataques y salvaciones) y reduce su velocidad en 5 pies. Al llegar al nivel 6, la criatura muere. Un descanso largo reduce el nivel en 1.'},
 {k:'incapacitado',n:'Incapacitado',ic:'🚫',c:'#7f8c8d',r:'Sin acciones ni reacciones; pierde la concentración; desventaja en iniciativa.',d:'No puede realizar ninguna acción, acción adicional ni reacción. Pierde la concentración, no puede hablar y tiene desventaja en iniciativa.'},
 {k:'inconsciente',n:'Inconsciente',ic:'💤',c:'#3949ab',r:'Incapacitado y derribado, velocidad 0. Ataques con ventaja; cuerpo a cuerpo a 5 pies o menos son críticos.',d:'Está Incapacitado y Derribado, suelta lo que sostiene y su velocidad es 0. Falla automáticamente salvaciones de Fuerza y Destreza; los ataques contra ella tienen ventaja (y si impactan a 5 pies o menos, son críticos).'},
 {k:'invisible',n:'Invisible',ic:'👻',c:'#81d4fa',r:'Ataques en su contra con desventaja; los suyos con ventaja.',d:'Tiene ventaja en iniciativa. No le afectan efectos que requieran ver al objetivo (salvo excepciones), su equipo se oculta con ella, los ataques contra ella tienen desventaja y sus propios ataques tienen ventaja.'},
 {k:'paralizado',n:'Paralizado',ic:'🧊',c:'#00e5ff',r:'Incapacitado, velocidad 0. Ataques con ventaja; cuerpo a cuerpo a 5 pies o menos son críticos.',d:'Está Incapacitado y su velocidad es 0. Falla automáticamente salvaciones de Fuerza y Destreza; ataques contra ella tienen ventaja y los impactos cuerpo a cuerpo a 5 pies o menos son críticos.'},
 {k:'petrificado',n:'Petrificado',ic:'🗿',c:'#9e9e9e',r:'Convertido en piedra: incapacitado, inmóvil, resistente a todo daño. Ataques en su contra con ventaja.',d:'Se transforma (junto con su equipo no mágico) en una sustancia sólida inanimada (generalmente piedra), gana resistencia a todo daño y es inmune a veneno. Está Incapacitado, no puede moverse ni hablar, y los ataques en su contra tienen ventaja.'},
 {k:'derribado',n:'Derribado',ic:'🛌',c:'#a1887f',r:'Solo se arrastra. Desventaja al atacar; cuerpo a cuerpo a 5 pies o menos en su contra con ventaja, a más distancia con desventaja.',d:'Solo puede moverse arrastrándose (a menos que se ponga en pie gastando movimiento). Tiene desventaja en tiradas de ataque. Los ataques cuerpo a cuerpo contra ella a 5 pies o menos tienen ventaja; los ataques a más de 5 pies tienen desventaja.'}
];
const ESTK=Object.fromEntries(ESTADOS.map(e=>[e.k,e]));
// Estados que traen otros incluidos (se muestran como "heredados", no hace falta tildarlos)
const ESTINC={aturdido:['incapacitado'],inconsciente:['incapacitado','derribado'],paralizado:['incapacitado'],petrificado:['incapacitado']};
// {dir: estados aplicados, der: claves heredadas que no están aplicadas}
function estEfec(est){const dir=(est||[]).filter(e=>e&&ESTK[e.k]),set=new Set(dir.map(e=>e.k)),der=[];
 dir.forEach(e=>(ESTINC[e.k]||[]).forEach(h=>{if(!set.has(h)&&!der.includes(h))der.push(h)}));return{dir,der}}
function estLista(est){const E=estEfec(est);return E.dir.concat(E.der.map(k=>({k})))}
function estResumen(e){const s=ESTK[e.k];if(!s)return '';
 if(e.k=='agotado'){const n=Math.max(1,Math.min(6,parseInt(e.n)||1));return '−'+2*n+' a toda tirada de d20 y −'+5*n+' pies de velocidad'+(n>=6?' (¡muere!)':'')}
 return s.r}

// ===== Sub-DM: autor, compartir y filtro (Etapa B) =====
// Cada página DM asigna YO=<perfil> y define refiltrarDM() y recargarDM(). Sin setup_subdm_b.sql nada de esto aparece.
let YO=null,_NDM={};
const _cuenta=()=>YO&&(YO.cuenta_id||YO.id);
const esMio=x=>!x||!YO||!('creador' in x)||!x.creador||x.creador===_cuenta();
const puedeEd=x=>esMio(x)||!!(YO&&YO.is_dm&&x.compartido);
const notaMia=c=>esMio(c)||!!(YO&&YO.espia);
const filtroDM=()=>{try{return localStorage.getItem('fdm')||'todos'}catch(e){return 'todos'}};
const pasaF=x=>{if(!x||!('creador' in x))return true;const f=filtroDM();return f=='todos'||(f=='mios'?esMio(x):!esMio(x))};
async function cargarNombresDM(){const{data}=await sb.from('profiles').select('cuenta_id,username');_NDM={};(data||[]).forEach(r=>{if(!_NDM[r.cuenta_id])_NDM[r.cuenta_id]=r.username})}
function chipDM(tab,x){if(!x||!('creador' in x))return '';
 if(esMio(x))return '<div class="chipdm"><button onclick="compartirDM(\''+tab+'\','+x.id+','+!x.compartido+')" title="Tocá para cambiarlo">'+(x.compartido?'👥 Compartido con los DM':'🔒 Privado')+'</button></div>';
 return '<div class="chipdm">'+(x.compartido?'🎭 De <b>'+esc(_NDM[x.creador]||'otro DM')+'</b> (compartido)':'🕵 De <b>'+esc(_NDM[x.creador]||'otro DM')+'</b> · privado (solo lectura)')+'</div>'}
function selFiltroDM(){const f=filtroDM();return '<select id="fdm" onchange="try{localStorage.setItem(\'fdm\',this.value)}catch(e){}refiltrarDM()">'+[['todos','👥 Todo lo que veo'],['mios','🙋 Solo lo mío'],['otros','🎭 Solo de otros DM']].map(([k,t])=>'<option value="'+k+'"'+(f==k?' selected':'')+'>'+t+'</option>').join('')+'</select>'}
async function compartirDM(tab,id,on){const{error}=await sb.from(tab).update({compartido:on}).eq('id',id);const m=document.getElementById('msg');if(m)m.textContent=error?error.message:'';recargarDM()}
