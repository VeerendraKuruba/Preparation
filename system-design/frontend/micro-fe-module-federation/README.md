# Micro frontends demo: Catalog + Checkout (Module Federation)

This is a **small, readable** example of [Webpack 5 Module Federation](https://webpack.js.org/concepts/module-federation/):

| Piece | URL (dev) | Role |
|-------|-----------|------|
| **Host (shell)** | `http://localhost:3000/` | Layout, navigation, React Router; lazy-loads remotes |
| **Catalog remote** | `http://localhost:3000/catalog/…` | Exposes `CatalogApp` (`remoteEntry.js` lives here) |
| **Checkout remote** | `http://localhost:3000/checkout/…` | Exposes `CheckoutApp` |

**One dev server, one port** — the shell and both remotes are built together (webpack **multi-compiler**) so you get a normal **SPA-style** origin: no separate ports for catalog/checkout in dev.

## How it fits together

1. You open `http://localhost:3000` — only the **host** bundle runs first.
2. When you go to `/catalog`, the host **lazy-loads** `/catalog/remoteEntry.js` and renders `CatalogApp`.
3. When you go to `/checkout`, it loads `/checkout/remoteEntry.js` the same way.
4. **React**, **React DOM**, and **react-router-dom** are marked `shared` + `singleton` so the browser loads **one** copy (avoids “two Reacts” bugs).

## Run it (one terminal)

From this folder (`micro-fe-module-federation`):

```bash
npm install
npm start
```

Open **http://localhost:3000**. Use **Catalog** / **Checkout** in the nav.

You can also run `npm start` from `host/` — it uses the same root `webpack.config.js` (re-exported by `host/webpack.config.js`).

**Optional — remotes on their own ports** (older style): `catalog/webpack.config.js` and `checkout/webpack.config.js` still start **3001** / **3002** if you `cd catalog && npm start` (useful for debugging a remote alone). The host in **`webpack.config.js` at repo root** is what you want for single-origin SPA dev.

## Remote releases: how does the host know the “right” version?

**Important:** Module Federation does **not** auto-resolve a remote’s **bundle** version the way npm resolves package versions. The host only knows what you put in `remotes`—usually a **URL** to `remoteEntry.js` (see `webpack.config.js`). Whatever that URL returns **at request time** is what runs.

Common ways teams pin or roll out remote versions:

| Approach | Idea |
|----------|------|
| **Versioned URL** | Deploy each release to a unique path, e.g. `https://cdn.example.com/catalog/v2.3.1/remoteEntry.js`. To move traffic to a new build, you **change the URL** the host uses (redeploy host, env var, or config). |
| **Content-hashed assets + fresh `remoteEntry`** | Webpack emits hashed chunk files; `remoteEntry.js` points at them. When you deploy a new catalog, **upload new files** and ensure **CDN/browser caches** don’t serve a stale `remoteEntry.js` (short TTL or cache bust on that file). Users then load the new manifest automatically **without** changing the host URL—if the URL’s contents actually update. |
| **Runtime config / manifest** | Host loads a small JSON (or config service) that lists current `remoteEntry` URLs per environment. Ops or release tooling updates that file; the shell picks up new remotes **without** rebuilding the host (still a deliberate rollout, not magic semver). |
| **Contract + compatibility** | Teams agree that remotes stay **backward compatible** with the shell for a window (props, routes, shared library ranges). Breaking changes require a coordinated host + remote rollout or a new versioned URL. |

The `shared` block’s **`requiredVersion`** (e.g. for React) controls **library** compatibility between host and remotes—it does **not** select which deployed **remote app** build to load. That selection is always **URL / config / deploy process**.

## Why React is in `package.json` for the host *and* each remote

Each app lists **React** (and **react-router-dom**) because:

1. **Build time** — The bundler must resolve `import 'react'` and compile JSX while building that app’s bundle.
2. **Standalone dev** — When you run only `catalog` on its own dev server, that app **is** the full page; it needs its own dependency tree.
3. **Runtime when composed** — In `ModuleFederationPlugin`, **`shared`** + **`singleton: true`** tells webpack: at runtime, prefer **one** shared instance (typically the host’s) so you don’t get two Reacts. The remote still **ships fallback code** if the shell didn’t provide a compatible version—useful for standalone or mismatched deploys.

The **workspace root** `package.json` also lists React so **npm workspaces** can hoist dependencies and webpack can resolve them when using the shared root `webpack.config.js`.

## Files to read (in order)

1. `webpack.config.js` (repo root) — one dev server: `remotes` → `/catalog/remoteEntry.js` and `/checkout/remoteEntry.js` on port **3000**  
2. `catalog/webpack.config.js` / `checkout/webpack.config.js` — optional standalone dev on **3001** / **3002**  
3. `host/src/App.js` — `lazy(() => import('catalog/Catalog'))` style loading  

## Production note

Point `publicPath` and `remotes` at real CDN (or origin) URLs. Treat **`remoteEntry.js` caching** as part of your release: either immutable versioned URLs or strict cache rules so users don’t stay on an old remote after you ship.
