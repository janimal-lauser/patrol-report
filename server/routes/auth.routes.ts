import type { Express } from "express";
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { asyncHandler } from "../lib/asyncHandler";
import { UnauthorizedError, ValidationError } from "../lib/errors";
import {
  requireAuth,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../middleware/auth";
import "../types";

export function registerAuthRoutes(app: Express) {
  // POST /api/auth/login -- Einloggen mit E-Mail + Passwort
  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError("E-Mail und Passwort sind erforderlich");
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        throw new UnauthorizedError("Ungueltige Anmeldedaten");
      }

      if (!user.isActive) {
        throw new UnauthorizedError("Account ist deaktiviert");
      }

      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        throw new UnauthorizedError("Ungueltige Anmeldedaten");
      }

      const tokenUser = {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
      };

      const accessToken = generateAccessToken(tokenUser);
      const refreshToken = generateRefreshToken(tokenUser);

      res.json({
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            companyId: user.companyId,
            trackingMode: user.trackingMode,
          },
        },
      });
    })
  );

  // POST /api/auth/refresh -- Token erneuern
  app.post(
    "/api/auth/refresh",
    asyncHandler(async (req, res) => {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ValidationError("Refresh-Token erforderlich");
      }

      let payload;
      try {
        payload = verifyRefreshToken(refreshToken);
      } catch {
        throw new UnauthorizedError("Ungueltiges Refresh-Token");
      }

      const user = await storage.getUser(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedError("User nicht gefunden oder deaktiviert");
      }

      const tokenUser = {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
      };

      const newAccessToken = generateAccessToken(tokenUser);
      const newRefreshToken = generateRefreshToken(tokenUser);

      res.json({
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    })
  );

  // GET /api/auth/me -- Eigenes Profil abrufen
  app.get(
    "/api/auth/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        throw new UnauthorizedError("User nicht gefunden");
      }

      const company = await storage.getCompany(user.companyId);

      res.json({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          trackingMode: user.trackingMode,
          company: company
            ? { id: company.id, name: company.name }
            : null,
        },
      });
    })
  );

  // POST /api/auth/change-password -- Passwort aendern
  app.post(
    "/api/auth/change-password",
    requireAuth,
    asyncHandler(async (req, res) => {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError(
          "Aktuelles und neues Passwort sind erforderlich"
        );
      }

      if (newPassword.length < 8) {
        throw new ValidationError(
          "Neues Passwort muss mindestens 8 Zeichen haben"
        );
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        throw new UnauthorizedError("User nicht gefunden");
      }

      const passwordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );
      if (!passwordValid) {
        throw new UnauthorizedError("Aktuelles Passwort ist falsch");
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      await storage.updateUser(user.id, user.companyId, {
        passwordHash: newHash,
      });

      res.json({ data: { message: "Passwort erfolgreich geaendert" } });
    })
  );
}
