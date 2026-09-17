# Static landing integration

The canonical landing files are `index.html`, `styles.css`, `main.js`,
`assets/logo.webp`, and `fonts/GeistPixel-Circle.woff2` in this directory.
They work with a plain static HTTP server; no React or build step is needed
for the landing itself. `fonts/OFL.txt` accompanies the local fallback font.
The previous `hero/` entry links to these same files so it cannot drift into
a second implementation; integrated requests to `/hero/` redirect home.

The supplied video and OnlineWebFonts/Google Fonts/Font Awesome URLs are used
unchanged. Bubbledot is loaded exclusively from OnlineWebFonts. The local
Geist Pixel Circle fallback comes from the official
[Vercel font repository](https://github.com/vercel/geist-font).

The final copy is adapted to Pactra, following the request to make this the
application's complete product page: one shared root budget, three core
contracts, three integration paths, and no private keys in the agent tools.
These describe the architecture, not live telemetry or uptime promises. No
enterprise adoption claim or customer logos are presented.

The video hero occupies the first viewport. The original product sections and visual design now
continue below it: the claim, two delegation trees, owner overrides, the
Paid/Refused purchase walkthrough, Arc charts, record statistics, and MCP
setup. Their original rendered markup and CSS are preserved in the static
files; product CSS is scoped to `#product` so it cannot change the hero.
Vanilla JavaScript drives the trees, scenario tabs, step controls, and
play/pause. These are illustrations and send no transactions. Purchase
states live in HTML templates, retaining the original proof links.
The original React sources remain under `src/sections` and `src/parts`.

## Existing application routes

| Link | Destination |
| --- | --- |
| Home / logo | `/` — standalone landing |
| Product | `#product` — restored product sections below the hero |
| Case Studies | `#case-studies` — recorded payment and refusal examples, available on plain static servers |
| Contact | `https://github.com/SomeshTalligeriDEV/pactra/issues` |
| Sign in | `/console/` — existing wallet/console flow |
| Get Started | `/console/new` — existing mandate setup |

`/docs`, `/docs/:slug`, `/agent/:id`, `/refusal/:id`, `/attest/:id`, and `/drill`
retain the original SPA. `/product` also retains the complete original product
application. Old section paths such as `/how` land on `/product#how`; `/#how`
now scrolls to the restored static comparison. Returning home from a SPA link
loads the static document.

## Development and deployment

`npm run dev` serves both the static landing and the existing application.
The local `/console` proxy defaults to `http://127.0.0.1:5173`; set
`PACTRA_CONSOLE_ORIGIN` if the separately running console uses another origin.
This proxy applies only to Vite development/preview. Production nginx still
serves the console from its own unchanged `/console/` build.

`npm run build` builds `app.html` for existing application routes and copies
the five static landing paths into `dist/` without bundling a framework into
the home page. A configured `VITE_CONSOLE_URL` is applied to the home page's
console links at build time, matching the existing product site's setting.

Deploy the updated nginx routing snippet together with the new site bundle:
the fallback for application routes is now `app.html`, while `/` serves
`index.html`. The bootstrap configuration and deployment checks use the same
split. `/api/` and `/console/` retain their existing dedicated locations.
The unversioned logo is revalidated rather than cached as an immutable hashed
asset. No payment, wallet, contract, daemon, or meter code is changed.

## Static preview route compatibility

Plain HTTP servers cannot serve SPA routes. `drill/index.html` is a source-only
redirect for stale Case Studies links in the standalone preview; it is not
copied into the production bundle, where `/drill` remains the evidence app.
`case-studies/index.html` supplies a static alias to `/#case-studies` and is
included in the build. Both aliases are available in the `hero/` preview.
