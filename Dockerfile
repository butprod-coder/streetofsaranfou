FROM node:24-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install --global pnpm@11.19.0 && pnpm install --prod --frozen-lockfile --ignore-scripts
COPY --chown=node:node index.html ./
COPY --chown=node:node game ./game
COPY --chown=node:node server ./server
COPY --chown=node:node styles ./styles
COPY --chown=node:node assets ./assets
USER node
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js"]
