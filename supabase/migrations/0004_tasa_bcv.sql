-- El Closet de Silmar · consulta automática de la tasa BCV
--
-- Antes de ejecutar, reemplaza los dos valores marcados con ⟨…⟩:
--   ⟨URL_FUNCION⟩  https://cwqemevmqtyfajjbffzo.supabase.co/functions/v1/tasa-bcv
--   ⟨SECRETO⟩      el mismo valor que guardaste como CRON_SECRETO en la función

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Los datos sensibles van en Vault, no escritos en las tareas
select vault.create_secret('https://cwqemevmqtyfajjbffzo.supabase.co/functions/v1/tasa-bcv', 'tasa_bcv_url', 'Dirección de la función tasa-bcv');
select vault.create_secret('⟨SECRETO⟩', 'tasa_bcv_secreto', 'Secreto que exige la función tasa-bcv');

create or replace function public.consultar_tasa_bcv()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'tasa_bcv_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secreto', (select decrypted_secret from vault.decrypted_secrets where name = 'tasa_bcv_secreto')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
$$;

revoke execute on function public.consultar_tasa_bcv() from public, anon, authenticated;

-- Horarios en UTC (Caracas es UTC-4):
-- días hábiles, cada 30 minutos de 3:00 pm a 7:30 pm, cuando el BCV suele publicar
select cron.schedule('tasa-bcv-tarde', '*/30 19-23 * * 1-5', 'select public.consultar_tasa_bcv()');
-- todos los días a las 8:30 am, por si la tarde anterior falló
select cron.schedule('tasa-bcv-manana', '30 12 * * *', 'select public.consultar_tasa_bcv()');
