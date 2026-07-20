import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      name: "level-route",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url?.match(/^\/level\/\d+/)) {
            req.url = "/level.html";
          }
          next();
        });
      },
    },
  ],
});
