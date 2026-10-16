import { Router } from "express";
import { categoryInputSchema, dishInputSchema, menuInputSchema, menuUpdateSchema, reorderSchema } from "@shared";
import type { Db } from "../db/connection";
import {
  addCategory,
  addDish,
  createMenu,
  deleteCategory,
  deleteDish,
  deleteMenu,
  getPrimaryRestaurant,
  listMenus,
  reorderCategories,
  reorderDishes,
  requireMenu,
  updateCategory,
  updateDish,
  updateMenu,
} from "../db/repository";
import { asyncRoute, routeParam } from "../lib/async";
import { badRequest } from "../lib/errors";

export function createMenuRouter(db: Db) {
  const router = Router();

  router.get(
    "/",
    asyncRoute(async (_req, res) => {
      res.json(listMenus(db));
    }),
  );

  router.post(
    "/",
    asyncRoute(async (req, res) => {
      const restaurant = getPrimaryRestaurant(db);
      if (!restaurant) throw badRequest("Create a restaurant profile before adding a menu.");
      const input = menuInputSchema.parse(req.body);
      const menu = createMenu(db, restaurant.id, input);
      res.status(201).json(menu);
    }),
  );

  router.get(
    "/:menuId",
    asyncRoute(async (req, res) => {
      res.json(requireMenu(db, routeParam(req, "menuId")));
    }),
  );

  router.patch(
    "/:menuId",
    asyncRoute(async (req, res) => {
      const input = menuUpdateSchema.parse(req.body);
      res.json(updateMenu(db, routeParam(req, "menuId"), input));
    }),
  );

  router.delete(
    "/:menuId",
    asyncRoute(async (req, res) => {
      deleteMenu(db, routeParam(req, "menuId"));
      res.status(204).end();
    }),
  );

  router.post(
    "/:menuId/categories",
    asyncRoute(async (req, res) => {
      const input = categoryInputSchema.parse(req.body);
      const menu = addCategory(db, routeParam(req, "menuId"), input);
      res.status(201).json(menu);
    }),
  );

  router.patch(
    "/:menuId/categories/:categoryId",
    asyncRoute(async (req, res) => {
      const input = categoryInputSchema.parse(req.body);
      res.json(updateCategory(db, routeParam(req, "menuId"), routeParam(req, "categoryId"), input));
    }),
  );

  router.delete(
    "/:menuId/categories/:categoryId",
    asyncRoute(async (req, res) => {
      res.json(deleteCategory(db, routeParam(req, "menuId"), routeParam(req, "categoryId")));
    }),
  );

  router.put(
    "/:menuId/categories/reorder",
    asyncRoute(async (req, res) => {
      const body = reorderSchema.parse(req.body);
      res.json(reorderCategories(db, routeParam(req, "menuId"), body.orderedIds));
    }),
  );

  router.post(
    "/:menuId/categories/:categoryId/dishes",
    asyncRoute(async (req, res) => {
      const input = dishInputSchema.parse(req.body);
      const menu = addDish(db, routeParam(req, "menuId"), routeParam(req, "categoryId"), input);
      res.status(201).json(menu);
    }),
  );

  router.patch(
    "/:menuId/dishes/:dishId",
    asyncRoute(async (req, res) => {
      const input = dishInputSchema.parse(req.body);
      res.json(updateDish(db, routeParam(req, "menuId"), routeParam(req, "dishId"), input));
    }),
  );

  router.delete(
    "/:menuId/dishes/:dishId",
    asyncRoute(async (req, res) => {
      res.json(deleteDish(db, routeParam(req, "menuId"), routeParam(req, "dishId")));
    }),
  );

  router.put(
    "/:menuId/categories/:categoryId/dishes/reorder",
    asyncRoute(async (req, res) => {
      const body = reorderSchema.parse(req.body);
      res.json(reorderDishes(db, routeParam(req, "menuId"), routeParam(req, "categoryId"), body.orderedIds));
    }),
  );

  return router;
}
