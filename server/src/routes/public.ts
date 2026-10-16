import { Router } from "express";
import type { Db } from "../db/connection";
import { getMenuBySlug } from "../db/repository";
import { asyncRoute, routeParam } from "../lib/async";
import { HttpError } from "../lib/errors";

export function createPublicRouter(db: Db) {
  const router = Router();

  router.get(
    "/menus/:slug",
    asyncRoute(async (req, res) => {
      const menu = getMenuBySlug(db, routeParam(req, "slug"));
      if (!menu) throw new HttpError(404, "NOT_FOUND", "This menu does not exist.");
      if (!menu.isPublished) throw new HttpError(404, "NOT_PUBLISHED", "This menu exists but is not published.");
      res.json(menu);
    }),
  );

  return router;
}
