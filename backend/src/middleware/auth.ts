import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "../lib/errors";

export interface AuthPayload {
  managerId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: "12h" });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return next(new HttpError(401, "Not authenticated"));
  try {
    const decoded = jwt.verify(header.slice(7), jwtSecret()) as AuthPayload;
    req.auth = { managerId: decoded.managerId, email: decoded.email };
    next();
  } catch {
    next(new HttpError(401, "Session expired or invalid"));
  }
}

export function managerId(req: Request): string {
  if (!req.auth) throw new HttpError(401, "Not authenticated");
  return req.auth.managerId;
}
