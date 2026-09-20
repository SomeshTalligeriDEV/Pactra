import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Opt-in development-only network adapter for the reproducible local demo.
// Public addresses only; production builds always use the recorded fixtures.
const demoPath = process.env.PACTRA_LOCAL_DEMO_CONFIG;
const demo = demoPath ? JSON.parse(readFileSync(demoPath, "utf8")) : null;
if (demo && new URL(demo.rpc).hostname !== "127.0.0.1") throw new Error("Demo RPC must be loopback");
const demoModule = "\0pactra-local-demo-fixtures";

/**
 * Same resolution as `@pactra/site`, and for the same reasons.
 *
 * The design system and the fixtures are consumed as source from sibling
 * packages; a `file:` dependency would not survive a clone, an alias does.
 * Those siblings sit outside this package, so Node resolution from inside them
 * never reaches this package's `node_modules` — the three runtime deps are
 * therefore pointed at this package's copy, at the package DIRECTORY so Vite
 * still reads each package's own `exports` map. Aliasing a deep file bypasses
 * that map and yields a build whose animations never start.
 */
export default defineConfig({
  /* The console ships inside the site's origin, at /console/, which is what
     `lib/links.ts` already assumes and what the routes here are already
     written as. Without this the build emits /assets/… and collides with the
     site's own bundle: same names, one directory, whichever deploys last
     wins and the other surface loads nothing. The trailing slash matters. */
  base: "/console/",
  plugins: [react(), ...(demo ? [{
    name: "pactra-local-demo",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/console") { res.writeHead(302, { Location: "/console/" }); res.end(); return; }
        next();
      });
    },
    configResolved(config: { command: string }) {
      if (config.command === "build") throw new Error("Local demo configuration cannot be used for a production build");
    },
    resolveId(id: string) { if (id === "pactra-local-demo-fixtures") return demoModule; },
    load(id: string) {
      if (id !== demoModule) return;
      const source = JSON.stringify(local("../fixtures/src/index.ts"));
      return `export * from ${source}; import * as base from ${source};
        const d = ${JSON.stringify(demo)};
        export const ARC = {...base.ARC, chainId:31337, name:'Local Anvil demo', rpc:d.rpc, erc20:d.usdc, explorer:'http://127.0.0.1:8660'};
        export const DEPLOYMENT = {...base.DEPLOYMENT, registry:d.registry, vault:d.vault, record:d.record, fromBlock:0};
        export const DEMO = {...base.DEMO, owner:d.owner};
        export const ERC8004 = {...base.ERC8004, identity:d.identity, reputation:d.reputation};`;
    },
  }] : [])],
  resolve: {
    alias: [
      ...(demo ? [{ find: /^@privy-io\/react-auth$/, replacement: local("./src/lib/local-demo-wallet.tsx") }] : []),
      { find: /^pactra-ui$/, replacement: local("../ui/index.ts") },
      { find: /^@pactra\/fixtures$/, replacement: demo ? "pactra-local-demo-fixtures" : local("../fixtures/src/index.ts") },
      { find: /^@pactra\/fixtures\/preview$/, replacement: local("../fixtures/src/preview.ts") },
      { find: /^react$/, replacement: local("./node_modules/react") },
      { find: /^react-dom$/, replacement: local("./node_modules/react-dom") },
      { find: /^framer-motion$/, replacement: local("./node_modules/framer-motion") },
    ],
    dedupe: ["react", "react-dom", "framer-motion"],
  },
  /* `host: true` binds IPv4 as well. Vite's default binds ::1 only, and a
     browser that resolves localhost to 127.0.0.1 then gets nothing. */
  /* PORT lets a harness that already owns 5173 hand this server another one.
     Unset, it keeps the port the other package's links point at. */
  server: { port: Number(process.env.PORT ?? 5173), host: true },
  preview: { port: Number(process.env.PORT ?? 5183), host: true },
});
