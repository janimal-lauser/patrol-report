import type { Express } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../lib/asyncHandler";
import { ValidationError, NotFoundError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";
import "../types";

export function registerCheckpointRoutes(app: Express) {
  // GET /api/checkpoints -- Alle Checkpoints der Firma
  app.get(
    "/api/checkpoints",
    requireAuth,
    asyncHandler(async (req, res) => {
      const activeOnly = req.query.activeOnly !== "false";
      const checkpoints = await storage.listCheckpoints(
        req.user!.companyId,
        activeOnly
      );

      res.json({ data: checkpoints });
    })
  );

  // POST /api/checkpoints -- Checkpoint anlegen (nur Admin)
  app.post(
    "/api/checkpoints",
    requireAuth,
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const { name, description, latitude, longitude, qrCode, nfcTagId } =
        req.body;

      if (!name) {
        throw new ValidationError("Name ist erforderlich");
      }

      const checkpoint = await storage.createCheckpoint({
        companyId: req.user!.companyId,
        name,
        description: description || null,
        latitude: latitude || null,
        longitude: longitude || null,
        qrCode: qrCode || null,
        nfcTagId: nfcTagId || null,
      });

      res.status(201).json({ data: checkpoint });
    })
  );

  // PATCH /api/checkpoints/:id -- Checkpoint bearbeiten (nur Admin)
  app.patch(
    "/api/checkpoints/:id",
    requireAuth,
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const { name, description, latitude, longitude, qrCode, nfcTagId, isActive, sortOrder } =
        req.body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;
      if (qrCode !== undefined) updateData.qrCode = qrCode;
      if (nfcTagId !== undefined) updateData.nfcTagId = nfcTagId;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

      const checkpoint = await storage.updateCheckpoint(
        req.params.id,
        req.user!.companyId,
        updateData
      );

      if (!checkpoint) {
        throw new NotFoundError("Checkpoint nicht gefunden");
      }

      res.json({ data: checkpoint });
    })
  );
}
