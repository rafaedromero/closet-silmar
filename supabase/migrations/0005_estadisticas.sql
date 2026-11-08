-- El Closet de Silmar · estadísticas para el panel
-- Resume los eventos de un período en una sola consulta (sin el límite de filas de la API).

create or replace function public.estadisticas_panel(desde timestamptz default '-infinity')
returns jsonb
language sql
stable
security invoker  -- respeta los permisos: solo las administradoras pueden leer eventos
set search_path = ''
as $$
  select jsonb_build_object(
    'visitantes', (select count(distinct e.sesion) from public.eventos e where e.creado_en >= desde),
    'vendidas', (select count(*) from public.prendas p where p.vendida_en >= desde),
    'prendas', coalesce((
      select jsonb_agg(fila)
      from (
        select
          e.prenda_id,
          count(*) filter (where e.tipo = 'vista')    as vistas,
          count(*) filter (where e.tipo = 'me_gusta') as me_gusta,
          count(*) filter (where e.tipo = 'paso')     as pasos,
          count(*) filter (where e.tipo = 'ficha')    as fichas,
          count(*) filter (where e.tipo = 'whatsapp') as whatsapp
        from public.eventos e
        where e.creado_en >= desde
        group by e.prenda_id
      ) fila
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.estadisticas_panel(timestamptz) from public, anon;
grant execute on function public.estadisticas_panel(timestamptz) to authenticated;
