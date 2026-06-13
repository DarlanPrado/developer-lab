# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable && corepack prepare pnpm@10 --activate

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm run -r build
RUN pnpm deploy --filter=@developer-lab/api --prod --legacy /prod/api

FROM node:22-alpine AS runner
RUN apk add --no-cache su-exec
RUN addgroup -S lab && adduser -S -G lab lab
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=lab:lab /prod/api ./
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p data && chown lab:lab data
EXPOSE 3001
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
