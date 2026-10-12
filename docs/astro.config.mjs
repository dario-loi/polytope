// Docs site for the design system. Static output for GitHub Pages or Cloudflare Pages.
// DOCS_SITE and DOCS_BASE set the deploy URL; the defaults suit a GitHub Pages project site.
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const site = process.env.DOCS_SITE ?? "https://dario-loi.github.io";
const base = process.env.DOCS_BASE ?? "/polytope";

// Serve the built kit at <site><base>/kit/ so any static page can link polytope.css directly.
function serveKit() {
  return {
    name: "serve-kit",
    hooks: {
      "astro:config:setup": () => {
        const from = new URL("../dist", import.meta.url);
        const to = new URL("./public/kit", import.meta.url);
        if (!existsSync(from)) throw new Error("Run `npm run build` at the repo root first.");
        rmSync(to, { recursive: true, force: true });
        mkdirSync(to, { recursive: true });
        cpSync(from, to, { recursive: true });
      },
    },
  };
}

export default defineConfig({
  site,
  base,
  trailingSlash: "ignore",
  integrations: [serveKit(), sitemap()],
  // Pages are small and static, so the next one loads while the pointer rests on its link.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  vite: {
    server: { fs: { allow: [root] } },
    ssr: { noExternal: ["@dario-loi/polytope"] },
  },
});
