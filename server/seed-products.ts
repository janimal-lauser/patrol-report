import { getUncachableStripeClient } from "./stripeClient";

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  console.log("Creating Patrol Tracker subscription products...");

  const existingProducts = await stripe.products.search({
    query: "name:'Patrol Tracker'",
  });

  if (existingProducts.data.length > 0) {
    console.log("Products already exist, skipping creation");
    return;
  }

  const personalProduct = await stripe.products.create({
    name: "Patrol Tracker Personal",
    description:
      "For individual security professionals. Full GPS tracking with continuous route recording.",
    metadata: {
      tier: "personal",
      trackingMode: "continuous",
      features: "GPS tracking, Photo evidence, Event logging, PDF reports",
    },
  });

  await stripe.prices.create({
    product: personalProduct.id,
    unit_amount: 999,
    currency: "eur",
    recurring: { interval: "month" },
    metadata: { tier: "personal" },
  });

  await stripe.prices.create({
    product: personalProduct.id,
    unit_amount: 9900,
    currency: "eur",
    recurring: { interval: "year" },
    metadata: { tier: "personal", savings: "17%" },
  });

  console.log(`Created: ${personalProduct.name} (${personalProduct.id})`);

  const businessProduct = await stripe.products.create({
    name: "Patrol Tracker Business",
    description:
      "For small security businesses. All Personal features plus team management.",
    metadata: {
      tier: "business",
      trackingMode: "continuous",
      features:
        "Everything in Personal, Team management (up to 10 users), Admin dashboard, Priority support",
    },
  });

  await stripe.prices.create({
    product: businessProduct.id,
    unit_amount: 4900,
    currency: "eur",
    recurring: { interval: "month" },
    metadata: { tier: "business" },
  });

  await stripe.prices.create({
    product: businessProduct.id,
    unit_amount: 49000,
    currency: "eur",
    recurring: { interval: "year" },
    metadata: { tier: "business", savings: "17%" },
  });

  console.log(`Created: ${businessProduct.name} (${businessProduct.id})`);

  const enterpriseProduct = await stripe.products.create({
    name: "Patrol Tracker Enterprise",
    description:
      "For security companies. Privacy-compliant event-only tracking for German labor law compliance.",
    metadata: {
      tier: "enterprise",
      trackingMode: "event-only",
      features:
        "Event-only GPS (German labor law compliant), Unlimited users, Custom branding, API access, Dedicated support",
    },
  });

  await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 19900,
    currency: "eur",
    recurring: { interval: "month" },
    metadata: { tier: "enterprise" },
  });

  await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 199000,
    currency: "eur",
    recurring: { interval: "year" },
    metadata: { tier: "enterprise", savings: "17%" },
  });

  console.log(`Created: ${enterpriseProduct.name} (${enterpriseProduct.id})`);

  console.log("\nAll products created successfully!");
  console.log(
    "Stripe webhooks will automatically sync them to your database."
  );
}

createProducts().catch(console.error);
