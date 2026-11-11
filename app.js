// Datos de tu proyecto de Supabase (Project Settings > API)
const SUPABASE_URL = 'https://ljvjkpdyczpltqnrpwam.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gGf6x3H7-b0hqsm8YZ6f_g_ulNay1Sd';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Unidad de distancia que prefiere ver cada persona en este dispositivo: 'ft' (pies) o 'm' (metros)
const getU=()=>{try{return localStorage.getItem('unidad')||'ft'}catch(e){return 'ft'}};
function cambiarUnidad(v){try{localStorage.setItem('unidad',v)}catch(e){}if(typeof reUnidad=='function')reUnidad();else location.reload()}

// El usuario escribe solo un nombre; internamente se usa como mail falso
const limpio = u => u.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
const mail = u => limpio(u) + '@valdoria.app';

async function perfil() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.href = 'index.html'; return null; }
  const { data } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  return data;
}
async function salir() { await sb.auth.signOut(); location.href = 'index.html'; }

async function cabecera(titulo) {
  const p = await perfil(); if (!p) return null;
  document.getElementById('cab').innerHTML =
   `<div class="tb"><span>⚔ ${titulo}</span><span>👤 ${p.username} · 💰 <span id="oro">${p.gold}</span> po</span></div>
    <div class="nav"><a href="main.html">Inicio</a><a href="tienda.html">Tienda</a><a href="equipo.html">Equipamiento</a><a href="ficha.html">Ficha PJ</a><a href="novedades.html">Novedades</a><a href="torre.html">Torre</a>${p.is_dm?'<a href="dm.html">Panel DM</a>':''}<a href="#" onclick="salir();return false">Salir</a><span class="uni">📏 <label><input type="radio" name="un" style="width:auto" ${getU()=='ft'?'checked':''} onchange="cambiarUnidad('ft')"> Pies</label> <label><input type="radio" name="un" style="width:auto" ${getU()=='m'?'checked':''} onchange="cambiarUnidad('m')"> Metros</label></span></div>`;
  return p;
}
