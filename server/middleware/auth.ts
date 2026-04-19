import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "../storage";
import { UnauthorizedError, ForbiddenError } from "../lib/errors";
import "../types";

export interface TokenPayload {
  sub: string;
  email: string;
  companyId: string;
  role: string;
  iat: number;
  exp: number;
}

// Prueft ob ein gueltiges JWT mitgeschickt wurde und laedt den User
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Kein Auth-Token vorhanden");
    }

    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET nicht konfiguriert");
    }

    const payload = jwt.verify(token, secret) as TokenPayload;

    const user = await storage.getUser(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("User nicht gefunden oder deaktiviert");
    }

    req.user = {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError("Token abgelaufen"));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError("Ungueltiges Token"));
    } else {
      next(error);
    }
  }
}

// Prueft ob der User eine bestimmte Rolle hat
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError("Nicht authentifiziert"));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Rolle '${req.user.role}' hat keine Berechtigung fuer diese Aktion`
        )
      );
    }
    next();
  };
}

// JWT-Token generieren
export function generateAccessToken(user: {
  id: string;
  email: string;
  companyId: string;
  role: string;
}): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET nicht konfiguriert");

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    },
    secret,
    { expiresIn: "15m" }
  );
}

export function generateRefreshToken(user: {
  id: string;
  email: string;
  companyId: string;
  role: string;
}): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET nicht konfiguriert");

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    },
    secret,
    { expiresIn: "7d" }
  );
}

export function verifyRefreshToken(token: string): TokenPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET nicht konfiguriert");

  return jwt.verify(token, secret) as TokenPayload;
}
