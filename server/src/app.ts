import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "./db/connection";
import { config } from "./config";
import { errorHandler } from "./lib/errors";
import { createAiRouter } from "./routes/ai";
import { createMenuRouter } from "./routes/menus";
import { createPublicRouter } from "./routes/public";
import { createRestaurantRouter } from "./routes/restaurant";
import { createGemmaClient } from "./services/ai/client";
import type { GemmaClient } from "./services/ai/types";

export interface AppDeps {
  db: Db;
  /** Test hook. Production uses the Gemini API client built from the environment. */
  gemma?: GemmaClient;
}

/**
 * Build the Express application. Kept separate from `index.ts` so tests can
 * create an app bound to an in-memory database.
 */
export function createApp(deps: AppDeps) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "1mb" }));

  const gemma = deps.gemma ?? createGemmaClient(config);
  app.use("/api/restaurant", createRestaurantRouter(deps.db));
  app.use("/api/menus", createMenuRouter(deps.db));
  app.use("/api/ai", createAiRouter(deps.db, gemma));
  app.use("/api/public", createPublicRouter(deps.db));

  app.get("/api/health", (_req, res) => {
    let dbOk = true;
    try {
      deps.db.prepare("SELECT 1").get();
    } catch {
      dbOk = false;
    }
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? "ok" : "degraded",
      database: dbOk ? "ok" : "error",
      ai: { configured: Boolean(config.GEMMA_API_KEY), provider: config.GEMMA_PROVIDER, model: config.GEMMA_MODEL },
      time: new Date().toISOString(),
    });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "API route not found" } });
  });

  serveClient(app);

  app.use(errorHandler);
  return app;
}

/** In production the built React app is served by Express from client/dist. */
function serveClient(app: express.Express) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [path.resolve(here, "../../client/dist"), path.resolve(here, "../client/dist"), path.resolve(process.cwd(), "client/dist")];
  const clientDir = candidates.find((dir) => fs.existsSync(path.join(dir, "index.html")));
  if (!clientDir) return;

  app.use(express.static(clientDir, { index: false, maxAge: "1h" }));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDir, "index.html"));
  });
}
