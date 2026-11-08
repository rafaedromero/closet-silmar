-- El Closet de Silmar · cambios para el panel de administración

-- ─────────────────────────────────────────────────────────────
-- Fotos por procesar
-- Una foto sin procesar vive en el bucket privado "originales";
-- cuando Rafael la procesa, pasa al bucket público "prendas".
-- ─────────────────────────────────────────────────────────────
alter table public.prenda_fotos
  add column procesada boolean not null default true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('originales', 'originales', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

create policy "subir originales" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'originales' and public.es_admin());
create policy "ver originales" on storage.objects
  for select to authenticated
  using (bucket_id = 'originales' and public.es_admin());
create policy "borrar originales" on storage.objects
  for delete to authenticated
  using (bucket_id = 'originales' and public.es_admin());

-- ─────────────────────────────────────────────────────────────
-- Borrador, publicada u oculta
-- publicada_en marca la primera publicación: una prenda que alguna vez
-- se publicó ya no se puede borrar, solo ocultar.
-- ─────────────────────────────────────────────────────────────
alter table public.prendas add column publicada_en timestamptz;
update public.prendas set publicada_en = creada_en where publicada;

create or replace function public.antes_de_guardar_prenda()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.publicada and (tg_op = 'INSERT' or not old.publicada) then
    -- No se publica sin una foto principal procesada
    if tg_op = 'UPDATE' and not exists (
      select 1 from public.prenda_fotos f
      where f.prenda_id = new.id and f.principal and f.procesada
    ) then
      raise exception 'La prenda no tiene una foto procesada' using errcode = 'P0001', hint = 'foto_sin_procesar';
    end if;
    new.publicada_en = coalesce(new.publicada_en, now());
  end if;
  return new;
end;
$$;

create trigger prendas_antes_de_guardar
  before insert or update on public.prendas
  for each row execute function public.antes_de_guardar_prenda();

-- El permiso general de administrar se divide para limitar el borrado
drop policy "administrar prendas" on public.prendas;

create policy "crear prendas" on public.prendas
  for insert to authenticated with check (public.es_admin());
create policy "editar prendas" on public.prendas
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "borrar borradores" on public.prendas
  for delete to authenticated
  using (public.es_admin() and publicada_en is null and vendida_en is null);

-- ─────────────────────────────────────────────────────────────
-- Ordenar la vitrina de una sola vez
-- ─────────────────────────────────────────────────────────────
create or replace function public.ordenar_prendas(ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.es_admin() then
    raise exception 'Sin permiso' using errcode = '42501';
  end if;
  update public.prendas p
  set orden = x.posicion * 10
  from unnest(ids) with ordinality as x(id, posicion)
  where p.id = x.id;
end;
$$;

revoke execute on function public.ordenar_prendas(uuid[]) from public, anon;
grant execute on function public.ordenar_prendas(uuid[]) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- Ajustes: la administradora puede crear y borrar zonas y métodos
-- (ya cubierto por las políticas "administrar"), y editar ajustes.
-- ─────────────────────────────────────────────────────────────
grant insert, update, delete on public.zonas_entrega, public.metodos_pago to authenticated;
