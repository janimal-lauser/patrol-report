import { getStripeClient } from "./stripeClient";
import { storage } from "./storage";

export class WebhookHandlers {
  static async processWebhook(
    payload: Buffer,
    signature: string
  ): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Received type: " +
          typeof payload +
          ". " +
          "This usually means express.json() parsed the body before reaching this handler. " +
          "FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error(
        "STRIPE_WEBHOOK_SECRET nicht gesetzt. Bitte in .env konfigurieren."
      );
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    // Webhook-Events verarbeiten
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        // User anhand der stripeCustomerId finden und Abo-Status updaten
        // Hinweis: getUserByStripeCustomerId wird im erweiterten Storage implementiert
        console.log(
          `Subscription ${event.type}: customer=${customerId}, status=${subscription.status}`
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        console.log(
          `Subscription deleted: customer=${customerId}`
        );
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  }
}
