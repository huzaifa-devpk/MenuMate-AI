import type { NextFunction, Request, Response } from "express";
import { badRequest } from "./errors";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Forward rejected promises to the JSON error handler. */
export function asyncRoute(handler: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function routeParam(req: Request, name: string): string {
  const raw = req.params[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) throw badRequest(`Missing route parameter ${name}`);
  return value;
}
