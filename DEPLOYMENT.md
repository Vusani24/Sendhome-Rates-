# SendHome Rate Calculator Deployment

This project must be deployed as a Node.js app, not as static files only.

The rates work through these local API routes:

- `/api/sendhome/countries`
- `/api/sendhome/calculate`

Those routes are created by `server.js`. If you deploy only `index.html`, `styles.css`, `script.js`, and `assets`, the page will open but the rates will not load.

## Deploy These Files

Upload/deploy the full `home-and-trade-services` folder:

- `server.js`
- `package.json`
- `Procfile`
- `index.html`
- `script.js`
- `styles.css`
- `assets/`

Optional local-only file:

- `start-server.ps1`

## Platform Settings

Use these settings on Render, Railway, Heroku, or any Node hosting provider:

- Runtime: Node.js
- Build command: leave empty or use `npm install`
- Start command: `npm start`
- Port: use the platform-provided `PORT` environment variable

`server.js` already uses:

```js
process.env.PORT || 3200
```

## Important

Do not deploy this to a static-only host unless that host also supports Node/serverless API routes. Static-only hosting cannot proxy the SendHome live rates.

## Local Test

Run:

```bash
npm start
```

Open:

```text
http://localhost:3200/#rates
```
