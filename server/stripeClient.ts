import Stripe from "stripe";

// Stripe-Client mit Keys aus Umgebungsvariablen (statt Replit Connectors)

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY nicht gesetzt. Bitte in .env konfigurieren."
      );
    }
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY nicht gesetzt. Bitte in .env konfigurieren."
    );
  }
  return new Stripe(secretKey);
}

export async function getStripePublishableKey(): Promise<string> {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_PUBLISHABLE_KEY nicht gesetzt. Bitte in .env konfigurieren."
    );
  }
  return key;
}

export async function getStripeSecretKey(): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY nicht gesetzt. Bitte in .env konfigurieren."
    );
  }
  return key;
}

export { getStripeClient };
