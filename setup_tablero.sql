-- setup_tablero.sql  ·  Tablero compartido en vivo (fase 2): cuadrícula, fondo y fichas que ven los jugadores
-- ADICIÓN: correr UNA sola vez en Supabase > SQL Editor (después de setup_optimizacion_a.sql).
-- No toca tienda ni inventario: no hace falta copia de seguridad.
--
-- Quién hace qué:
--   · Quien dirige la mesa (es_director) arma y mueve todo.
--   · Los jugadores solo reciben, por función, lo que el DM dejó a la vista (fichas ocultas NO salen del servidor)
--     y, si el DM lo permite, pueden mover SU propia ficha.
-- Las fichas viven en celdas (a, b), no en píxeles.

-- 1) Estado del tablero (una sola fila) ------------------------------------------------------------
create table if not exists public.tablero_estado (
  id          int primary key check (id = 1),
  activo      boolean not null default false,            -- los jugadores lo ven solo si está activo
  jug_mueven  boolean not null default false,            -- los jugadores pueden mover su propia ficha
  forma       text not null default 'hex'   check (forma in ('hex', 'cuad')),
  orient      text not null default 'punta' check (orient in ('punta', 'plano')),
  size        int  not null default 56  check (size between 24 and 140),
  ox          int  not null default 0   check (ox between -140 and 140),
  oy          int  not null default 0   check (oy between -140 and 140),
  ver         boolean not null default true,
  color       text not null default '#ffffff' check (color ~ '^#[0-9a-fA-F]{6}$'),
  alpha       numeric not null default 0.45 check (alpha between 0.05 and 1),
  bg_tipo     text not null default '' check (bg_tipo in ('', 'image', 'video')),
  bg_url      text not null default '',
  actualizado timestamptz not null default now()
);
insert into public.tablero_estado (id) values (1) on conflict (id) do nothing;

-- 2) Fichas ------------------------------------------------------------------------------------------
create table if not exists public.tablero_fichas (
  id          text primary key check (length(id) between 1 and 40),
  tipo        text not null check (tipo in ('pj', 'criatura')),
  nombre      text not null default '' check (length(nombre) <= 40),
  em          text not null default '❓' check (length(em) <= 16),
  imagen      text not null default '',
  tam         int  not null default 1 check (tam in (1, 2)),
  a           int  not null default 0 check (a between -500 and 500),
  b           int  not null default 0 check (b between -500 and 500),
  jugador     uuid references public.profiles(id) on delete set null,       -- de quién es (solo PJ)
  criatura_id bigint references public.criaturas(id) on delete set null,
  visible     boolean not null default true,
  creado      timestamptz not null default now()
);

alter table public.tablero_estado enable row level security;
alter table public.tablero_fichas enable row level security;

-- Directo a las tablas solo el que dirige la mesa; los demás pasan por tablero_ver / tablero_mover.
drop policy if exists "tablero_estado director" on public.tablero_estado;
create policy "tablero_estado director" on public.tablero_estado
  for all to authenticated using (public.es_director()) with check (public.es_director());
drop policy if exists "tablero_fichas director" on public.tablero_fichas;
create policy "tablero_fichas director" on public.tablero_fichas
  for all to authenticated using (public.es_director()) with check (public.es_director());

-- 3) Lo que ve cada uno ------------------------------------------------------------------------------
-- Jugadores: nada si el tablero está apagado; si está prendido, solo las fichas visibles.
-- Quien dirige: todo (con la marca "vis" para saber cuáles están ocultas).
create or replace function public.tablero_ver() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e tablero_estado%rowtype; dir boolean;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
  dir := es_director();
  select * into e from tablero_estado where id = 1;
  if not found or (not e.activo and not dir) then
    return jsonb_build_object('activo', false, 'dir', dir);
  end if;
  return jsonb_build_object(
    'activo', e.activo, 'dir', dir, 'yo', pj_actual(), 'mover', e.jug_mueven,
    'cfg', jsonb_build_object(
      'forma', e.forma, 'orient', e.orient, 'size', e.size, 'ox', e.ox, 'oy', e.oy,
      'ver', e.ver, 'color', e.color, 'alpha', e.alpha,
      'bg', jsonb_build_object('tipo', e.bg_tipo, 'url', e.bg_url)),
    'fichas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'tipo', f.tipo, 'nombre', f.nombre, 'em', f.em, 'imagen', f.imagen,
               'tam', f.tam, 'a', f.a, 'b', f.b, 'jugador', f.jugador, 'cid', f.criatura_id, 'vis', f.visible)
             order by f.creado, f.id)
        from tablero_fichas f
       where dir or f.visible), '[]'::jsonb));
end $$;

-- 4) Mover una ficha -------------------------------------------------------------------------------------
-- El que dirige mueve cualquiera. Un jugador, solo su propia ficha, y solo si el DM lo permitió.
create or replace function public.tablero_mover(p_id text, p_a int, p_b int) returns void
language plpgsql security definer set search_path = public as $$
declare f tablero_fichas%rowtype; e tablero_estado%rowtype;
begin
  if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
  if p_a is null or p_b is null or abs(p_a) > 500 or abs(p_b) > 500 then raise exception 'Celda inválida'; end if;
  select * into f from tablero_fichas where id = p_id for update;
  if not found then raise exception 'Esa ficha ya no está en el tablero'; end if;
  if not es_director() then
    select * into e from tablero_estado where id = 1;
    if not coalesce(e.activo, false) then raise exception 'El tablero no está activo'; end if;
    if not e.jug_mueven then raise exception 'El DM no dejó mover fichas'; end if;
    if f.tipo <> 'pj' or f.jugador is distinct from pj_actual() or not f.visible then
      raise exception 'Solo podés mover tu propia ficha';
    end if;
  end if;
  update tablero_fichas set a = p_a, b = p_b where id = p_id;
end $$;

revoke all on function public.tablero_ver()                   from public, anon;
revoke all on function public.tablero_mover(text, int, int)   from public, anon;
grant execute on function public.tablero_ver()                  to authenticated;
grant execute on function public.tablero_mover(text, int, int)  to authenticated;

-- 5) Fondos (foto, GIF o video corto): bucket público, solo DM y sub-DM suben y borran ------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tablero', 'tablero', true, 31457280,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'])
on conflict (id) do update
  set public = true, file_size_limit = 31457280,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

drop policy if exists "tablero dm sube" on storage.objects;
create policy "tablero dm sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'tablero' and public.es_master());
drop policy if exists "tablero dm borra" on storage.objects;
create policy "tablero dm borra" on storage.objects
  for delete to authenticated using (bucket_id = 'tablero' and public.es_master());
