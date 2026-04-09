import type { Express } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../lib/asyncHandler";
import { ValidationError, NotFoundError } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import "../types";

export function registerShiftRoutes(app: Express) {
  // POST /api/shifts -- Schicht synchronisieren (vom Client)
  // Empfaengt eine komplette Schicht mit Events und Routenpunkten
  app.post(
    "/api/shifts",
    requireAuth,
    asyncHandler(async (req, res) => {
      const { clientId, startTime, endTime, trackingMode, status, summaryData, events, routePoints } =
        req.body;

      if (!clientId || !startTime) {
        throw new ValidationError("clientId und startTime sind erforderlich");
      }

      // Idempotenz: Wenn diese Schicht schon existiert, zurueckgeben
      const existing = await storage.getShiftByClientId(
        clientId,
        req.user!.companyId
      );
      if (existing) {
        res.json({ data: existing });
        return;
      }

      // Schicht anlegen
      const shift = await storage.createShift({
        userId: req.user!.id,
        companyId: req.user!.companyId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        trackingMode: trackingMode || "continuous",
        status: status || "completed",
        summaryData: summaryData || null,
        clientId,
        syncedAt: new Date(),
      });

      // Events einfuegen (falls vorhanden)
      if (events && Array.isArray(events) && events.length > 0) {
        const eventRecords = events.map(
          (e: {
            id: string;
            type: string;
            timestamp: string;
            latitude: number;
            longitude: number;
            note?: string;
            photoUri?: string;
          }) => ({
            shiftId: shift.id,
            companyId: req.user!.companyId,
            type: e.type,
            timestamp: new Date(e.timestamp),
            latitude: e.latitude,
            longitude: e.longitude,
            note: e.note || null,
            photoUrl: null, // Fotos bleiben erstmal lokal (Phase 2)
            clientId: e.id,
          })
        );
        await storage.createShiftEvents(eventRecords);
      }

      // Routenpunkte einfuegen (falls vorhanden)
      if (routePoints && Array.isArray(routePoints) && routePoints.length > 0) {
        const pointRecords = routePoints.map(
          (p: {
            latitude: number;
            longitude: number;
            timestamp: string;
            mode: string;
            accuracy?: number;
          }) => ({
            shiftId: shift.id,
            latitude: p.latitude,
            longitude: p.longitude,
            timestamp: new Date(p.timestamp),
            mode: p.mode,
            accuracy: p.accuracy || null,
          })
        );
        await storage.createRoutePoints(pointRecords);
      }

      res.status(201).json({ data: shift });
    })
  );

  // GET /api/shifts -- Schichten auflisten
  app.get(
    "/api/shifts",
    requireAuth,
    asyncHandler(async (req, res) => {
      const { limit, offset, startDate, endDate, userId } = req.query;

      const options: {
        userId?: string;
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
      } = {};

      // Guards sehen nur eigene Schichten, Admins sehen alle
      if (req.user!.role === "guard") {
        options.userId = req.user!.id;
      } else if (userId && typeof userId === "string") {
        options.userId = userId;
      }

      if (limit) options.limit = parseInt(limit as string, 10);
      if (offset) options.offset = parseInt(offset as string, 10);
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);

      const shifts = await storage.listShifts(
        req.user!.companyId,
        options
      );

      res.json({ data: shifts });
    })
  );

  // GET /api/shifts/:id -- Schicht-Detail mit Events und Route
  app.get(
    "/api/shifts/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const shift = await storage.getShift(
        req.params.id,
        req.user!.companyId
      );

      if (!shift) {
        throw new NotFoundError("Schicht nicht gefunden");
      }

      // Guards duerfen nur eigene Schichten sehen
      if (req.user!.role === "guard" && shift.userId !== req.user!.id) {
        throw new NotFoundError("Schicht nicht gefunden");
      }

      const events = await storage.getShiftEvents(
        shift.id,
        req.user!.companyId
      );
      const route = await storage.getRoutePoints(shift.id);

      res.json({
        data: {
          ...shift,
          events,
          routePoints: route,
        },
      });
    })
  );

  // PATCH /api/shifts/:id -- Schicht aktualisieren
  app.patch(
    "/api/shifts/:id",
    requireAuth,
    asyncHandler(async (req, res) => {
      const shift = await storage.getShift(
        req.params.id,
        req.user!.companyId
      );

      if (!shift) {
        throw new NotFoundError("Schicht nicht gefunden");
      }

      if (req.user!.role === "guard" && shift.userId !== req.user!.id) {
        throw new NotFoundError("Schicht nicht gefunden");
      }

      const { endTime, status, summaryData } = req.body;
      const updateData: Record<string, unknown> = {};

      if (endTime !== undefined) updateData.endTime = new Date(endTime);
      if (status !== undefined) updateData.status = status;
      if (summaryData !== undefined) updateData.summaryData = summaryData;

      const updated = await storage.updateShift(
        req.params.id,
        req.user!.companyId,
        updateData
      );

      res.json({ data: updated });
    })
  );

  // GET /api/shifts/:id/events -- Events einer Schicht
  app.get(
    "/api/shifts/:id/events",
    requireAuth,
    asyncHandler(async (req, res) => {
      const shift = await storage.getShift(
        req.params.id,
        req.user!.companyId
      );

      if (!shift) {
        throw new NotFoundError("Schicht nicht gefunden");
      }

      if (req.user!.role === "guard" && shift.userId !== req.user!.id) {
        throw new NotFoundError("Schicht nicht gefunden");
      }

      const events = await storage.getShiftEvents(
        shift.id,
        req.user!.companyId
      );

      res.json({ data: events });
    })
  );

  // POST /api/shifts/:id/events -- Event zu einer Schicht hinzufuegen
  app.post(
    "/api/shifts/:id/events",
    requireAuth,
    asyncHandler(async (req, res) => {
      const shift = await storage.getShift(
        req.params.id,
        req.user!.companyId
      );

      if (!shift) {
        throw new NotFoundError("Schicht nicht gefunden");
      }

      if (shift.userId !== req.user!.id) {
        throw new NotFoundError("Schicht nicht gefunden");
      }

      const { type, timestamp, latitude, longitude, note, clientId } =
        req.body;

      if (!type || !timestamp || !clientId) {
        throw new ValidationError(
          "type, timestamp und clientId sind erforderlich"
        );
      }

      const [event] = await storage.createShiftEvents([
        {
          shiftId: shift.id,
          companyId: req.user!.companyId,
          type,
          timestamp: new Date(timestamp),
          latitude: latitude || null,
          longitude: longitude || null,
          note: note || null,
          photoUrl: null,
          clientId,
        },
      ]);

      res.status(201).json({ data: event });
    })
  );
}
