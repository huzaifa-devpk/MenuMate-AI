import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { improveDescriptionRequestSchema, translateRequestSchema } from "@shared";
import { config } from "../config";
import type { Db } from "../db/connection";
import { asyncRoute } from "../lib/async";
import { improveDescription, translateMenu } from "../services/ai/service";
import type { GemmaClient } from "../services/ai/types";

export function createAiRouter(db: Db, gemma: GemmaClient) {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.AI_RATE_LIMIT_PER_15_MIN,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    validate: { trustProxy: false, xForwardedForHeader: false },
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many AI requests. Please wait a few minutes and try again.",
      },
    },
  });

  router.use((req, res, next) => {
    if (req.method === "GET") return next();
    return limiter(req, res, next);
  });

  router.get("/status", (_req, res) => {
    res.json({
      configured: Boolean(config.GEMMA_API_KEY),
      provider: config.GEMMA_PROVIDER,
      model: config.GEMMA_MODEL,
    });
  });

  router.post(
    "/translate",
    asyncRoute(async (req, res) => {
      const body = translateRequestSchema.parse(req.body);
      res.json(await translateMenu(db, body, gemma));
    }),
  );

  router.post(
    "/improve-description",
    asyncRoute(async (req, res) => {
      const body = improveDescriptionRequestSchema.parse(req.body);
      res.json(await improveDescription(body, gemma));
    }),
  );

  return router;
}
