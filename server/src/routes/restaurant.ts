import { Router } from "express";
import { restaurantInputSchema } from "@shared";
import type { Db } from "../db/connection";
import { getPrimaryRestaurant, savePrimaryRestaurant } from "../db/repository";
import { asyncRoute } from "../lib/async";
import { notFound } from "../lib/errors";

export function createRestaurantRouter(db: Db) {
  const router = Router();

  router.get(
    "/",
    asyncRoute(async (_req, res) => {
      const restaurant = getPrimaryRestaurant(db);
      if (!restaurant) throw notFound("Restaurant profile");
      res.json(restaurant);
    }),
  );

  router.put(
    "/",
    asyncRoute(async (req, res) => {
      const input = restaurantInputSchema.parse(req.body);
      res.json(savePrimaryRestaurant(db, input));
    }),
  );

  return router;
}
