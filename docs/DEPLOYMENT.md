# Deploy MenuMate AI on Render

This guide prepares a production deploy. Nothing in this repository is deployed yet. Follow the steps yourself, then confirm the live URL before telling anyone the app is online.

MenuMate AI is a single Node process. The production build serves the React app and the API from the same origin, so the browser calls relative `/api` paths. No separate frontend host is required.

## What you need

- A [Render](https://render.com) account.
- This Git repository connected to Render.
- A Google AI Studio API key if you want translation and description improvement. The menu editor, sample menu, PDF export, and QR codes work without it.
- A **paid** Render instance if you want the SQLite file to survive deploys. Render persistent disks are not available on the free instance type. On the free instance the database lives on an ephemeral disk and is wiped on the next deploy or restart.

## Create the service

1. In the Render dashboard, create a **Web Service** from this repository.
2. Use these commands:

   | Setting | Value |
   | --- | --- |
   | Runtime | Node |
   | Build command | `npm ci && npm run build` |
   | Start command | `npm start` |
   | Health check path | `/api/health` |

3. Set the Node version to 22 or newer (`NODE_VERSION=22`). The project declares `"node": ">=22.0.0"`.
4. Attach a persistent disk (paid plan) and mount it at `/var/data`.
5. Set the environment variables below, then deploy.

A starter Blueprint is in [`render.yaml`](../render.yaml) at the repository root. Applying that Blueprint creates the service definition. You still have to supply `APP_BASE_URL` and `GEMMA_API_KEY` in the dashboard (`sync: false`). Review the plan and disk size before you apply it. Applying the Blueprint is a manual step; this repository does not deploy itself.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | Yes | Set to `production`. |
| `PORT` | Automatic | Render sets this. The server reads it. |
| `DATABASE_PATH` | Yes | SQLite file on the persistent disk, for example `/var/data/menumate.sqlite`. The directory must be the disk mount path. |
| `APP_BASE_URL` | Yes | The public origin with no trailing slash, for example `https://menumate-ai.onrender.com`. QR codes and the copy-link button use this value. A localhost value is labeled as local-only in the app. |
| `GEMMA_API_KEY` | For AI only | Google AI Studio key. Leave empty to disable AI. The key stays on the server. |
| `GEMMA_PROVIDER` | No | `google` (default) or `openai-compatible`. |
| `GEMMA_MODEL` | No | Default `gemma-4-31b-it`. Also supported on the Gemini API: `gemma-4-26b-a4b-it`. |
| `GEMMA_API_BASE_URL` | No | Default `https://generativelanguage.googleapis.com/v1beta`. |
| `GEMMA_THINKING_LEVEL` | No | `minimal` (default) or `high`. |
| `GEMMA_TIMEOUT_MS` | No | Default `60000`. |
| `AI_RATE_LIMIT_PER_15_MIN` | No | Default `30` requests per IP per 15 minutes on `/api/ai`. |

See [`.env.example`](../.env.example) for the same list with comments.

After the service is up, `GET /api/health` returns JSON. `ai.configured` is `true` only when `GEMMA_API_KEY` is non-empty. The response does not include the key.

## Persistent storage

SQLite is a file. Render's normal filesystem is ephemeral: a deploy replaces it.

- Mount a disk at `/var/data`.
- Set `DATABASE_PATH=/var/data/menumate.sqlite`.
- Only files under the mount path persist. Do not point `DATABASE_PATH` at the application directory.
- A disk attaches to one instance. You cannot scale this service horizontally while SQLite is the database, and deploys restart the process (a short period where the site is down).
- The disk is not available during the build command. Seeding runs when the server starts, which is the correct time.
- On first boot the server creates the file and inserts the fictional **Saffron Garden** sample menu if that slug is missing.

There is no multi-user login. Anyone who can open the deployed site can edit the restaurant dashboard. Add authentication before you treat a public URL as a private dashboard for more than one owner. The sample menu is marked read-only so visitors can open it without replacing the seed data.

## Gemma on the server

The default provider is the [Gemini API hosting Gemma](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api). The server calls:

`POST https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent`

with the `x-goog-api-key` header. Create the key in [Google AI Studio](https://aistudio.google.com/app/apikey). Do not commit it and do not put it in `APP_BASE_URL` or any client variable.

If the key is missing, AI routes return HTTP 503 `AI_NOT_CONFIGURED`. The app does not invent a translation.

## Verify after deploy

1. Open `https://<your-service>.onrender.com/api/health` and expect `"status": "ok"`.
2. Open `/` and `/m/saffron-garden`.
3. Create a restaurant profile and a menu. Download a PDF and a QR code.
4. Restart the service and confirm the menu is still there. If it disappeared, `DATABASE_PATH` is not on the persistent disk.
5. If you set `GEMMA_API_KEY`, use **Translate** once and confirm the suggestion is reviewed before it is saved.

## Troubleshooting

- **Build fails on `better-sqlite3` or `@napi-rs/canvas`.** Both are native modules. Use the Node runtime (not a stripped static image) and Node 22. `npm ci` must be allowed to install optional platform packages for Linux.
- **`Invalid environment configuration` in the logs.** A URL variable is not a valid URL. `APP_BASE_URL` and `GEMMA_API_BASE_URL` need a scheme (`https://`).
- **Health check fails.** Path must be `/api/health`. The process must listen on `process.env.PORT`.
- **QR codes point at localhost.** Set `APP_BASE_URL` to the Render origin and redeploy. Existing QR images are generated on demand, so the next download uses the new value.
- **AI returns 503.** `GEMMA_API_KEY` is empty or not visible to the running process. Render env vars apply on the next deploy.
- **AI returns 502.** The provider rejected the call, timed out, or returned JSON the app could not validate. Prices are not modified either way. Check the Render logs for the redacted provider message.
- **Sample menu missing.** It is created on startup when slug `saffron-garden` is absent. If you deleted that menu, restart the service or run a fresh database.
- **Free instance sleeps or loses data.** Expected. Use a paid instance and a disk for a demo you want to keep.
