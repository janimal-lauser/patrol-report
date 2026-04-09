/**
 * Lokale SQLite-Datenbank fuer PatrolReport
 *
 * Ersetzt AsyncStorage fuer alle sensiblen Daten (Shifts, Events, GPS, Fotos).
 * DSGVO Art. 32: Verschluesselung ruhender Daten auf dem Geraet.
 *
 * Architektur:
 *   - expo-sqlite fuer DB-Zugriff (funktioniert in Expo Go)
 *   - expo-secure-store fuer Encryption-Key (Vorbereitung SQLCipher)
 *   - WAL-Modus fuer bessere Write-Performance bei GPS-Tracking
 *
 * Encryption-Key wird in expo-secure-store generiert und gespeichert,
 * aber aktuell noch nicht fuer DB-Verschluesselung verwendet.
 * Bei spaeterer Migration zu op-sqlite (SQLCipher) wird der Key als
 * PRAGMA key verwendet. OS-Level-Encryption (iOS Data Protection /
 * Android File-Based Encryption) schuetzt die DB-Datei bereits jetzt.
 */

import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// ── Types ──────────────────────────────────────────────────

export interface ShiftRow {
  id: string;
  user_name: string;
  start_time: number;
  end_time: number | null;
  route: string; // JSON
  events: string; // JSON
  is_active: number; // 0 | 1
  tracking_mode: string;
  synced: number; // 0 | 1
}

export interface ActiveShiftRow {
  id: number;
  shift_data: string | null; // JSON
}

export interface SettingsRow {
  key: string;
  value: string;
}

export interface MigrationStateRow {
  id: number;
  completed: number;
  migrated_at: number | null;
}

// ── Constants ──────────────────────────────────────────────

const DB_NAME = "patrol_report.db";
const ENCRYPTION_KEY_NAME = "patrol_db_encryption_key";
const SCHEMA_VERSION = 1;

// ── Singleton ──────────────────────────────────────────────

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Oeffnet die Datenbank (Singleton).
 * Beim ersten Aufruf: Schema erstellen, WAL aktivieren, Encryption-Key vorbereiten.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === "web") {
    throw new Error("SQLite is not available on web. Use AsyncStorage fallback.");
  }

  if (dbInstance) return dbInstance;

  // Verhindert Race-Condition bei parallelen Aufrufen
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = initializeDatabase();
  try {
    dbInstance = await dbInitPromise;
    return dbInstance;
  } finally {
    dbInitPromise = null;
  }
}

async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  // WAL-Modus fuer bessere Write-Performance (wichtig bei 5-Sek GPS-Updates)
  await db.execAsync("PRAGMA journal_mode = WAL;");

  // Schema erstellen
  await createSchema(db);

  // Encryption-Key vorbereiten (fuer spaetere SQLCipher-Migration)
  await getOrCreateEncryptionKey();

  // Einmalige Migration von AsyncStorage -> SQLite
  await migrateFromAsyncStorage(db);

  console.log(`[Database] Initialized, schema version: ${SCHEMA_VERSION}`);

  return db;
}

// ── Schema ─────────────────────────────────────────────────

async function createSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      route TEXT NOT NULL DEFAULT '[]',
      events TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 0,
      tracking_mode TEXT DEFAULT 'continuous',
      synced INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS active_shift (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      shift_data TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS migration_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      completed INTEGER NOT NULL DEFAULT 0,
      migrated_at INTEGER
    );
  `);
}

// ── Encryption Key (Vorbereitung SQLCipher) ────────────────

/**
 * Generiert einen 256-bit Encryption-Key und speichert ihn in expo-secure-store.
 * Aktuell wird der Key noch nicht fuer DB-Verschluesselung verwendet.
 * Bei Migration zu op-sqlite (SQLCipher) als PRAGMA key verwenden.
 */
export async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    const existingKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
    if (existingKey) return existingKey;

    // 256-bit Key generieren (32 bytes als hex = 64 Zeichen)
    const array = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    const key = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key);
    console.log("[Database] Encryption key generated and stored in SecureStore");
    return key;
  } catch (error) {
    console.warn("[Database] Could not create encryption key:", error);
    // Nicht fatal -- Key wird aktuell nicht fuer Encryption genutzt
    return "";
  }
}

// ── Migration State ────────────────────────────────────────

/**
 * Prueft ob die AsyncStorage -> SQLite Migration bereits durchgefuehrt wurde.
 */
export async function isMigrationCompleted(): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MigrationStateRow>(
    "SELECT completed FROM migration_state WHERE id = 1"
  );
  return row?.completed === 1;
}

/**
 * Markiert die Migration als abgeschlossen.
 */
export async function setMigrationCompleted(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    "INSERT OR REPLACE INTO migration_state (id, completed, migrated_at) VALUES (1, 1, ?)",
    [Date.now()]
  );
  console.log("[Database] AsyncStorage migration marked as completed");
}

// ── AsyncStorage -> SQLite Migration ──────────────────────

/**
 * Migriert bestehende Daten aus AsyncStorage nach SQLite.
 * Wird einmalig beim ersten App-Start nach dem Update ausgefuehrt.
 * AsyncStorage-Daten werden NICHT geloescht (Fallback).
 */
async function migrateFromAsyncStorage(db: SQLite.SQLiteDatabase): Promise<void> {
  // Pruefen ob bereits migriert
  const state = await db.getFirstAsync<MigrationStateRow>(
    "SELECT completed FROM migration_state WHERE id = 1"
  );
  if (state?.completed === 1) return;

  console.log("[Migration] Starting AsyncStorage -> SQLite migration...");

  let AsyncStorage;
  try {
    AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
  } catch {
    console.log("[Migration] AsyncStorage not available, skipping migration");
    await db.runAsync(
      "INSERT OR REPLACE INTO migration_state (id, completed, migrated_at) VALUES (1, 1, ?)",
      [Date.now()]
    );
    return;
  }

  let migratedCount = 0;

  // 1. Shifts migrieren
  try {
    const shiftsJson = await AsyncStorage.getItem("@patrol_tracker_shifts");
    if (shiftsJson) {
      const shifts = JSON.parse(shiftsJson);
      if (Array.isArray(shifts)) {
        for (const shift of shifts) {
          try {
            await db.runAsync(
              `INSERT OR IGNORE INTO shifts (id, user_name, start_time, end_time, route, events, is_active, tracking_mode, synced)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                shift.id,
                shift.userName || "",
                shift.startTime ? new Date(shift.startTime).getTime() : Date.now(),
                shift.endTime ? new Date(shift.endTime).getTime() : null,
                JSON.stringify(shift.route || []),
                JSON.stringify(shift.events || []),
                0,
                shift.trackingMode || "continuous",
                shift.synced ? 1 : 0,
              ]
            );
            migratedCount++;
          } catch (error) {
            console.warn("[Migration] Skipping corrupt shift:", shift.id, error);
          }
        }
      }
    }
  } catch (error) {
    console.warn("[Migration] Error migrating shifts:", error);
  }

  // 2. Active Shift migrieren
  try {
    const activeJson = await AsyncStorage.getItem("@patrol_tracker_active_shift");
    if (activeJson) {
      await db.runAsync(
        "INSERT OR IGNORE INTO active_shift (id, shift_data) VALUES (1, ?)",
        [activeJson]
      );
    }
  } catch (error) {
    console.warn("[Migration] Error migrating active shift:", error);
  }

  // 3. User Name migrieren
  try {
    const userName = await AsyncStorage.getItem("@patrol_tracker_user_name");
    if (userName) {
      await db.runAsync(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('user_name', ?)",
        [userName]
      );
    }
  } catch (error) {
    console.warn("[Migration] Error migrating user name:", error);
  }

  // 4. Settings migrieren (beide alten Keys, gemergt)
  try {
    const trackerSettings = await AsyncStorage.getItem("@patrol_tracker_settings");
    const reportSettings = await AsyncStorage.getItem("@patrol_report_settings");

    const merged = {
      ...(trackerSettings ? JSON.parse(trackerSettings) : {}),
      ...(reportSettings ? JSON.parse(reportSettings) : {}),
    };

    if (merged.autoCenter !== undefined) {
      await db.runAsync(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_center', ?)",
        [String(merged.autoCenter)]
      );
    }
    if (merged.highAccuracy !== undefined) {
      await db.runAsync(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('high_accuracy', ?)",
        [String(merged.highAccuracy)]
      );
    }
    if (merged.trackingMode) {
      await db.runAsync(
        "INSERT OR IGNORE INTO settings (key, value) VALUES ('tracking_mode', ?)",
        [merged.trackingMode]
      );
    }
  } catch (error) {
    console.warn("[Migration] Error migrating settings:", error);
  }

  // Migration als abgeschlossen markieren
  await db.runAsync(
    "INSERT OR REPLACE INTO migration_state (id, completed, migrated_at) VALUES (1, 1, ?)",
    [Date.now()]
  );

  console.log(`[Migration] Completed. Migrated ${migratedCount} shifts.`);
}
