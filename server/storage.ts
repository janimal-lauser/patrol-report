import {
  users,
  companies,
  shifts,
  shiftEvents,
  checkpoints,
  routePoints,
} from "@shared/schema";
import type {
  User,
  InsertUser,
  Company,
  InsertCompany,
  Shift,
  InsertShift,
  ShiftEvent,
  InsertShiftEvent,
  Checkpoint,
  InsertCheckpoint,
  RoutePoint,
  InsertRoutePoint,
} from "@shared/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { db } from "./db";

export class Storage {
  // --- COMPANIES ---

  async getCompany(companyId: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
    return company;
  }

  async createCompany(data: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(data).returning();
    return company;
  }

  async updateCompany(
    companyId: string,
    data: Partial<InsertCompany>
  ): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();
    return company;
  }

  // --- USERS ---

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async listUsersByCompany(companyId: string): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(eq(users.companyId, companyId))
      .orderBy(users.name);
  }

  async updateUser(
    userId: string,
    companyId: string,
    data: Partial<InsertUser>
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.companyId, companyId)))
      .returning();
    return user;
  }

  async updateUserStripeInfo(
    userId: string,
    stripeInfo: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      subscriptionTier?: string;
    }
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...stripeInfo, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserTrackingMode(
    userId: string,
    trackingMode: string
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ trackingMode, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // --- SHIFTS ---

  async createShift(data: InsertShift): Promise<Shift> {
    const [shift] = await db.insert(shifts).values(data).returning();
    return shift;
  }

  async getShift(
    shiftId: string,
    companyId: string
  ): Promise<Shift | undefined> {
    const [shift] = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, shiftId), eq(shifts.companyId, companyId)));
    return shift;
  }

  async getShiftByClientId(
    clientId: string,
    companyId: string
  ): Promise<Shift | undefined> {
    const [shift] = await db
      .select()
      .from(shifts)
      .where(
        and(eq(shifts.clientId, clientId), eq(shifts.companyId, companyId))
      );
    return shift;
  }

  async listShifts(
    companyId: string,
    options: {
      userId?: string;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<Shift[]> {
    const { userId, limit = 50, offset = 0, startDate, endDate } = options;

    const conditions = [eq(shifts.companyId, companyId)];
    if (userId) conditions.push(eq(shifts.userId, userId));
    if (startDate) conditions.push(gte(shifts.startTime, startDate));
    if (endDate) conditions.push(lte(shifts.startTime, endDate));

    return db
      .select()
      .from(shifts)
      .where(and(...conditions))
      .orderBy(desc(shifts.startTime))
      .limit(limit)
      .offset(offset);
  }

  async updateShift(
    shiftId: string,
    companyId: string,
    data: Partial<InsertShift>
  ): Promise<Shift | undefined> {
    const [shift] = await db
      .update(shifts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(shifts.id, shiftId), eq(shifts.companyId, companyId)))
      .returning();
    return shift;
  }

  // --- SHIFT EVENTS ---

  async createShiftEvents(events: InsertShiftEvent[]): Promise<ShiftEvent[]> {
    if (events.length === 0) return [];
    return db.insert(shiftEvents).values(events).returning();
  }

  async getShiftEvents(
    shiftId: string,
    companyId: string
  ): Promise<ShiftEvent[]> {
    return db
      .select()
      .from(shiftEvents)
      .where(
        and(
          eq(shiftEvents.shiftId, shiftId),
          eq(shiftEvents.companyId, companyId)
        )
      )
      .orderBy(shiftEvents.timestamp);
  }

  // --- ROUTE POINTS ---

  async createRoutePoints(points: InsertRoutePoint[]): Promise<void> {
    if (points.length === 0) return;
    // Bulk-Insert in Batches von 500 (PostgreSQL Parameter-Limit)
    const batchSize = 500;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await db.insert(routePoints).values(batch);
    }
  }

  async getRoutePoints(shiftId: string): Promise<RoutePoint[]> {
    return db
      .select()
      .from(routePoints)
      .where(eq(routePoints.shiftId, shiftId))
      .orderBy(routePoints.timestamp);
  }

  // --- DELETE SHIFT (DSGVO Art. 17 -- Recht auf Loeschung) ---

  async deleteShift(
    shiftId: string,
    companyId: string
  ): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Pruefen ob Schicht existiert und zur Firma gehoert
      const [shift] = await tx
        .select()
        .from(shifts)
        .where(and(eq(shifts.id, shiftId), eq(shifts.companyId, companyId)));

      if (!shift) return false;

      // Cascade: Erst abhaengige Daten loeschen, dann Schicht
      // 1. Route-Points (haben keinen companyId FK, nur shiftId)
      await tx.delete(routePoints).where(eq(routePoints.shiftId, shiftId));

      // 2. Shift-Events
      await tx
        .delete(shiftEvents)
        .where(
          and(
            eq(shiftEvents.shiftId, shiftId),
            eq(shiftEvents.companyId, companyId)
          )
        );

      // 3. Schicht selbst
      await tx
        .delete(shifts)
        .where(and(eq(shifts.id, shiftId), eq(shifts.companyId, companyId)));

      return true;
    });
  }

  // --- CHECKPOINTS ---

  async createCheckpoint(data: InsertCheckpoint): Promise<Checkpoint> {
    const [checkpoint] = await db
      .insert(checkpoints)
      .values(data)
      .returning();
    return checkpoint;
  }

  async listCheckpoints(
    companyId: string,
    activeOnly = true
  ): Promise<Checkpoint[]> {
    const conditions = [eq(checkpoints.companyId, companyId)];
    if (activeOnly) conditions.push(eq(checkpoints.isActive, true));

    return db
      .select()
      .from(checkpoints)
      .where(and(...conditions))
      .orderBy(checkpoints.sortOrder);
  }

  async updateCheckpoint(
    checkpointId: string,
    companyId: string,
    data: Partial<InsertCheckpoint>
  ): Promise<Checkpoint | undefined> {
    const [checkpoint] = await db
      .update(checkpoints)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(checkpoints.id, checkpointId),
          eq(checkpoints.companyId, companyId)
        )
      )
      .returning();
    return checkpoint;
  }
}

export const storage = new Storage();
