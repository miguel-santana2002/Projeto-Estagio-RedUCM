FROM node:20.14.0 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN chmod +x ./node_modules/.bin/ng  
ENV PATH ./node_modules/.bin:$PATH

# Faz o build e lista o conteúdo da pasta atual para debug imediato
RUN npm run build
RUN ls -la /app
RUN ls -la /app/dist || true


FROM nginx:alpine

# Copia o conteúdo da pasta dist (seja qual for o subdiretório)
COPY --from=build /backend/config/static/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN chmod -R 777 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]