import { config } from "./config";
import { createApp } from "./app";
import { openDatabase } from "./db/connection";

const db = openDatabase(config.DATABASE_PATH);

const app = createApp({ db });

const server = app.listen(config.PORT, () => {
  console.log(`MenuMate AI server listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
  console.log(`Public base URL: ${config.APP_BASE_URL}`);
  console.log(`AI provider: ${config.GEMMA_PROVIDER} / ${config.GEMMA_MODEL} — ${config.GEMMA_API_KEY ? "key configured" : "GEMMA_API_KEY not set (AI features disabled)"}`);
});

function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down…`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
