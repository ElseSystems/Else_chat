FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git openssh-client netcat-openbsd tzdata python3 make g++ \
  && ln -snf /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
  && echo America/Sao_Paulo > /etc/timezone

ENV TZ=America/Sao_Paulo
ENV HOST=0.0.0.0
ENV PORT=3000

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY backend/ .
COPY certificates ./certs-temp

COPY backend/copy_cert_assets.sh ./
RUN chmod +x copy_cert_assets.sh

ARG STACK_NAME=codatende
ENV STACK_NAME=$STACK_NAME

RUN ./copy_cert_assets.sh && rm -rf ./certs-temp

RUN npm install fluent-ffmpeg @ffmpeg-installer/ffmpeg --legacy-peer-deps \
  && npm run build

COPY backend/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

CMD ["/app/docker-entrypoint.sh"]
