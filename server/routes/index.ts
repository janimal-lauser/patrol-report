import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerAuthRoutes } from "./auth.routes";
import { registerCompanyRoutes } from "./company.routes";
import { registerUserRoutes } from "./user.routes";
import { registerShiftRoutes } from "./shift.routes";
import { registerCheckpointRoutes } from "./checkpoint.routes";
import { registerStripeRoutes } from "./stripe.routes";

export function registerAllRoutes(app: Express): Server {
  registerAuthRoutes(app);
  registerCompanyRoutes(app);
  registerUserRoutes(app);
  registerShiftRoutes(app);
  registerCheckpointRoutes(app);
  registerStripeRoutes(app);

  return createServer(app);
}
