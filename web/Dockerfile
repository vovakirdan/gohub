# ---- Stage 1: build the React app ----
FROM node:22-alpine AS build
WORKDIR /app

# Копируем package.json и lock-файл
COPY package.json package-lock.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем весь код проекта
COPY . .

# Собираем production-бандл
RUN npm run build

# ---- Stage 2: run with Nginx ----
FROM nginx:alpine

# Удаляем дефолтный конфиг (если он там есть)
RUN rm -f /etc/nginx/conf.d/default.conf

# Копируем Nginx конфигурацию в правильное место
COPY nginx.conf /etc/nginx/nginx.conf

# Копируем собранный фронтенд
COPY --from=build /app/dist /usr/share/nginx/html

# Открываем порт
EXPOSE 80

# Запуск Nginx
CMD ["nginx", "-g", "daemon off;"]
    