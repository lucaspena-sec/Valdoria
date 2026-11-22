-- setup_eliminar_cuenta.sql  ·  El DM principal puede eliminar una cuenta completa (usuario + personajes)
-- ADICIÓN: correr UNA sola vez en Supabase > SQL Editor (después de setup_acceso.sql).
-- No toca tienda ni inventario: no hace falta copia de seguridad (igual conviene bajarla antes de eliminar a alguien).
--
-- Borra la cuenta, todos sus personajes, fichas, ítems y oro. Lo que creó como sub-DM (ítems, criaturas, escenarios...)
-- pasa a ser del DM principal para que no se pierda. No se puede eliminar la cuenta del DM ni a alguien que está en el combate.

create or replace function public.dm_eliminar_cuenta(p_cuenta uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare nom text; n int; t text;
begin
  if not es_dm() then raise exception 'Solo el DM principal'; end if;
  if p_cuenta = auth.uid() or exists (select 1 from profiles where cuenta_id = p_cuenta and is_dm) then
    raise exception 'No se puede eliminar la cuenta del DM';
  end if;
  select username into nom from profiles where cuenta_id = p_cuenta order by creado limit 1;
  if nom is null then raise exception 'Cuenta inexistente'; end if;
  if exists (select 1 from combatientes c join profiles p on p.id = c.jugador where p.cuenta_id = p_cuenta) then
    raise exception 'Esa cuenta tiene un personaje en el combate: sacalo primero';
  end if;
  select count(*) into n from profiles where cuenta_id = p_cuenta;

  -- lo que creó como sub-DM pasa al DM principal
  perform set_config('valdoria.transferir', '1', true);
  foreach t in array array['items','mercaderes','criaturas','escenarios','encuentros','loots'] loop
    execute format('update public.%I set creador = %L where creador = %L', t, auth.uid(), p_cuenta);
  end loop;

  delete from tiradas where user_id in (select id from profiles where cuenta_id = p_cuenta);
  insert into registro (usuario_id, usuario, tipo, detalle)
  values (null, nom, 'dm', 'El DM eliminó la cuenta de ' || nom || ' (' || n || ' personaje' || (case when n = 1 then '' else 's' end) || ')');

  -- borra la cuenta; en cascada se van perfiles, fichas, inventarios, rol de sub-DM, etc.
  delete from auth.users where id = p_cuenta;
  return jsonb_build_object('ok', true, 'personajes', n);
end $$;

revoke all on function public.dm_eliminar_cuenta(uuid) from public, anon;
grant execute on function public.dm_eliminar_cuenta(uuid) to authenticated;
