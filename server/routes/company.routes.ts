import type { Express } from "express";
import { storage } from "../storage";
import { asyncHandler } from "../lib/asyncHandler";
import { NotFoundError } from "../lib/errors";
import { requireAuth, requireRole } from "../middleware/auth";
import "../types";

export function registerCompanyRoutes(app: Express) {
  // GET /api/company -- Eigene Firma abrufen
  app.get(
    "/api/company",
    requireAuth,
    asyncHandler(async (req, res) => {
      const company = await storage.getCompany(req.user!.companyId);
      if (!company) {
        throw new NotFoundError("Firma nicht gefunden");
      }

      res.json({ data: company });
    })
  );

  // PATCH /api/company -- Firma aktualisieren (nur Admin)
  app.patch(
    "/api/company",
    requireAuth,
    requireRole("admin"),
    asyncHandler(async (req, res) => {
      const { name, address, contactEmail, contactPhone, logoUrl, settings } =
        req.body;

      const company = await storage.updateCompany(req.user!.companyId, {
        name,
        address,
        contactEmail,
        contactPhone,
        logoUrl,
        settings,
      });

      if (!company) {
        throw new NotFoundError("Firma nicht gefunden");
      }

      res.json({ data: company });
    })
  );
}
