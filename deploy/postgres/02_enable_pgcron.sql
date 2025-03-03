-- 1) Подключаем расширение pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Разрешаем pg_cron работать в базе gohub (это нужно, если pg_cron требует superuser)
--   Обычно в docker postgres мы уже под root (postgres), 
--   но если нет -- придется задать cron.database_name = 'gohub' в postgresql.conf.
ALTER DATABASE gohub SET cron.database_name = 'gohub';

-- 3) Настраиваем ежедневную очистку (пример: в 03:00 каждый день)
SELECT cron.schedule(
  'biweekly_cleanup',
  '0 3 * * 0',  -- This will run at 03:00 every two weeks on Sunday
  $$
    DELETE FROM metrics WHERE created_at < NOW() - INTERVAL '30 days'
  $$
);
