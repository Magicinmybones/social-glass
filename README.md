# Friendlyhours social showcase

Production-ready static showcase that composes the three Friendlyhours mobile
screens as isolated live HTML components. It does not use screenshots or
iframes for the displayed screens.

## Local development

```powershell
npm start
```

Open `http://127.0.0.1:4173`. The project must be served over HTTP because the
showcase loads each screen's HTML and CSS as a component.

Run the production integrity check before deployment:

```powershell
npm run check
```

## Production structure

```text
assets/
  css/showcase.css
  js/live-screen.js
screen 1/              # Groups discovery runtime
screen 2/              # Group conversation runtime
screen 3/              # Live room runtime
scripts/
  dev-server.mjs
  verify-production.mjs
index.html
package.json
```

Design sources, reference renders, and the retired Screen 3 build experiment
are stored locally under `.development/`. That directory is intentionally
ignored and must not be deployed.

## Deployment

Deploy the repository root to any static host. Preserve folder names and serve
`index.html` as the entry point.
