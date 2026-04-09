import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../shared/schema";

// Seed-Script: Erstellt die erste Firma und den ersten Admin-User
// Ausfuehren mit: npm run db:seed

const COMPANY_NAME = process.env.SEED_COMPANY_NAME || "Meine Sicherheitsfirma";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@patrol.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin1234";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Administrator";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL ist nicht gesetzt. Bitte .env pruefen.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  try {
    console.log("Erstelle Firma:", COMPANY_NAME);

    const [company] = await db
      .insert(schema.companies)
      .values({
        name: COMPANY_NAME,
        contactEmail: ADMIN_EMAIL,
      })
      .returning();

    console.log("Firma erstellt:", company.id);

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const [user] = await db
      .insert(schema.users)
      .values({
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        companyId: company.id,
        role: "admin",
      })
      .returning();

    console.log("Admin-User erstellt:", user.id);
    console.log("");
    console.log("=== Login-Daten ===");
    console.log("E-Mail:   ", ADMIN_EMAIL);
    console.log("Passwort: ", ADMIN_PASSWORD);
    console.log("Rolle:    ", "admin");
    console.log("Firma:    ", COMPANY_NAME);
    console.log("===================");
    console.log("");
    console.log("Du kannst dich jetzt mit diesen Daten in der App einloggen.");
  } catch (error: any) {
    if (error.code === "23505") {
      console.error(
        "Fehler: E-Mail oder Firma existiert bereits. Loesungen:"
      );
      console.error("  1. Andere E-Mail verwenden: SEED_ADMIN_EMAIL=...");
      console.error("  2. Datenbank zuruecksetzen: docker compose down -v && docker compose up -d && npm run db:push");
    } else {
      console.error("Fehler beim Seed:", error.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
