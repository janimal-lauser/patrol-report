import "dotenv/config";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerAllRoutes } from "./routes";
import { WebhookHandlers } from "./webhookHandlers";
import { AppError } from "./lib/errors";
import "./types";

const app = express();
const log = console.log;

// --- CORS ---
const corsOrigins = process.env.CORS_ORIGINS?.split(",").map(
  (s: string) => s.trim()
) || ["http://localhost:8081", "http://localhost:19006"];

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// --- Stripe Webhook (MUSS vor express.json() stehen) ---
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature" });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        log("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
        return res.status(500).json({ error: "Webhook processing error" });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);

      res.status(200).json({ received: true });
    } catch (error: any) {
      log("Webhook error:", error.message);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

// --- Body Parser ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));

// --- Request Logging ---
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;

    const duration = Date.now() - start;

    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }

    if (logLine.length > 80) {
      logLine = logLine.slice(0, 79) + "…";
    }

    log(logLine);
  });

  next();
});

// --- API Routes ---
const server = registerAllRoutes(app);

// --- Fehlerbehandlung ---
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
        },
      });
      return;
    }

    const error = err as { status?: number; statusCode?: number; message?: string };
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    log("Server error:", message);
    res.status(status).json({
      error: {
        code: "INTERNAL_ERROR",
        message: status === 500 ? "Interner Serverfehler" : message,
      },
    });
  }
);

// --- Server starten ---
const port = parseInt(process.env.PORT || "5000", 10);
server.listen({ port, host: "0.0.0.0" }, () => {
  log(`PatrolReport Server laeuft auf Port ${port}`);
});
