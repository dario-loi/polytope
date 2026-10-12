// robots.txt: every page may be crawled, and the sitemap is listed. Crawlers read this file
// only at the root of a host, so under a base path (a GitHub Pages project site) it has no
// effect; there, add the sitemap line to the host's own robots.txt or submit it in Search
// Console. It works as is when the docs are deployed at the root, with DOCS_BASE="".
import type { APIRoute } from "astro";
import { u } from "../data/nav";

export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL(u("/sitemap-index.xml"), site).href}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
