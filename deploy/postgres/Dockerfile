FROM postgres:15

# Устанавливаем пакет, содержащий pg_cron
# для Debian (Bullseye) это postgresql-15-cron или postgresql-15-pg-cron
RUN apt-get update && apt-get install -y postgresql-15-cron

# Удаляем кеш apt, чтобы уменьшить образ
RUN rm -rf /var/lib/apt/lists/*

# Добавляем настройку shared_preload_libraries
# 1) либо редактируем /etc/postgresql/postgresql.conf
# 2) либо, если внутри официального образа нет /etc/postgresql/, то
#    можно записать в /docker-entrypoint-initdb.d/ отдельный файл .conf
RUN echo "shared_preload_libraries = 'pg_cron'" >> /etc/postgresql/postgresql.conf  \
  || echo "shared_preload_libraries = 'pg_cron'" >> /docker-entrypoint-initdb.d/00_set_shared_preload.conf
