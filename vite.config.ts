/**
 * Rewrite clean round URLs (`/round/N`) to the round page
 * (`/round.html?level=N`) in the dev and preview servers.
 */
function roundPageRewrite() {
  function rewrite(url: string): string | undefined {
    const match = /^\/round\/(\d+)(?:\?(.*))?$/.exec(url);
    if (!match) return undefined;
    const query = match[2] ? `?${match[2]}` : "";
    return `/round.html?level=${match[1]}${query}`;
  }

  function middleware() {
    return (req: { url?: string }, _res: unknown, next: () => void) => {
      const target = rewrite(req.url ?? "");
      if (target) req.url = target;
      next();
    };
  }

  return {
    name: "round-page-rewrite",
    configureServer(server: { middlewares: { use(fn: unknown): void } }) {
      server.middlewares.use(middleware());
    },
    configurePreviewServer(
      server: { middlewares: { use(fn: unknown): void } },
    ) {
      server.middlewares.use(middleware());
    },
  };
}

export default {
  plugins: [roundPageRewrite()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        round: "round.html",
      },
    },
  },
};
