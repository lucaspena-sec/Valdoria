// Lectores de texto pegado (fichas de criatura, conjuros, ítems y escenas). Los usan solo el panel DM y la ficha.
// Necesitan comun.js cargado ANTES (usan aPies, md, HAB, CATN, RARN...).
// Lee el texto de una ficha de criatura pegado (español o inglés) y devuelve {nombre,tipo,rareza,datos,falta}
// Limpia el texto pegado (PDF, web, Markdown) y lo devuelve como lista de líneas listas para leer
function limpiarFicha(txt){
 const LBL='Clase de armadura|Puntos de (?:golpe|vida)|Velocidad|Desplazamiento|Iniciativa|Salvaciones|Tiradas de salvaci[oó]n|Habilidades|Vulnerabilidad(?:es)?(?: a(?:l)?)?(?: da[ñn]os?)?|Resistencia(?:s)?(?: a(?:l)?)?(?: da[ñn]os?)?|Inmunidad(?:es)?(?: a(?:l)?)?(?: (?:los|las|la))?(?: da[ñn]os?| estados?(?: alterad[oa]s?)?| condici(?:ón|ones)(?: alterad[oa]s?)?)?|Sentidos|Idiomas|Desaf[ií]o|Valor de desaf[ií]o|Nivel de desaf[ií]o|Armor Class|Hit Points|Speed|Challenge(?: Rating)?|Senses|Languages|Skills|Saving Throws|Damage Vulnerabilities|Damage Resistances|Damage Immunities|Condition Immunities';
 let t=txt.normalize('NFC').replace(/\r\n?/g,'\n')
  .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g,' ')
  .replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g,'')
  .replace(/[\u2044\u2215]/g,'/').replace(/\uff1a/g,':')
  .replace(/¼/g,'1/4').replace(/½/g,'1/2').replace(/¾/g,'3/4').replace(/⅛/g,'1/8')
  .replace(/[\u2010\u2011\u2012]/g,'-')
  .replace(/\*{1,3}([^*\n]+?)\*{1,3}/g,'$1').replace(/\*+/g,'')
  .replace(/(^|[\s(])_{1,3}([^_\n]+?)_{1,3}(?=[\s.,;:)]|$)/gm,'$1$2')
  .replace(/([a-záéíóúñü])-\n\s*([a-záéíóúñü])/g,'$1$2');
 // texto corrido o en columnas: cada etiqueta con ":" arranca su propia línea
 t=t.replace(new RegExp('(\\S)[ \\t]+((?:'+LBL+')[ \\t]*:)','gi'),'$1\n$2');
 t=t.replace(/(\S)[ \t]+(FUE\s+DES\s+CON\s+INT\s+SAB\s+CAR|STR\s+DEX\s+CON\s+INT\s+WIS\s+CHA)\s+/g,'$1\n$2\n');
 t=t.replace(/(\S)[ \t]+(ACCIONES ADICIONALES|ACCIONES LEGENDARIAS|ACCIONES|REACCIONES|RASGOS|ACTIONS|BONUS ACTIONS|LEGENDARY ACTIONS|REACTIONS)(?=[ \t]+\S)/g,'$1\n$2\n');
 const L=t.split('\n').map(s=>s.replace(/^(?:\s*(?:[>#|•·▪◦●■►▶]+|[-–—]\s))+\s*/,'').replace(/\s*\|\s*$/,'').trim()).filter(s=>s&&!/^[\s|:\-–—]+$/.test(s));
 // etiqueta sola en una línea y su valor en la siguiente (típico de PDF): se unen
 const solo=new RegExp('^(?:'+LBL+'|CA|PG|VD)\\s*:?$','i'),sec=/^(?:ACCIONES|REACCIONES|RASGOS|ACTIONS|REACTIONS|BONUS ACTIONS|LEGENDARY ACTIONS)/;
 for(let i=0;i<L.length-1;i++){if(solo.test(L[i])&&!solo.test(L[i+1])&&!sec.test(L[i+1])){L[i]=L[i].replace(/\s*:?$/,'')+': '+L[i+1];L.splice(i+1,1)}}
 // pegado en una sola línea: el nombre viene pegado al tipo y a veces las acciones también
 if(L.length&&L[0].includes(',')){const mm=/\b(?:Tiny|Small|Medium|Large|Huge|Gargantuan|Diminut[oa]|Peque[ñn][oa]|Median[oa]|Grande|Enorme|Gargantuesc[oa])\b/i.exec(L[0]);
  if(mm&&mm.index>0){let cut=mm.index;const tm=L[0].slice(0,cut).match(/\s(?:Muert[oa]s?\s+viviente|No[- ]?muert[oa]s?|Aberraci[oó]n|Bestia|Celestial|Cieno|Constructo|Drag[oó]n|Elemental|Fe[eé]rico|Gigante|Humanoide|Infernal|Monstruosidad|Planta)\s*$/i);
   if(tm)cut=tm.index;const nom=L[0].slice(0,cut).trim(),resto=L[0].slice(cut).trim();if(nom&&resto)L.splice(0,1,nom,resto)}}
 if(txt.split('\n').filter(s=>s.trim()).length<=3)return L.flatMap(l=>l.length>250?l.replace(/([.!?])\s+([A-ZÁÉÍÓÚÑ][^.:\n]{2,40}\.\s+(?=Ataque|Attack|Melee|Ranged|El |La |Los |Las |Un |Una |Cuando|Si |Cada|Hasta))/g,'$1\n$2').split('\n'):[l]);
 return L}

function leerCriatura(txt){
 txt=txt.normalize('NFC').replace(/[\u00a0\u2009\u202f\u200b]/g,' ');
 const AL={fue:'FUE|STR|Fuerza|Strength',des:'DES|DEX|Destreza|Dexterity',con:'CON|Constituci[oó]n|Constitution',int:'INT|Inteligencia|Intelligence',sab:'SAB|WIS|Sabidur[ií]a|Wisdom',car:'CAR|CHA|Carisma|Charisma'};
 const SK=[['Acrobacias|Acrobatics',0],['Arcanos|Arcana',1],['Atletismo|Athletics',2],['Enga[ñn]o|Deception',3],['Historia|History',4],['Interpretaci[oó]n|Performance',5],['Intimidaci[oó]n|Intimidation',6],['Investigaci[oó]n|Investigation',7],['Juego de manos|Sleight of Hand',8],['Medicina|Medicine',9],['Naturaleza|Nature',10],['Percepci[oó]n|Perception',11],['Perspicacia|Insight',12],['Persuasi[oó]n|Persuasion',13],['Religi[oó]n|Religion',14],['Sigilo|Stealth',15],['Supervivencia|Survival',16],['Trato con animales|Animal Handling',17]];
 const TP=[['aberraci|aberration','Aberración'],['bestia|beast','Bestia'],['celestial','Celestial'],['cieno|ooze','Cieno'],['constructo|construct','Constructo'],['drag[oó]n|dragon','Dragón'],['elemental','Elemental'],['fe[eé]rico|fey|hada','Feérico'],['gigante|giant','Gigante'],['humanoide|humanoid','Humanoide'],['infernal|fiend','Infernal'],['monstruosidad|monstrosity','Monstruosidad'],['muert[oa]s? viviente|no[- ]?muert|undead','No muerto'],['planta|plant','Planta']];
 const TM={tiny:'Diminuto',diminut:'Diminuto',small:'Pequeño',peque:'Pequeño',medium:'Mediano',median:'Mediano',large:'Grande',grande:'Grande',huge:'Enorme',enorme:'Enorme',gargantuan:'Gargantuesco',gargantuesc:'Gargantuesco'};
 const m=aPies;
 const L=limpiarFicha(txt);
 const d={desc:'',tamano:'Mediano',alin:'',vd:'0',ca:0,caNota:'',pg:0,dados:'',ini:null,vel:'',car:{fue:10,des:10,con:10,int:10,sab:10,car:10},salv:{},hab:Array(18).fill(0),res:'',vul:'',inmD:'',inmE:'',sentidos:'',idiomas:'',rasgos:[],acciones:[],adicionales:[],reacciones:[],legendarias:[],notas:''};
 let nombre=(L.shift()||'Criatura sin nombre').replace(/^#+\s*/,'');if(nombre===nombre.toUpperCase()&&/[A-ZÁÉÍÓÚÑ]{2}/.test(nombre))nombre=nombre.charAt(0)+nombre.slice(1).toLowerCase();let tipo='Humanoide',tipoOk=false;
 const consumida=new Set();
 // tamaño, especie y alineamiento
 const SZ=/\b(Tiny|Small|Medium|Large|Huge|Gargantuan|Diminut[oa]|Peque[ñn][oa]|Median[oa]|Grande|Enorme|Gargantuesc[oa])\b/i;
 const sz=L.findIndex((l,i)=>i<3&&SZ.test(l.split(',')[0]));
 if(sz>=0){consumida.add(sz);const l=L[sz],w=l.split(',')[0].match(SZ)[1].toLowerCase();
  d.tamano=Object.entries(TM).find(([k])=>w.startsWith(k))[1];
  const partes=l.split(','),pt=partes[0].toLowerCase();
  const t=TP.find(([re])=>new RegExp(re,'i').test(pt));if(t){tipo=t[1];tipoOk=true}
  d.alin=partes.slice(1).join(',').trim()}
 const T=L.join('\n');
 // características
 let n=0;for(const [k,al] of Object.entries(AL)){const r=T.match(new RegExp('(?:^|[\\s|])(?:'+al+')\\s*:?\\s*(\\d{1,2})(?!\\d)','im'));if(r){d.car[k]=+r[1];n++}}
 if(n<6){const h=L.findIndex(l=>(l.match(/\b(STR|DEX|CON|INT|WIS|CHA|FUE|DES|SAB|CAR)\b/gi)||[]).length>=5);
  if(h>=0&&L[h+1]){const v=[...L[h+1].matchAll(/(\d{1,2})\s*\(/g)].map(x=>+x[1]);if(v.length>=6){['fue','des','con','int','sab','car'].forEach((k,i)=>d.car[k]=v[i]);n=6;consumida.add(h);consumida.add(h+1)}}}
 const KEY=[['ca',/^(?:CA|AC|Clase de armadura|Armor Class)\b\s*:?\s*(\d+)\s*(?:\(([^)]*)\))?/i],['pg',/^(?:PG|HP|Puntos de golpe|Puntos de vida|Hit Points)\b\s*:?\s*(\d+)\s*(?:\(([^)]*)\))?/i],['vel',/^(?:Velocidad|Desplazamiento|Speed)\b\s*:?\s*(.+)/i],['ini',/^(?:Iniciativa|Initiative)\b\s*:?\s*([+\-−]?\d+)/i],['salv',/^(?:Salvaciones|Tiradas de salvaci[oó]n|Saving Throws|Saves)\b\s*:?\s*(.+)/i],['hab',/^(?:Habilidades|Skills)\b\s*:?\s*(.+)/i],['vul',/^(?:Vulnerabilidad(?:es)?(?: a(?:l)?)?(?: da[ñn]os?)?\s*:\s*|Vulnerabilidad(?:es)? a(?:l)? da[ñn]os?\b\s*:?\s*|Vulnerabilidades\b\s*:?\s*|(?:Damage )?Vulnerabilities\b\s*:?\s*)(.+)/i],['res',/^(?:Resistencia(?:s)?(?: a(?:l)?)?(?: da[ñn]os?)?\s*:\s*|Resistencia(?:s)? a(?:l)? da[ñn]os?\b\s*:?\s*|Resistencias\b\s*:?\s*|(?:Damage )?Resistances\b\s*:?\s*)(.+)/i],['inmE',/^(?:Inmunidad(?:es)?(?: a(?:l)?)?(?: (?:los|las|la))? (?:estados?|condici(?:ón|ones))(?: alterad[oa]s?)?\b\s*:?\s*|Condition Immunities\b\s*:?\s*)(.+)/i],['inmD',/^(?:Inmunidad(?:es)?(?: a(?:l)?)?(?: da[ñn]os?)?\s*:\s*|Inmunidad(?:es)? a(?:l)? da[ñn]os?\b\s*:?\s*|Inmunidades\b\s*:?\s*|(?:Damage )?Immunities\b\s*:?\s*)(.+)/i],['sentidos',/^(?:Sentidos|Senses)\b\s*:?\s*(.+)/i],['idiomas',/^(?:Idiomas|Languages)\b\s*:?\s*(.+)/i],['pb',/^(?:Bonificador(?: por)? (?:de )?competencia|Proficiency Bonus)\b.*/i],['vd',/^(?:VD|CR|(?:Valor|Nivel) de desaf[ií]o|Desaf[ií]o|Challenge(?: Rating)?)\b\s*:?\s*([\d\/]+)/i]];
 const SEC=[['rasgos',/^(?:Rasgos|Traits)$/i],['acciones',/^(?:Acciones|Actions)$/i],['adicionales',/^(?:Acciones? adicional(?:es)?|Bonus Actions?)$/i],['reacciones',/^(?:Reacci[oó]n(?:es)?|Reactions?)$/i],['legendarias',/^(?:Acciones legendarias|Legendary Actions)\b.*$/i]];
 const ENT=/^([A-ZÁÉÍÓÚÑ0-9][^.:\n]{1,70}?)\.\s+(.+)$/;
 const RUIDO=/^(?:(?:FUE|DES|CON|INT|SAB|CAR|STR|DEX|WIS|CHA|MOD|SAVE|SALV)\b[\s\d+\-−()\/]*)+$|^[\d\s()+\-−]+$/i;
 let sec=null,cur=null,vistoClave=false,ult=null;const skillsTxt=[],salvTxt=[];
 L.forEach((l,i)=>{
  if(consumida.has(i))return;
  const s=SEC.find(([,re])=>re.test(l.replace(/\s*:$/,'')));if(s){sec=s[0];cur=null;ult=null;return}
  if(!sec||!cur||!ENT.test(l)){
   const kv=KEY.find(([,re])=>re.test(l));
   if(kv&&(!sec||sec=='rasgos'&&!cur)||kv&&!ENT.test(l)&&!sec){
    const r=l.match(kv[1]);vistoClave=true;ult=['vel','salv','hab','vul','res','inmE','inmD','sentidos','idiomas'].includes(kv[0])?kv[0]:null;
    if(kv[0]=='ca'){d.ca=+r[1];d.caNota=(r[2]||'').trim()}
    else if(kv[0]=='pg'){d.pg=+r[1];d.dados=(r[2]||'').trim()}
    else if(kv[0]=='ini'){d.ini=+r[1].replace('−','-')}
    else if(kv[0]=='salv')salvTxt.push(r[1]);
    else if(kv[0]=='hab')skillsTxt.push(r[1]);
    else if(kv[0]=='vd')d.vd=r[1];
    else if(kv[0]=='pb'){}
    else d[kv[0]]=(d[kv[0]]?d[kv[0]]+'; ':'')+r[1].trim();
    return}}
  if(RUIDO.test(l))return;
  const e=l.match(ENT);
  if(ult&&!sec&&!(e&&e[1].split(' ').length<=8)){if(ult=='salv')salvTxt[salvTxt.length-1]+=' '+l;else if(ult=='hab')skillsTxt[skillsTxt.length-1]+=' '+l;else d[ult]+=' '+l;return}
  ult=null;
  if(e&&e[1].split(' ').length<=8&&!(cur&&!/[.!?)"”»]$/.test(cur.t))){if(!sec){if(!vistoClave)return d.notas+=(d.notas?'\n':'')+l;sec='rasgos'}cur={n:e[1].trim(),t:e[2].trim()};d[sec].push(cur);return}
  if(cur){cur.t+=' '+l;return}
  d.notas+=(d.notas?'\n':'')+l});
 // salvaciones y habilidades
 const nv=Math.max(0,+(d.vd.includes('/')?d.vd.split('/')[0]/d.vd.split('/')[1]:d.vd)||0),pb=nv<5?2:nv<9?3:nv<13?4:nv<17?5:nv<21?6:nv<25?7:nv<29?8:9;
 salvTxt.join(',').split(/[,;]/).forEach(t=>{for(const [k,al] of Object.entries(AL)){if(new RegExp('^\\s*(?:'+al+')\\b','i').test(t)&&/[+\-−]\d/.test(t))d.salv[k]=true}});
 skillsTxt.join(',').split(/[,;]/).forEach(t=>{const r=t.match(/([A-Za-zñÑáéíóúÁÉÍÓÚ ]+?)\s*([+\-−]\d+)/);if(!r)return;
  const sk=SK.find(([re])=>new RegExp('^\\s*(?:'+re+')\\s*$','i').test(r[1]));if(!sk)return;
  const idx=sk[1],bon=+r[2].replace('−','-'),mod=md(d.car[HAB[idx][1]]);d.hab[idx]=bon>=mod+2*pb&&pb>0?2:1});
 const COND=/^(?:invisible|tumbad|inmovilizad|cansad|ciego|sord[oa]|cegad|hechizad|ensordecid|agotamient|cansancio|asustad|agarrad|incapacitad|paralizad|petrificad|envenenad|derribad|apresad|aturdid|inconsciente|blinded|charmed|deafened|exhaustion|frightened|grappled|incapacitated|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious)/i,esEst=t=>{const p=t.split(/,| y | and /).map(s=>s.trim()).filter(Boolean);return p.length>0&&p.every(x=>COND.test(x))};
 if(d.inmD&&!d.inmE){const p=d.inmD.split(';').map(s=>s.trim()).filter(Boolean),u=p[p.length-1];if(p.length&&esEst(u)){d.inmE=u;d.inmD=p.slice(0,-1).join('; ')}}
 // respaldo para CA y PG si venían en la misma línea
 if(!d.ca){const r=T.match(/\b(?:CA|AC)\s*:?\s*(\d+)/i);if(r)d.ca=+r[1]}
 if(!d.pg){const r=T.match(/\b(?:PG|HP)\s*:?\s*(\d+)\s*(?:\(([^)]*)\))?/i);if(r){d.pg=+r[1];d.dados=(r[2]||'').trim()}}
 if(d.ini==null){const r=T.match(/(?:Iniciativa|Initiative)\s*:?\s*([+\-−]\d+)/i);if(r){const v=+r[1].replace('−','-');if(v!=md(d.car.des))d.ini=v}}
 else if(d.ini==md(d.car.des))d.ini=null;
 ['vel','sentidos','res','vul','inmD','inmE','idiomas','notas'].forEach(k=>d[k]=k=='notas'?m(d[k]):m(d[k]).replace(/\.$/,''));
 ['rasgos','acciones','adicionales','reacciones','legendarias'].forEach(k=>d[k].forEach(e=>e.t=m(e.t)));
 const rareza=nv<=2?'comun':nv<=6?'infrecuente':nv<=11?'rara':nv<=17?'epica':'legendaria';
 const falta=[];if(!d.ca)falta.push('CA');if(!d.pg)falta.push('PG');if(n<6)falta.push('características');if(d.vd==='0'&&!/\b(?:VD|CR|Desaf[ií]o|Challenge)\s*:?\s*0\b/i.test(T))falta.push('valor de desafío');if(!tipoOk)falta.push('tipo de criatura');
 d.notas.split('\n').forEach(l=>{if(/^(?:Vulnerabilidad|Resistencia|Inmunidad|Desaf[ií]o|VD\b|Valor de desaf|Challenge|Damage (?:Vuln|Resist|Immun)|Condition Immun)/i.test(l))falta.push('línea sin leer: "'+l.slice(0,40)+'"')});
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

// ===== Ítems: leer el texto pegado de una ficha de ítem (catálogo del DM) =====
// Entiende fichas de libro (nombre / tipo, rareza / texto) y fichas tipo carta (ESTADÍSTICAS, ESTILO,
// DESCRIPCIÓN...), incluso con errores de escaneo (OCR). Puede haber VARIOS ítems pegados juntos.
const _sa=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const _lev1=(a,b)=>{if(a.length!==b.length)return 9;let d=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i]&&++d>1)return 9;return d};
const _VOC='anillo amuleto abanico botas capa collar cinturon daga espada escudo armadura yelmo guantes varita baston portal pocion pergamino instinto reactivo velocidad paralisis viento estatica centinela cetro corona talisman bolsa manto hacha lanza maza martillo ballesta cuchillo brazalete diadema'.split(' ');
const _CHICAS=['de','del','la','las','el','los','y','en','con','a','al','para','por','un','una','o'];
const _esMay=s=>{const l=s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g,'');if(l.length<3)return false;return (l.match(/[A-ZÁÉÍÓÚÑ]/g)||[]).length/l.length>=0.7};
const _tipoSig=s=>{if(!s||s.length>140)return false;const a=_sa(s).toLowerCase();
 return (/maravillos/.test(a)||/\b(poco comun|comun|infrecuente|raro|rara|muy raro|muy rara|legendari[oa]|artefacto)\b/.test(a))&&(/[,(•]/.test(s)||/maravillos/.test(a)||s.length<=40)};
const _kw=/^(propiedad\s+especial|efecto\s+pasivo|habilidad\s+pasiva|habilidad|pasiva|acci[oó]n\s+adicional|reacci[oó]n)\b/i;
const _seccion=s=>{const a=_sa(s).toLowerCase().trim();return /^estadisticas?$/.test(a)||/^estilos?$/.test(a)||/^descripcion$/.test(a)||/^notas?\s+de\b/.test(a)||/^requiere\s+sintoni/.test(a)};

function _itemLineas(txt){
 let t=txt.normalize('NFC').replace(/\r\n?/g,'\n')
  .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g,' ').replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g,'')
  .replace(/[\u2044\u2215]/g,'/').replace(/\uff1a/g,':').replace(/[\u2010\u2011\u2012]/g,'-')
  .replace(/[\u0400-\u04ff]/g,c=>({'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X','а':'a','е':'e','о':'o','р':'p','с':'c','х':'x','у':'y','і':'i'}[c]||c))
  .replace(/(ob)(i)(et)/gi,(m,a,b,c)=>a+(b==='I'?'J':'j')+c)
  .replace(/OU(E|I)/g,'QU$1')
  .replace(/\*{1,3}([^*\n]+?)\*{1,3}/g,'$1').replace(/\*+/g,'')
  .replace(/([a-záéíóúñü])-\n\s*([a-záéíóúñü])/g,'$1$2');
 return t.split('\n').map(s=>s.replace(/^(?:\s*(?:[>#|]+|[-–—]\s))+\s*/,'').replace(/\s*\|\s*$/,'').trim())
  .filter(s=>!/^[\d\s\-–—•◦·|.,:;]{1,8}$/.test(s)&&!/^[A-Za-z]$/.test(s)||s==='')
  .map(s=>s.replace(/^(?:[•◦·▪●■►▶]\s*)+/,'').replace(/^(?:[VvXx✓✔√]\s+)+(?=\S)/,'').replace(/^(?:[A-Za-z]\s){2}(?=[A-ZÁÉÍÓÚÑ])/,''))
}

function separarItems(txt){
 const L=_itemLineas(txt),idx=[];
 const sig=j=>{let a=j;while(a<L.length&&!L[a])a++;return a};
 for(let i=0;i<L.length;i++){
  if(!L[i]||(i>0&&L[i-1]))continue;
  if(_tipoSig(L[i])||_seccion(L[i]))continue;
  const b=sig(i+1),c=sig(b+1);
  if(b>=L.length)continue;
  if(_tipoSig(L[b])||/^estad[ií]sticas?$/i.test(_sa(L[b]))||(_esMay(L[b])&&L[c]&&/^estad[ií]sticas?$/i.test(_sa(L[c]))))idx.push(i)}
 if(idx.length<2)return [txt];
 return idx.map((s,k)=>L.slice(s,k+1<idx.length?idx[k+1]:L.length).join('\n'))}

function _nombreBonito(s){
 let t=s.replace(/^[\s•◦·\-–—]+|[\s•◦·\-–—]+$/g,'').replace(/\s+/g,' ');
 const l=t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g,''),may=(l.match(/[A-ZÁÉÍÓÚÑ]/g)||[]).length;
 let cor=false;
 const mixto=/[a-záéíóúñ][A-ZÁÉÍÓÚÑ]|[A-ZÁÉÍÓÚÑ]{2,}[a-záéíóúñ]\b/.test(t);
 if(l.length&&(may/l.length>=0.5||mixto))t=t.toLowerCase().split(' ').map((w,i)=>i&&_CHICAS.includes(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
 t=t.split(' ').map(w=>{const b=_sa(w).toLowerCase();if(b.length<5||_VOC.includes(b))return w;
  const m=_VOC.find(v=>v[0]===b[0]&&_lev1(v,b)===1);if(!m)return w;cor=true;
  const f=w.charAt(0)===w.charAt(0).toUpperCase()&&w.charAt(0)!==w.charAt(0).toLowerCase();return f?m.charAt(0).toUpperCase()+m.slice(1):m}).join(' ');
 return {n:t,cor}}
const _oracion=s=>{const t=s.toLowerCase().replace(/\s+/g,' ').trim();return t.charAt(0).toUpperCase()+t.slice(1)};

function _parrafos(lineas){const out=[];let cur='';
 lineas.forEach(s=>{
  if(!s){if(cur){out.push(cur);cur=''}return}
  if(cur&&/[.!?:»”"]$/.test(cur)&&/^[A-ZÁÉÍÓÚÑ¡¿«“"]/.test(s)){out.push(cur);cur=s}
  else cur=cur?cur+' '+s:s});
 if(cur)out.push(cur);return out}

const _ARMAS_DIST=['arco corto','arco largo','ballesta ligera','ballesta de mano','ballesta pesada','honda','dardo','cerbatana'];
const _ARMAS_MARC=['espada larga','espada corta','mandoble','estoque','cimitarra','hacha de batalla','gran hacha','alabarda','pica','lanza de caballeria','latigo','martillo de guerra','tridente','pica','guja','maza estrellada','martillo de guerra','arco largo','ballesta de mano','ballesta pesada','cerbatana'];
const _ARM_TIPO={ligera:['acolchada','cuero'],media:['pieles','camisote','escamas','coraza','semiplacas','semi placas'],pesada:['anillas','mallas','bandas','placas','completa']};
const _ARMAS_SIMPLES=['daga','baston','hacha de mano','jabalina','maza','garrote','gran garrote','lanza','martillo ligero','hoz','arco corto','ballesta ligera','dardo','honda'];
const _TD={acido:'ácido',frio:'frío',fuego:'fuego',fuerza:'fuerza',necrotico:'necrótico',psiquico:'psíquico',radiante:'radiante',relampago:'relámpago',electrico:'relámpago',trueno:'trueno',veneno:'veneno',contundente:'contundente',cortante:'cortante',perforante:'perforante'};
const _PROPS=['Ligera','Sutil','Pesada','Alcance','Arrojadiza','Carga','Distancia','Dos manos','Munición','Versátil'];

function _catDe(s){const a=_sa(s||'').toLowerCase();
 if(/pergamino/.test(a))return 'pergaminos';
 if(/pocion|elixir|aceite|unguento|municion|bomba/.test(a))return 'consumibles';
 if(/\bescudo\b/.test(a))return 'escudos';
 if(/armadura|coraza|cota de/.test(a))return 'armaduras';
 if(/\barma\b/.test(a))return 'armas';
 if(/\b(gema|joya|tesoro|obra de arte|valios)/.test(a))return 'valiosos';
 if(/maravillos|anillo|varita|\bvara\b|cetro|amuleto|collar|\bcapa\b|botas|guantes|cinturon|yelmo|corona|talisman|orbe|cubo|abanico/.test(a))return 'accesorios';
 return ''}
function _rarDe(s){const a=_sa(s||'').toLowerCase();
 if(/muy rar/.test(a))return 'epica';if(/legendari|artefacto/.test(a))return 'legendaria';
 if(/poco comun|infrecuente/.test(a))return 'infrecuente';if(/\brar[oa]\b/.test(a))return 'rara';if(/\bcomun\b/.test(a))return 'comun';return ''}

function _statsDe(txt){
 const K='Tipo|Da[ñn]o|Propiedades?|Bonificador|CA|Clase de armadura|Peso|Fuerza|Sigilo|Alcance|Precio|Valor|Maestr[ií]a|Competencia';
 const re=new RegExp('(?:^|[\\s•◦·|])('+K+')\\s*:\\s*','gi'),pos=[];let m;
 while((m=re.exec(txt)))pos.push({k:_sa(m[1]).toLowerCase(),i:m.index+m[0].length,s:m.index});
 const r={};pos.forEach((p,j)=>{r[p.k]=txt.slice(p.i,j+1<pos.length?pos[j+1].s:txt.length).replace(/[•◦·|\s.,;]+$/,'').trim()});return r}

function _grupoDe(nombre,texto){
 const h=_sa(nombre).toLowerCase(),t=_sa(texto).toLowerCase().slice(0,220);
 if(/pasiv/.test(h))return 'pasivas';
 const cand=[['adicional',t.search(/accion adicional/)],['reaccion',t.search(/reaccion/)],['accion',t.search(/(como|usar|emplear|utilizar|gastar|con) una accion|accion de magia/)]].filter(x=>x[1]>=0).sort((a,b)=>a[1]-b[1]);
 return cand.length?cand[0][0]:'pasivas'}

const _FREQ=/\(?\s*((?:\d+|una|un)\s+vez(?:es)?\s+por\s+[a-záéíóúñ]+(?:\s+(?:corto|largo))?)\s*\)?/i;

function leerItem(txt){
 const ruido=/[\u0400-\u04ff]/.test(txt)||/[A-Z]{2,}[a-z]{1,2}[A-Z]/.test(txt)||/\b[A-Z]{3,}[a-z]\b/.test(txt);
 const L=_itemLineas(txt),avisos=[],falta=[];
 let i=0;while(i<L.length&&!L[i])i++;
 const nom=_nombreBonito(L[i]||'');i++;
 let tipoL='';const subt=[];
 for(let k=0;k<2;k++){let j=i;while(j<L.length&&!L[j])j++;const s=L[j];if(s==null)break;
  if(_tipoSig(s)){tipoL=tipoL?tipoL+' '+s:s;i=j+1}
  else if(_esMay(s)&&s.split(' ').length<=6&&!_seccion(s)&&!_kw.test(s)&&!/:/.test(s)){subt.push(s);i=j+1}
  else break}
 const sec={intro:[],desc2:[],notas:[],estilo:[],stats:[],quotes:[]},ents=[];
 let cur='intro',ent=null,sint=false,abierta=false,notasEt='';
 const nuevaEnt=(n,t,tipoKw)=>{const fm=_FREQ.exec(n);let freq='';if(fm){freq=fm[1].toLowerCase();n=n.replace(_FREQ,'').trim()}
  ent={n:_nombreBonito(n).n,t:t?[t]:[],freq,kw:tipoKw||''};ents.push(ent);cur='entry'};
 for(;i<L.length;i++){
  const s=L[i];
  if(!s){if(cur==='intro'||cur==='desc2'||cur==='notas')sec[cur].push('');continue}
  if(abierta){sec.quotes[sec.quotes.length-1]+=' '+s;if(/["”»]/.test(s))abierta=false;continue}
  if(/^["“«‘]/.test(s)&&cur!=='stats'&&cur!=='notas'){sec.quotes.push(s);if(!/["”»]/.test(s.slice(1)))abierta=true;continue}
  const a=_sa(s).toLowerCase().trim();
  if(/^estadisticas?$/.test(a)){cur='stats';continue}
  if(/^estilos?$/.test(a)){cur='estilo';continue}
  if(/^descripcion$/.test(a)){cur='desc2';continue}
  if(/^notas?\s+de\b/.test(a)){cur='notas';notasEt=_nombreBonito(s).n;continue}
  if(/^requiere\s+sintoni/.test(a)){sint=true;cur='sint';continue}
  if(cur==='entry'&&ent&&!ent.t.length&&!ent.freq&&/^\(?\s*(\d+|una|un)\s+vez/i.test(s)){ent.freq=(_FREQ.exec(s)||[0,s])[1].toLowerCase();continue}
  const km=_kw.exec(s);
  if(km){const kl=km[1].replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g,''),ratio=(kl.match(/[A-ZÁÉÍÓÚÑ]/g)||[]).length/kl.length;
   if(ratio>=0.5){
    const resto=s.slice(km[0].length).replace(/^\s*(?:--|—|–|-|:)?\s*/,''),toks=resto.split(/\s+/);
    let corte=-1,marc=false;
    for(let k=1;k<toks.length;k++)if(/^[vVxX✓✔√]$/.test(toks[k])){corte=k;marc=true;break}
    if(corte<0)for(let k=1;k<toks.length;k++)if(/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}$/.test(toks[k])){corte=k;break}
    const nombre=corte>=0?toks.slice(0,corte).join(' '):resto,texto=corte>=0?toks.slice(corte+(marc?1:0)).join(' '):'';
    nuevaEnt(nombre||km[1],texto,km[1]);continue}}
  if(_esMay(s)&&s.split(' ').length<=7&&!/[.!?]$/.test(s)){nuevaEnt(s.replace(/^[•◦·]\s*/,''),'');continue}
  if(cur==='stats')sec.stats.push(s);
  else if(cur==='entry')ent.t.push(s);
  else if(cur==='sint'){}
  else sec[cur].push(s)}

 // --- datos básicos
 const st=_statsDe(sec.stats.join(' '));
 let rareza=_rarDe(tipoL),catTxt=[tipoL,subt.join(' ')].join(' ');
 let categoria=_catDe(tipoL)||'';
 if(st.tipo){const c=_catDe(st.tipo);if(c)categoria=c}
 if(!categoria&&(st.dano||_catDe(subt.join(' '))==='armas'))categoria='armas';
 if(!categoria)categoria=_catDe(subt.join(' '))||'';
 if(/sintoni/i.test(_sa(tipoL)))sint=true;
 const datos={peso:st.peso||'',sint,pasivas:[],accion:[],adicional:[],reaccion:[],multi:[]},extra=[];

 if(categoria==='armas'||(!categoria&&st.dano)){
  categoria='armas';
  const base=_sa(st.tipo||((/\(([^)]*)\)/.exec(tipoL)||[,''])[1])||'').toLowerCase().trim();
  datos.comp=/marcial/.test(_sa((st.competencia||'')+' '+(st.tipo||'')).toLowerCase())||_ARMAS_MARC.some(x=>base.includes(x))?'Marcial':(_ARMAS_SIMPLES.some(x=>base.includes(x))||/simple/.test(_sa(st.tipo||'').toLowerCase())?'Simple':'');
  datos.tipoArma=(/distancia/.test(base)||_ARMAS_DIST.some(x=>base.includes(x)))?'A distancia':'Cuerpo a cuerpo';
  datos.dano='';datos.tipoDano='cortante';datos.versatil='';datos.alcance='';datos.maestria='';datos.props=[];
  const dm=/(\d+d\d+(?:\s*[+\-]\s*\d+)?)\s*(?:de\s+da[ñn]o\s+)?([a-záéíóúñ]+)?/i.exec(st.dano||'');
  if(dm){datos.dano=dm[1].replace(/\s+/g,'');const td=_TD[_sa(dm[2]||'').toLowerCase()];if(td)datos.tipoDano=td}
  (st.propiedades||st.propiedad||'').split(/\s*[.,;]\s*(?![^()]*\))/).forEach(p=>{p=p.trim();if(!p)return;
   const b=_sa(p).toLowerCase().replace(/\(.*$/,'').trim(),pr=_PROPS.find(x=>_sa(x).toLowerCase()===b);
   if(pr){if(!datos.props.includes(pr))datos.props.push(pr);
    const vm=/\((\d+d\d+)/.exec(p);if(pr==='Versátil'&&vm)datos.versatil=vm[1];
    const am=/(\d+\s*\/\s*\d+)/.exec(p);if(am&&(pr==='Arrojadiza'||pr==='Munición'))datos.alcance=am[1].replace(/\s/g,'')+' pies'}
   else if(/^[+\-−]\d+\s+al\s+ataque/i.test(p))datos.pasivas.push({n:'Bonificador de ataque',t:p.replace(/^[−]/,'-')});
   else if(p.length>2)extra.push(p.charAt(0).toUpperCase()+p.slice(1)+'.')});
  if(st.alcance&&!datos.alcance)datos.alcance=st.alcance;
  if(st.maestria){const mm=['Hendir','Rozar','Mella','Empujar','Debilitar','Ralentizar','Derribar','Hostigar'].find(x=>_sa(x).toLowerCase()===_sa(st.maestria).toLowerCase());if(mm)datos.maestria=mm}
 }else if(categoria==='armaduras'||categoria==='escudos'){
  const tp=_sa(st.tipo||catTxt).toLowerCase();
  datos.armTipo=/escudo/.test(tp)||categoria==='escudos'?'Escudo':/pesada/.test(tp)||_ARM_TIPO.pesada.some(x=>tp.includes(x))?'Pesada':/media/.test(tp)||_ARM_TIPO.media.some(x=>tp.includes(x))?'Media':'Ligera';
  const ca=st.ca||st['clase de armadura']||st.bonificador||'';
  datos.armCA=/des/i.test(ca)?ca.replace(/\s+/g,' ').replace(/[.;]+$/,'').trim():(/^[+\-]?\d+/.exec(ca)||[''])[0].replace(/^(\d)/,(m,d)=>categoria==='escudos'?'+'+d:d);
  if(!datos.armCA&&ca)datos.armCA=ca;
  datos.armFue=(/\d+/.exec(st.fuerza||'')||[''])[0];datos.armSig=/desventaja/i.test(st.sigilo||'');
  if(st.propiedades||st.propiedad){const p=st.propiedades||st.propiedad;extra.push(p.charAt(0).toUpperCase()+p.slice(1)+'.')}
 }

 // --- habilidades con nombre
 ents.forEach(e=>{const texto=_parrafos(e.t).join(' ').trim();
  const g=_grupoDe(e.kw+' '+e.n,texto);
  datos[g].push({n:e.n,t:(e.freq?'('+e.freq+') ':'')+texto})});

 // --- descripción
 const partes=[];
 const reqS=/sintoni[a-z]*\s+con\s+([^)]+)/i.exec(_sa(tipoL));
 if(reqS)partes.push('Requiere sintonización con '+reqS[1].trim()+'.');
 if(subt.length)partes.push(subt.map(_oracion).join(' · '));
 partes.push(..._parrafos(sec.intro),..._parrafos(sec.desc2));
 if(sec.notas.some(Boolean))partes.push((notasEt||'Notas')+': '+_parrafos(sec.notas).join(' '));
 sec.quotes.forEach(q=>partes.push(q.replace(/['‘’]+"$/,'"')));
 const tags=sec.estilo.join(' ').replace(/["“”'’]/g,' ').replace(/(?:^|\s)[VvXx✓✔√](?=\s)/g,' ').replace(/\s+/g,' ').trim();
 if(tags)partes.push('Estilo: '+tags.split(/\s+(?=[A-ZÁÉÍÓÚÑ])/).join(' · '));
 extra.forEach(x=>partes.push(x));
 const descripcion=partes.filter(Boolean).join('\n\n').replace(/\n{3,}/g,'\n\n').trim();

 if(!rareza){falta.push('rareza');rareza='comun'}
 if(!categoria){falta.push('categoría');categoria='accesorios'}
 if(nom.cor)avisos.push('corregí el nombre a “'+nom.n+'” (parecía mal escaneado)');
 if(ruido)avisos.push('el texto parece de un escaneo (OCR): revisá las palabras mal leídas');
 return {nombre:nom.n,categoria,rareza,descripcion,datos,falta,avisos,tags:tags?1:0}
}

// ===== Escenas de misión: leer un texto pegado (títulos + párrafos) =====
// Detecta "ETAPA 1 — ...", "Escena: ...", títulos de sección (con o sin ":"), listas con o sin número,
// diálogos ("Elias: ...") y une los renglones cortados por el copiado, aunque no haya líneas en blanco.
const _ESC_ETAPA=/^(etapa|cap[ií]tulo|acto|parte)\s+(\d+|[ivxlc]+)\b\s*(?:[—–:\-]+\s*(.*))?$/i;
const _ESC_ESCENA=/^escena\s*(\d+)?\s*[:—–\-]+\s*(.+)$/i;
const _eLetras=s=>s.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g,'');
const _eMay=s=>{const l=_eLetras(s);return l.length>=3&&(l.match(/[A-ZÁÉÍÓÚÑ]/g)||[]).length/l.length>=0.7};
const _eCap=s=>{s=s.replace(/\s+/g,' ').trim();if(!s)return s;if(_eMay(s))s=s.toLowerCase();return s.charAt(0).toUpperCase()+s.slice(1)};
const _eEtapa=s=>_eCap(s).replace(/([—–:\-]\s*)([a-záéíóúñ])/,(m,a,b)=>a+b.toUpperCase());
const _eIni=/^[A-ZÁÉÍÓÚÑ¿¡"“«(]/;
const _eFin=/[.!?:)"”»…]$/;
const _eHabla=/^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñ ]{1,24}:\s+\S/;

function _esTitulo(R,i){
 const s=R[i].s;if(s.length>80)return null;
 let p=i-1;while(p>=0&&!R[p].s)p--;
 const prev=p>=0?R[p].s:'',vacioAntes=i>0&&!R[i-1].s;
 let n=i+1;while(n<R.length&&!R[n].s)n++;
 const next=n<R.length?R[n].s:'';
 const finPrev=!prev||vacioAntes||/[.!?)"”»…]$/.test(prev)||_ESC_ESCENA.test(prev)||_ESC_ETAPA.test(prev);
 const may=/^[A-ZÁÉÍÓÚÑ¿¡]/.test(s),pal=s.split(/\s+/).length;
 if(/^\d+[.)]\s/.test(s)||/^[•◦▪●\-–]\s/.test(s))return null;
 if(_eMay(s)&&!/[.!?]$/.test(s)&&!_eHabla.test(s))return s;
 if(may&&/:$/.test(s)&&finPrev&&pal<=10&&!/[.!?]\s/.test(s))return s;
 if(may&&!/[.!?:,;]/.test(s)&&s.length<=45&&pal<=6&&finPrev&&next&&_eIni.test(next))return s;
 if(may&&s.length<=50&&!/[.!?:,;]/.test(s)&&/\s[—–-]\s[A-ZÁÉÍÓÚÑ]/.test(s)&&pal<=8)return s;
 return null}

function _armarTexto(lines,lista){
 const out=[];let cur=null,modo=lista?'?':'';
 const push=()=>{if(cur){out.push(cur);cur=null}};
 const esItem=s=>/^(\d+[.)])\s+/.test(s)||/^[•◦▪●\-–]\s+/.test(s);
 // junta el renglón k con los siguientes que lo continúan (en minúscula, sin ser ítem ni línea en blanco)
 const frase=k=>{let t=lines[k],j=k+1;while(j<lines.length&&lines[j]&&!esItem(lines[j])&&!_eIni.test(lines[j])){t+=' '+lines[j];j++}return[t,j]};
 for(let k=0;k<lines.length;k++){
  const s=lines[k];
  if(!s){push();if(modo==='bul'||modo==='num')modo='';continue}
  const num=/^(\d+[.)])\s+(.*)$/.exec(s),bul=/^[•◦▪●\-–]\s+(.*)$/.exec(s);
  if(num){push();cur={li:1,t:num[1]+' '+num[2]};modo='num';continue}
  if(bul){push();cur={li:1,t:'• '+bul[1]};modo='bul';continue}
  const may=_eIni.test(s);
  if(modo==='?'){
   if(s.length<=60&&!/[.!?]$/.test(s)){cur={li:1,t:'• '+s};modo='bul';continue}
   modo=''}
  if((modo==='num'||modo==='bul')&&cur){
   if(may){
    const[f,j]=frase(k);
    if(/[.!?]$/.test(f)&&!/[.!?)]$/.test(cur.t)){push();modo='';cur={t:f};k=j-1;continue}   // vuelve el texto normal
    if(modo==='bul'){push();cur={li:1,t:'• '+f};k=j-1;continue}}
   cur.t+=' '+s;continue}
  if(cur&&!cur.li&&!(_eFin.test(cur.t)&&(may||_eHabla.test(s))))cur.t+=' '+s;
  else{push();cur={t:s}}}
 push();
 let res='';
 out.forEach((u,k)=>{
  const t=u.li&&!/^\d/.test(u.t)?u.t.replace(/\)\s+(?=[A-ZÁÉÍÓÚÑ])/g,')\n• '):u.t;
  res+=(k?(u.li&&out[k-1].li?'\n':'\n\n'):'')+t});
 return res.trim()}

function leerEscena(txt){
 const raw=String(txt||'').normalize('NFC').replace(/\r\n?/g,'\n')
  .replace(/[\u00a0\u2000-\u200a\u202f\u205f\u3000]/g,' ').replace(/[\u00ad\u200b-\u200d\u2060\ufeff]/g,'')
  .replace(/([a-záéíóúñü])-\n\s*([a-záéíóúñü])/g,'$1$2');
 const R=raw.split('\n').map(l=>{l=l.trim();
  const m=/^#{1,6}\s+(.+?)\s*#*$/.exec(l)||/^\*\*(.+?)\*\*\s*:?$/.exec(l)||/^__(.+?)__\s*:?$/.exec(l);
  return m?{s:m[1].trim(),h:true}:{s:l.replace(/\*{1,3}/g,''),h:false}});
 const escenas=[];let etapa='',S=null,B=null;
 const cerrarBloque=()=>{if(S&&B&&(B.l.some(Boolean)||B.t))S.bloques.push(B);B=null};
 const cerrarEsc=()=>{cerrarBloque();if(S&&(S.bloques.length||S.titulo))escenas.push(S);S=null};
 for(let i=0;i<R.length;i++){
  const{s,h}=R[i];
  if(!s){if(B)B.l.push('');continue}
  let m;
  if(s.length<=80&&(m=_ESC_ETAPA.exec(s))&&(h||_eMay(s)||/[—–:\-]/.test(s))){cerrarEsc();etapa=_eEtapa(s);continue}
  if(s.length<=120&&(m=_ESC_ESCENA.exec(s))){cerrarEsc();S={etapa,titulo:_eCap(m[2]),bloques:[]};B=null;continue}
  if(!S)S={etapa,titulo:'',bloques:[]};
  const tit=h?s:_esTitulo(R,i);
  if(tit){cerrarBloque();B={t:_eCap(tit.replace(/[:：]\s*$/,'')),l:[],lista:/[:：]\s*$/.test(tit)};continue}
  if(!B)B={t:'',l:[],lista:false};
  B.l.push(s)}
 cerrarEsc();
 const res=escenas.map(e=>({etapa:e.etapa,titulo:e.titulo,bloques:e.bloques.map(b=>({t:b.t||e.titulo||'Narración',x:_armarTexto(b.l,b.lista)})).filter(b=>b.x||b.t)}));
 const avisos=[];
 if(!res.length)avisos.push('no encontré texto para armar la escena');
 res.forEach(e=>{if(e.bloques.length===1&&!e.titulo)avisos.push('no detecté títulos: quedó todo en un solo bloque (podés dividirlo a mano)')});
 return {escenas:res,avisos}}

