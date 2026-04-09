import type { Express } from "express";
import bcrypt from "bcryptjs";
import { storage } from "../storage";
import { asyncHandler } from "../lib/asyncHandler";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";
import "../types";

export function registerUserRoutes(app: Express) {
  // GET /api/users -- Alle User der eigenen Firma (nur Admin)
  app.get(
    "/api/users",
    requireAuth,
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const users = await storage.listUsersByCompany(req.user!.companyId);

      // passwordHash nie an den Client senden
      const safeUsers = users.map(({ passwordHash, ...rest }) => rest);

      res.json({ data: safeUsers });
    })
  );

  // POST /api/users -- Neuen Guard anlegen (nur Admin)
  app.post(
    "/api/users",
    requireAuth,
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const { email, name, password, role = "guard" } = req.body;

      if (!email || !password) {
        throw new ValidationError("E-Mail und Passwort sind erforderlich");
      }

      if (password.length < 8) {
        throw new ValidationError(
          "Passwort muss mindestens 8 Zeichen haben"
        );
      }

      if (!["admin", "guard", "viewer"].includes(role)) {
        throw new ValidationError("Ungueltige Rolle");
      }

      // Pruefen ob E-Mail bereits existiert
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        throw new ConflictError("E-Mail-Adresse bereits vergeben");
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await storage.createUser({
        email,
        name: name || null,
        passwordHash,
        companyId: req.user!.companyId,
        role,
      });

      // passwordHash nie zurueckgeben
      const { passwordHash: _, ...safeUser } = user;
      res.status(201).json({ data: safeUser });
    })
  );

  // PATCH /api/users/:id -- User bearbeiten (nur Admin)
  app.patch(
    "/api/users/:id",
    requireAuth,
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const { name, role, isActive } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (role !== undefined) {
        if (!["admin", "guard", "viewer"].includes(role)) {
          throw new ValidationError("Ungueltige Rolle");
        }
        updateData.role = role;
      }
      if (isActive !== undefined) updateData.isActive = isActive;

      const user = await storage.updateUser(
        req.params.id,
        req.user!.companyId,
        updateData
      );

      if (!user) {
        throw new NotFoundError("User nicht gefunden");
      }

      const { passwordHash: _, ...safeUser } = user;
      res.json({ data: safeUser });
    })
  );
}
