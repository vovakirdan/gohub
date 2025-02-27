# ---- Stage 1: build the React app ----
FROM node:22-alpine AS build
WORKDIR /app

# Копируем package.json, yarn.lock (или package-lock.json) 
COPY package*.json ./
COPY yarn.lock ./
# или COPY package.json yarn.lock ./

RUN yarn install

# Копируем весь код
COPY . .

# Собираем production-бандл
RUN yarn build

# ---- Stage 2: run with Nginx ----
FROM nginx:alpine
# Удалим дефолтный конфиг, если нужно
RUN rm /etc/nginx/conf.d/default.conf

# Копируем сборку из предыдущего stage
COPY --from=build /app/build /usr/share/nginx/html

# Если хотим настроить прокси внутри Nginx, можно добавить конфиг
# Для простоты оставим как есть, без прокси
COPY ./nginx.conf /etc/nginx/conf.d

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
