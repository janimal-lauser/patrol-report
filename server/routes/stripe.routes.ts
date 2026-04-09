import type { Express } from "express";
import { storage } from "../storage";
import { stripeService } from "../stripeService";
import { getStripePublishableKey } from "../stripeClient";

// Bestehende Stripe-Routen (aus der alten routes.ts uebernommen)
export function registerStripeRoutes(app: Express) {
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/checkout", async (req, res) => {
    try {
      const { email, priceId, userId } = req.body;

      if (!email || !priceId) {
        return res.status(400).json({ error: "Email and priceId are required" });
      }

      let user = userId
        ? await storage.getUser(userId)
        : await storage.getUserByEmail(email);

      if (!user) {
        // Fuer Checkout ohne Auth: temporaeren User erstellen
        // Hinweis: In einer spaeteren Phase sollte Checkout nur fuer eingeloggte User moeglich sein
        return res.status(400).json({ error: "User nicht gefunden. Bitte zuerst einloggen." });
      }

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(email, user.id);
        await storage.updateUserStripeInfo(user.id, {
          stripeCustomerId: customer.id,
        });
        customerId = customer.id;
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        `${baseUrl}/checkout/success`,
        `${baseUrl}/checkout/cancel`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/customer-portal", async (req, res) => {
    try {
      const { customerId } = req.body;

      if (!customerId) {
        return res.status(400).json({ error: "Customer ID is required" });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await stripeService.createCustomerPortalSession(
        customerId,
        baseUrl
      );

      res.json({ url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/subscription/:userId", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.userId);
      if (!user?.stripeSubscriptionId) {
        return res.json({ subscription: null });
      }

      // Abo-Status direkt von Stripe abfragen (da wir keine lokale stripe.* Tabelle mehr haben)
      try {
        const subscription = await stripeService.getSubscription(
          user.stripeSubscriptionId
        );
        res.json({ subscription });
      } catch {
        res.json({ subscription: null });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/user/:userId/tracking-mode", async (req, res) => {
    try {
      const { trackingMode } = req.body;
      if (!["continuous", "event-only"].includes(trackingMode)) {
        return res.status(400).json({ error: "Invalid tracking mode" });
      }

      const user = await storage.updateUserTrackingMode(
        req.params.userId,
        trackingMode
      );
      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
