// Docs site for the design system. Static output for GitHub Pages or Cloudflare Pages.
// DOCS_SITE and DOCS_BASE set the deploy URL; the defaults suit a GitHub Pages project site.
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

// The page's scripts only enhance what is already drawn, so they load after what the first paint
// needs, the page and its fonts. Astro writes them as module scripts in the head; this marks each
// one low priority in the built pages.
function lowPriorityScripts() {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith(".html") ? [join(dir, e.name)] : []));
  return {
    name: "low-priority-scripts",
    hooks: {
      "astro:build:done": ({ dir }) => {
        for (const file of walk(fileURLToPath(dir))) {
          const html = readFileSync(file, "utf8");
          const out = html.replaceAll('<script type="module" src=', '<script type="module" fetchpriority="low" src=');
          if (out !== html) writeFileSync(file, out);
        }
      },
    },
  };
}

export default defineConfig({
  site,
  base,
  trailingSlash: "ignore",
  integrations: [serveKit(), sitemap(), lowPriorityScripts()],
  // Each page carries its CSS, so nothing holds up the first paint but the page itself.
  build: { inlineStylesheets: "always" },
  // Pages are small and static, so the next one loads while the pointer rests on its link.
  prefetch: { prefetchAll: true, defaultStrategy: "hover" },
  vite: {
    server: { fs: { allow: [root] } },
    ssr: { noExternal: ["@dario-loi/polytope"] },
  },
});
