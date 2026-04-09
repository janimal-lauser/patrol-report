import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// --- COMPANIES ---

export const companies = pgTable("companies", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  logoUrl: text("logo_url"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// --- USERS (erweitert) ---

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id),
  role: text("role").notNull().default("guard"),
  isActive: boolean("is_active").default(true),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionTier: text("subscription_tier").default("free"),
  trackingMode: text("tracking_mode").default("continuous"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// --- SHIFTS ---

export const shifts = pgTable("shifts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  trackingMode: text("tracking_mode").default("continuous"),
  status: text("status").notNull().default("active"),
  summaryData: jsonb("summary_data"),
  pdfUrl: text("pdf_url"),
  clientId: text("client_id").notNull(),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertShiftSchema = createInsertSchema(shifts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;

// --- SHIFT EVENTS ---

export const shiftEvents = pgTable("shift_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id")
    .notNull()
    .references(() => shifts.id),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id),
  type: text("type").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  note: text("note"),
  photoUrl: text("photo_url"),
  clientId: text("client_id").notNull(),
  checkpointId: varchar("checkpoint_id").references(() => checkpoints.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertShiftEventSchema = createInsertSchema(shiftEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShiftEvent = z.infer<typeof insertShiftEventSchema>;
export type ShiftEvent = typeof shiftEvents.$inferSelect;

// --- CHECKPOINTS ---

export const checkpoints = pgTable("checkpoints", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  companyId: varchar("company_id")
    .notNull()
    .references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  qrCode: text("qr_code").unique(),
  nfcTagId: text("nfc_tag_id").unique(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCheckpointSchema = createInsertSchema(checkpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCheckpoint = z.infer<typeof insertCheckpointSchema>;
export type Checkpoint = typeof checkpoints.$inferSelect;

// --- ROUTE POINTS ---

export const routePoints = pgTable("route_points", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  shiftId: varchar("shift_id")
    .notNull()
    .references(() => shifts.id),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  mode: text("mode").notNull(),
  accuracy: doublePrecision("accuracy"),
});

export const insertRoutePointSchema = createInsertSchema(routePoints).omit({
  id: true,
});

export type InsertRoutePoint = z.infer<typeof insertRoutePointSchema>;
export type RoutePoint = typeof routePoints.$inferSelect;
