FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node server.cjs mid-autumn.html package.json ./
COPY --chown=node:node frontend ./frontend
RUN mkdir /data && chown node:node /data
USER node
ENV HOST=0.0.0.0 PORT=8787 DB_PATH=/data/messages.sqlite
EXPOSE 8787
CMD ["node", "server.cjs"]
