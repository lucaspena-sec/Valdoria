// Funciones compartidas por varias páginas (no tocar los nombres)
// Las distancias se guardan en pies ("30 ft") y se muestran en la unidad elegida arriba (pies o metros).
function convUni(t,dest){return String(t??'').replace(/(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)[\s-]*(metros?|m|ft|feet|foot|pies)(\.?)(?![A-Za-zÀ-ÿ])/gi,(a,nums,u,pt,off,s)=>{
 const origen=/^m/i.test(u)?'m':'ft';if(origen==dest&&dest=='m')return a;
 const c=nums.split('/').map(x=>{if(origen==dest)return x.trim();const n=parseFloat(x.replace(',','.'));return dest=='ft'?String(Math.round(n/0.3)):String(Math.round(n*3)/10).replace('.',',')});
 const sig=s.slice(off+a.length).trimStart()[0],punto=(/^ft$/i.test(u)&&pt)?((!sig||/[A-ZÁÉÍÓÚÑ]/.test(sig))?'.':''):pt;
 return c.join('/')+' '+(dest=='ft'?'pies':'m')+punto})}
const uni=t=>convUni(t,getU()),aPies=t=>convUni(t,'ft');
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');
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

// Lee el texto de una ficha de criatura pegado (español o inglés) y devuelve {nombre,tipo,rareza,datos,falta}
function leerCriatura(txt){
 const AL={fue:'FUE|STR|Fuerza|Strength',des:'DES|DEX|Destreza|Dexterity',con:'CON|Constituci[oó]n|Constitution',int:'INT|Inteligencia|Intelligence',sab:'SAB|WIS|Sabidur[ií]a|Wisdom',car:'CAR|CHA|Carisma|Charisma'};
 const SK=[['Acrobacias|Acrobatics',0],['Arcanos|Arcana',1],['Atletismo|Athletics',2],['Enga[ñn]o|Deception',3],['Historia|History',4],['Interpretaci[oó]n|Performance',5],['Intimidaci[oó]n|Intimidation',6],['Investigaci[oó]n|Investigation',7],['Juego de manos|Sleight of Hand',8],['Medicina|Medicine',9],['Naturaleza|Nature',10],['Percepci[oó]n|Perception',11],['Perspicacia|Insight',12],['Persuasi[oó]n|Persuasion',13],['Religi[oó]n|Religion',14],['Sigilo|Stealth',15],['Supervivencia|Survival',16],['Trato con animales|Animal Handling',17]];
 const TP=[['aberraci|aberration','Aberración'],['bestia|beast','Bestia'],['celestial','Celestial'],['cieno|ooze','Cieno'],['constructo|construct','Constructo'],['drag[oó]n|dragon','Dragón'],['elemental','Elemental'],['fe[eé]rico|fey|hada','Feérico'],['gigante|giant','Gigante'],['humanoide|humanoid','Humanoide'],['infernal|fiend','Infernal'],['monstruosidad|monstrosity','Monstruosidad'],['no muerto|undead','No muerto'],['planta|plant','Planta']];
 const TM={tiny:'Diminuto',diminut:'Diminuto',small:'Pequeño',peque:'Pequeño',medium:'Mediano',median:'Mediano',large:'Grande',grande:'Grande',huge:'Enorme',enorme:'Enorme',gargantuan:'Gargantuesco',gargantuesc:'Gargantuesco'};
 const m=aPies;
 const L=txt.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
 const d={desc:'',tamano:'Mediano',alin:'',vd:'0',ca:0,caNota:'',pg:0,dados:'',ini:null,vel:'',car:{fue:10,des:10,con:10,int:10,sab:10,car:10},salv:{},hab:Array(18).fill(0),res:'',vul:'',inmD:'',inmE:'',sentidos:'',idiomas:'',rasgos:[],acciones:[],adicionales:[],reacciones:[],legendarias:[],notas:''};
 const nombre=(L.shift()||'Criatura sin nombre').replace(/^#+\s*/,'');let tipo='Humanoide';
 const consumida=new Set();
 // tamaño, especie y alineamiento
 const SZ=/\b(Tiny|Small|Medium|Large|Huge|Gargantuan|Diminut[oa]|Peque[ñn][oa]|Median[oa]|Grande|Enorme|Gargantuesc[oa])\b/i;
 const sz=L.findIndex((l,i)=>i<3&&SZ.test(l.split(',')[0]));
 if(sz>=0){consumida.add(sz);const l=L[sz],w=l.split(',')[0].match(SZ)[1].toLowerCase();
  d.tamano=Object.entries(TM).find(([k])=>w.startsWith(k))[1];
  const partes=l.split(','),pt=partes[0].toLowerCase();
  const t=TP.find(([re])=>new RegExp(re,'i').test(pt));if(t)tipo=t[1];
  d.alin=partes.slice(1).join(',').trim()}
 const T=L.join('\n');
 // características
 let n=0;for(const [k,al] of Object.entries(AL)){const r=T.match(new RegExp('(?:^|[\\s|])(?:'+al+')\\s*:?\\s*(\\d{1,2})(?!\\d)','im'));if(r){d.car[k]=+r[1];n++}}
 if(n<6){const h=L.findIndex(l=>(l.match(/\b(STR|DEX|CON|INT|WIS|CHA|FUE|DES|SAB|CAR)\b/gi)||[]).length>=5);
  if(h>=0&&L[h+1]){const v=[...L[h+1].matchAll(/(\d{1,2})\s*\(/g)].map(x=>+x[1]);if(v.length>=6){['fue','des','con','int','sab','car'].forEach((k,i)=>d.car[k]=v[i]);n=6;consumida.add(h);consumida.add(h+1)}}}
 const KEY=[['ca',/^(?:CA|AC|Clase de armadura|Armor Class)\b\s*:?\s*(\d+)\s*(?:\(([^)]*)\))?/i],['pg',/^(?:PG|HP|Puntos de golpe|Hit Points)\b\s*:?\s*(\d+)\s*(?:\(([^)]*)\))?/i],['vel',/^(?:Velocidad|Speed)\b\s*:?\s*(.+)/i],['ini',/^(?:Iniciativa|Initiative)\b\s*:?\s*([+\-−]?\d+)/i],['salv',/^(?:Salvaciones|Tiradas de salvaci[oó]n|Saving Throws|Saves)\b\s*:?\s*(.+)/i],['hab',/^(?:Habilidades|Skills)\b\s*:?\s*(.+)/i],['vul',/^(?:Vulnerabilidades(?: a(?:l)? da[ñn]o)?|Damage Vulnerabilities|Vulnerabilities)\b\s*:?\s*(.+)/i],['res',/^(?:Resistencias(?: a(?:l)? da[ñn]o)?|Damage Resistances|Resistances)\b\s*:?\s*(.+)/i],['inmE',/^(?:Inmunidades a (?:los )?estados|Inmunidad(?:es)? a condiciones|Condition Immunities)\b\s*:?\s*(.+)/i],['inmD',/^(?:Inmunidades(?: a(?:l)? da[ñn]o)?|Damage Immunities|Immunities)\b\s*:?\s*(.+)/i],['sentidos',/^(?:Sentidos|Senses)\b\s*:?\s*(.+)/i],['idiomas',/^(?:Idiomas|Languages)\b\s*:?\s*(.+)/i],['vd',/^(?:VD|CR|Valor de desaf[ií]o|Challenge(?: Rating)?)\b\s*:?\s*([\d\/]+)/i]];
 const SEC=[['rasgos',/^(?:Rasgos|Traits)$/i],['acciones',/^(?:Acciones|Actions)$/i],['adicionales',/^(?:Acciones? adicional(?:es)?|Bonus Actions?)$/i],['reacciones',/^(?:Reacciones|Reactions)$/i],['legendarias',/^(?:Acciones legendarias|Legendary Actions)\b.*$/i]];
 const ENT=/^([A-ZÁÉÍÓÚÑ0-9][^.:\n]{1,70}?)\.\s+(.+)$/;
 const RUIDO=/^(?:(?:FUE|DES|CON|INT|SAB|CAR|STR|DEX|WIS|CHA|MOD|SAVE|SALV)\b[\s\d+\-−()\/]*)+$|^[\d\s()+\-−]+$/i;
 let sec=null,cur=null,vistoClave=false;const skillsTxt=[],salvTxt=[];
 L.forEach((l,i)=>{
  if(consumida.has(i))return;
  const s=SEC.find(([,re])=>re.test(l));if(s){sec=s[0];cur=null;return}
  if(!sec||!cur||!ENT.test(l)){
   const kv=KEY.find(([,re])=>re.test(l));
   if(kv&&(!sec||sec=='rasgos'&&!cur)||kv&&!ENT.test(l)&&!sec){
    const r=l.match(kv[1]);vistoClave=true;
    if(kv[0]=='ca'){d.ca=+r[1];d.caNota=(r[2]||'').trim()}
    else if(kv[0]=='pg'){d.pg=+r[1];d.dados=(r[2]||'').trim()}
    else if(kv[0]=='ini'){d.ini=+r[1].replace('−','-')}
    else if(kv[0]=='salv')salvTxt.push(r[1]);
    else if(kv[0]=='hab')skillsTxt.push(r[1]);
    else if(kv[0]=='vd')d.vd=r[1];
    else d[kv[0]]=(d[kv[0]]?d[kv[0]]+'; ':'')+r[1].trim();
    return}}
  if(RUIDO.test(l))return;
  const e=l.match(ENT);
  if(e&&e[1].split(' ').length<=8){if(!sec){if(!vistoClave)return d.notas+=(d.notas?'\n':'')+l;sec='rasgos'}cur={n:e[1].trim(),t:e[2].trim()};d[sec].push(cur);return}
  if(cur){cur.t+=' '+l;return}
  d.notas+=(d.notas?'\n':'')+l});
 // salvaciones y habilidades
 const nv=Math.max(0,+(d.vd.includes('/')?d.vd.split('/')[0]/d.vd.split('/')[1]:d.vd)||0),pb=nv<5?2:nv<9?3:nv<13?4:nv<17?5:nv<21?6:nv<25?7:nv<29?8:9;
 salvTxt.join(',').split(/[,;]/).forEach(t=>{for(const [k,al] of Object.entries(AL)){if(new RegExp('^\\s*(?:'+al+')\\b','i').test(t)&&/[+\-−]\d/.test(t))d.salv[k]=true}});
 skillsTxt.join(',').split(/[,;]/).forEach(t=>{const r=t.match(/([A-Za-zñÑáéíóúÁÉÍÓÚ ]+?)\s*([+\-−]\d+)/);if(!r)return;
  const sk=SK.find(([re])=>new RegExp('^\\s*(?:'+re+')\\s*$','i').test(r[1]));if(!sk)return;
  const idx=sk[1],bon=+r[2].replace('−','-'),mod=md(d.car[HAB[idx][1]]);d.hab[idx]=bon>=mod+2*pb&&pb>0?2:1});
 // respaldo para CA y PG si venían en la misma línea
 if(!d.ca){const r=T.match(/\b(?:CA|AC)\s*:?\s*(\d+)/i);if(r)d.ca=+r[1]}
 if(!d.pg){const r=T.match(/\b(?:PG|HP)\s*:?\s*(\d+)\s*(?:\(([^)]*)\))?/i);if(r){d.pg=+r[1];d.dados=(r[2]||'').trim()}}
 if(d.ini==null){const r=T.match(/(?:Iniciativa|Initiative)\s*:?\s*([+\-−]\d+)/i);if(r){const v=+r[1].replace('−','-');if(v!=md(d.car.des))d.ini=v}}
 else if(d.ini==md(d.car.des))d.ini=null;
 ['vel','sentidos','res','vul','inmD','inmE','idiomas','notas'].forEach(k=>d[k]=k=='notas'?m(d[k]):m(d[k]).replace(/\.$/,''));
 ['rasgos','acciones','adicionales','reacciones','legendarias'].forEach(k=>d[k].forEach(e=>e.t=m(e.t)));
 const rareza=nv<=2?'comun':nv<=6?'infrecuente':nv<=11?'rara':nv<=17?'epica':'legendaria';
 const falta=[];if(!d.ca)falta.push('CA');if(!d.pg)falta.push('PG');if(n<6)falta.push('características');if(d.vd==='0'&&!/\b(?:VD|CR)\s*:?\s*0\b/i.test(T))falta.push('valor de desafío');
 return{nombre,tipo,rareza,datos:d,falta}}

// Lee el texto de un conjuro pegado (español o inglés) y devuelve el conjuro y una lista de lo que no pudo leer
function leerConjuro(txt){
 const L=txt.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(Boolean);
 const ES=[['abjuraci|abjuration','Abjuración'],['conjuraci|conjuration','Conjuración'],['adivinaci|divination','Adivinación'],['encantamiento|enchantment','Encantamiento'],['evocaci|evocation','Evocación'],['ilusi|illusion','Ilusión'],['nigromanc|necromanc|necromancy','Nigromancia'],['transmutaci|transmutation','Transmutación']];
 const c={n:(L.shift()||'Conjuro sin nombre').replace(/^#+\s*/,''),nv:1,esc:'',tc:'',al:'',cm:'',du:'',conc:false,rit:false,desc:'',sup:'',cl:''};
 const KEY=[['tc',/^(?:Tiempo de lanzamiento|Casting Time)\s*:?\s*(.+)/i],['al',/^(?:Alcance|Range)\s*:?\s*(.+)/i],['cm',/^(?:Componentes|Components)\s*:?\s*(.+)/i],['du',/^(?:Duraci[oó]n|Duration)\s*:?\s*(.+)/i]];
 const SUP=/^(?:A niveles superiores|At Higher Levels|Using a Higher[- ]Level Spell Slot|Usar un espacio de conjuro de nivel superior|Cantrip Upgrade|Mejora de truco|Con espacios de nivel superior)\b[.:]?\s*(.*)$/i;
 let mode='desc',lvl=false;
 L.forEach((l,i)=>{
  const k=KEY.find(([,re])=>re.test(l));if(k){c[k[0]]=l.match(k[1])[1].trim();mode='desc';return}
  if(!lvl&&!c.tc&&i<3&&(/\b(level|nivel|cantrip|truco)\b/i.test(l)||ES.some(([re])=>new RegExp(re,'i').test(l)))){
   lvl=true;
   if(/cantrip|truco/i.test(l))c.nv=0;else{const r=l.match(/(\d+)(?:st|nd|rd|th|\.?º|\.?°)?[- ]?(?:level|nivel)|(?:level|nivel)\s*(\d+)/i);if(r)c.nv=+(r[1]||r[2])}
   const e=ES.find(([re])=>new RegExp(re,'i').test(l));if(e)c.esc=e[1];
   (l.match(/\(([^)]*)\)/g)||[]).forEach(x=>{const t=x.slice(1,-1);if(/^\s*ritual\s*$/i.test(t))c.rit=true;else c.cl=(c.cl?c.cl+', ':'')+t});
   if(/\britual\b/i.test(l))c.rit=true;return}
  const s=l.match(SUP);if(s){mode='sup';c.sup=s[1];return}
  c[mode]+=(c[mode]?'\n':'')+l});
 c.conc=/concentraci[oó]n|concentration/i.test(c.du);if(/ritual/i.test(c.tc))c.rit=true;
 ['tc','al','cm','du'].forEach(k=>c[k]=aPies(c[k]).replace(/\.$/,''));c.desc=aPies(c.desc);c.sup=aPies(c.sup);
 const falta=[];if(!c.tc)falta.push('tiempo de lanzamiento');if(!c.al)falta.push('alcance');if(!c.cm)falta.push('componentes');if(!c.du)falta.push('duración');if(!c.desc)falta.push('descripción');
 return{...c,falta}}
