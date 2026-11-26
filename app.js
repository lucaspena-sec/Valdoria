// Datos de tu proyecto de Supabase (Project Settings > API)
const SUPABASE_URL = 'https://ljvjkpdyczpltqnrpwam.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gGf6x3H7-b0hqsm8YZ6f_g_ulNay1Sd';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Escapa texto para meterlo en HTML (lo usan todas las páginas)
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>'&#'+c.charCodeAt(0)+';');

// Unidad de distancia que prefiere ver cada persona en este dispositivo: 'ft' (pies) o 'm' (metros)
const getU=()=>{try{return localStorage.getItem('unidad')||'ft'}catch(e){return 'ft'}};
function cambiarUnidad(v){try{localStorage.setItem('unidad',v)}catch(e){}if(typeof reUnidad=='function')reUnidad();else location.reload()}

// El usuario escribe solo un nombre; internamente se usa como mail falso
const limpio = u => u.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
const mail = u => limpio(u) + '@valdoria.app';

// Devuelve el personaje ACTIVO de la cuenta (cada personaje es una fila de profiles).
// Si no hay ninguno activo, manda a elegir uno (salvo en la propia pantalla de personajes).
async function perfil(opc) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.href = 'index.html'; return null; }
  let { data, error } = await sb.from('profiles').select('*').eq('cuenta_id', session.user.id).eq('es_actual', true).is('borrado_en', null).limit(1);
  if (error) { // base de datos todavía sin setup_personajes.sql: funciona como antes
    const r = await sb.from('profiles').select('*').eq('id', session.user.id).single();
    return await _rol(r.data);
  }
  const p = data && data[0];
  if (!p) { if (!(opc && opc.sinPJ)) location.href = 'personajes.html'; return null; }
  return await _rol(p);
}
// Rol de la cuenta: DM principal, sub-DM, y quién dirige la mesa (si todavía no corriste setup_subdm.sql, todo sigue como antes)
async function _rol(p) {
  if (!p) return p;
  let rol = null;
  try { const r = await sb.rpc('mi_rol'); if (!r.error && r.data) rol = r.data; } catch (e) {}
  if (!rol) rol = { dm: !!p.is_dm, subdm: false, master: !!p.is_dm, dirige: !!p.is_dm, director: null, director_nombre: null };
  p.master = !!rol.master; p.subdm = !!rol.subdm; p.dirige = !!rol.dirige; p.mesa = rol.director ? (rol.director_nombre || '?') : ''; p.espia = !!rol.espia; p.espiaHasta = rol.espia_hasta || null; p.pendientes = rol.pendientes || 0; p.cambiarClave = !!rol.cambiar_clave;
  if (p.cambiarClave && !/clave\.html$/.test(location.pathname)) location.href = 'clave.html';
  return p;
}
async function espiaOff() { await sb.rpc('espiar_off'); location.reload(); }
async function salir() { await sb.auth.signOut(); location.href = 'index.html'; }

async function cabecera(titulo) {
  const p = await perfil(); if (!p) return null;
  document.getElementById('cab').innerHTML =
   `<div class="tb"><span>⚔ ${titulo}</span><span>👤 ${p.username}${p.is_dm?' 👑 DM':p.subdm?' 🎭 Sub-DM':''}${p.nombre&&p.nombre!==p.username?' · 🧙 '+p.nombre.replace(/[<>&"]/g,''):''} · 💰 <span id="oro">${p.gold}</span> po</span></div>
    <div class="nav"><a href="main.html">Inicio</a><a href="tienda.html">Tienda</a><a href="equipo.html">Equipamiento</a><a href="ficha.html">Ficha PJ</a><a href="combate.html">Combate</a><a href="escenario.html">Escenario</a><a href="tablero.html">Tablero</a><a href="bestiario.html">Bestiario</a><a href="novedades.html">Novedades</a><a href="torre.html">Torre</a>${p.master?'<a href="dm.html">Panel DM'+(p.pendientes?' 🔔'+p.pendientes:'')+'</a>':''}${p.is_dm?'':'<a href="personajes.html?cambiar=1">🔄 Personaje</a>'}<a href="clave.html">🔑 Mi clave</a><a href="#" onclick="salir();return false">Salir</a><span class="uni">📏 <label><input type="radio" name="un" style="width:auto" ${getU()=='ft'?'checked':''} onchange="cambiarUnidad('ft')"> Pies</label> <label><input type="radio" name="un" style="width:auto" ${getU()=='m'?'checked':''} onchange="cambiarUnidad('m')"> Metros</label></span></div>${p.mesa?'<div class="mesabar">🎬 Dirige la mesa: <b>'+String(p.mesa).replace(/[<>&"]/g,'')+'</b>'+(p.dirige&&!p.is_dm?' (vos)':'')+'</div>':''}${p.espia?'<div class="mesabar espia">🕵 Modo espía activo hasta '+new Date(p.espiaHasta).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})+' · <a href="#" style="color:#ffd54a" onclick="espiaOff();return false">Desactivar</a></div>':''}`;
  return p;
}
