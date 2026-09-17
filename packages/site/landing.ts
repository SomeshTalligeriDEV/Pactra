import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin, ResolvedConfig } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));

/** Root is static HTML; all existing product/docs/record routes keep their SPA. */
export function staticLanding(consoleUrl?: string): Plugin {
  let config: ResolvedConfig;
  const route = (req: { url?: string; headers: { accept?: string } }, res: {
    writeHead: (status: number, headers: Record<string, string>) => unknown;
    end: (body?: string) => unknown;
  }, next: () => void) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (["/hero", "/hero/", "/hero/index.html"].includes(url.pathname)) {
      res.writeHead(302, { Location: "/" });
      res.end();
      return;
    }
    if (["/case-studies", "/case-studies/", "/case-studies/index.html"].includes(url.pathname)) {
      res.writeHead(302, { Location: "/#case-studies" });
      res.end();
      return;
    }
    // Document routing only: APIs, console, assets, and Vite's internals pass through.
    if (url.pathname !== "/" &&
        !url.pathname.startsWith("/console") && !url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/@") && !url.pathname.split("/").pop()?.includes(".")) {
      req.url = `/app.html${url.search}`;
    }
    next();
  };
  return {
    name: "pactra-static-landing",
    configResolved(resolved) { config = resolved; },
    configureServer(server) { server.middlewares.use(route); },
    configurePreviewServer(server) { server.middlewares.use(route); },
    closeBundle() {
      if (config.command !== "build") return;
      const destination = resolve(root, config.build.outDir);
      mkdirSync(destination, { recursive: true });
      for (const name of ["styles.css", "main.js", "assets", "fonts", "case-studies"]) {
        cpSync(resolve(root, name), resolve(destination, name), { recursive: true });
      }
      let html = readFileSync(resolve(root, "index.html"), "utf8");
      if (consoleUrl) {
        const base = consoleUrl.replace(/\/$/, "");
        const escaped = base.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
        html = html.replaceAll('href="/console/"', `href="${escaped}/"`)
          .replaceAll('href="/console/new"', `href="${escaped}/new"`);
      }
      writeFileSync(resolve(destination, "index.html"), html);
    },
  };
}
