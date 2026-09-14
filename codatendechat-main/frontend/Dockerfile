FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash git python3 make g++ \
  && npm install -g serve

COPY frontend/package.json frontend/package-lock.json* frontend/yarn.lock* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile || yarn install; \
    else npm install --legacy-peer-deps; fi

COPY frontend/ .

RUN rm -f .env

ARG REACT_APP_BACKEND_URL=http://localhost:3000
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

ARG REACT_APP_HOURS_CLOSE_TICKETS_AUTO=24
ENV REACT_APP_HOURS_CLOSE_TICKETS_AUTO=$REACT_APP_HOURS_CLOSE_TICKETS_AUTO

ARG STACK_NAME=codatende
ENV STACK_NAME=$STACK_NAME

ARG REACT_APP_COLOR=#682EE3
ENV REACT_APP_COLOR=$REACT_APP_COLOR

ARG REACT_APP_TAB_NAME=Atendechat
ENV REACT_APP_TAB_NAME=$REACT_APP_TAB_NAME

RUN mkdir -p ./brands
COPY brands ./brands

COPY frontend/copy_brand_assets.sh ./
COPY frontend/update_tab_name.sh ./
COPY frontend/update_app_color.sh ./
RUN chmod +x copy_brand_assets.sh update_tab_name.sh update_app_color.sh \
  && ./copy_brand_assets.sh \
  && ./update_tab_name.sh \
  && ./update_app_color.sh \
  && rm -rf ./brands

RUN if [ -f yarn.lock ]; then yarn build; else npm run build; fi

EXPOSE 3001
ENV HOST=0.0.0.0
ENV PORT=3001

CMD ["serve", "-s", "build", "-l", "3001"]
