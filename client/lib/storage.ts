/**
 * Storage Layer fuer PatrolReport
 *
 * Nutzt SQLite (expo-sqlite) fuer alle sensiblen Daten auf nativen Geraeten.
 * Auf Web: AsyncStorage als Fallback (nur fuer Development).
 *
 * Alle Funktions-Signaturen sind identisch zum alten AsyncStorage-basierten Code.
 * Screens und Contexts die diese Funktionen importieren brauchen keine Aenderung.
 */

import { Platform } from "react-native";
import { Shift, ShiftSummary } from "@/types/shift";
import { getDatabase, ShiftRow } from "./database";

// ── Types ──────────────────────────────────────────────────

export type TrackingMode = "continuous" | "event-only";

export interface Settings {
  autoCenter: boolean;
  highAccuracy: boolean;
  trackingMode: TrackingMode;
}

const defaultSettings: Settings = {
  autoCenter: true,
  highAccuracy: true,
  trackingMode: "continuous",
};

// ── Web Fallback (nur fuer Development) ────────────────────

// AsyncStorage wird nur auf Web verwendet, wo expo-sqlite nicht verfuegbar ist.
// Lazy import um bundle-size auf nativen Geraeten nicht zu belasten.
async function getAsyncStorage() {
  const mod = await import("@react-native-async-storage/async-storage");
  return mod.default;
}

const SHIFTS_KEY = "@patrol_tracker_shifts";
const ACTIVE_SHIFT_KEY = "@patrol_tracker_active_shift";
const USER_NAME_KEY = "@patrol_tracker_user_name";
const SETTINGS_KEY = "@patrol_tracker_settings";

// ── Row <-> Shift Mapping ──────────────────────────────────

function rowToShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    userName: row.user_name,
    startTime: row.start_time,
    endTime: row.end_time ?? undefined,
    route: JSON.parse(row.route),
    events: JSON.parse(row.events),
    isActive: row.is_active === 1,
    trackingMode: (row.tracking_mode as TrackingMode) ?? "continuous",
    synced: row.synced === 1,
  };
}

// ── Shift Storage ──────────────────────────────────────────

export async function getShifts(): Promise<Shift[]> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    const data = await AsyncStorage.getItem(SHIFTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ShiftRow>(
      "SELECT * FROM shifts WHERE is_active = 0 ORDER BY start_time DESC"
    );
    return rows.map(rowToShift);
  } catch (error) {
    console.error("Error getting shifts:", error);
    return [];
  }
}

export async function saveShift(shift: Shift): Promise<void> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    const shifts = await getShifts();
    const existingIndex = shifts.findIndex((s) => s.id === shift.id);
    if (existingIndex >= 0) {
      shifts[existingIndex] = shift;
    } else {
      shifts.unshift(shift);
    }
    await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
    return;
  }

  try {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO shifts
       (id, user_name, start_time, end_time, route, events, is_active, tracking_mode, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shift.id,
        shift.userName,
        shift.startTime,
        shift.endTime ?? null,
        JSON.stringify(shift.route),
        JSON.stringify(shift.events),
        shift.isActive ? 1 : 0,
        shift.trackingMode ?? "continuous",
        shift.synced ? 1 : 0,
      ]
    );
  } catch (error) {
    console.error("Error saving shift:", error);
    throw error;
  }
}

export async function getShiftById(id: string): Promise<Shift | null> {
  if (Platform.OS === "web") {
    const shifts = await getShifts();
    return shifts.find((s) => s.id === id) || null;
  }

  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ShiftRow>(
      "SELECT * FROM shifts WHERE id = ?",
      [id]
    );
    return row ? rowToShift(row) : null;
  } catch (error) {
    console.error("Error getting shift:", error);
    return null;
  }
}

export async function deleteShift(id: string): Promise<void> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    const shifts = await getShifts();
    const filtered = shifts.filter((s) => s.id !== id);
    await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(filtered));
    return;
  }

  try {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM shifts WHERE id = ?", [id]);
  } catch (error) {
    console.error("Error deleting shift:", error);
    throw error;
  }
}

// ── Active Shift ───────────────────────────────────────────

export async function saveActiveShift(shift: Shift | null): Promise<void> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    if (shift) {
      await AsyncStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(shift));
    } else {
      await AsyncStorage.removeItem(ACTIVE_SHIFT_KEY);
    }
    return;
  }

  try {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO active_shift (id, shift_data) VALUES (1, ?)",
      [shift ? JSON.stringify(shift) : null]
    );
  } catch (error) {
    console.error("Error saving active shift:", error);
    throw error;
  }
}

export async function getActiveShift(): Promise<Shift | null> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    const data = await AsyncStorage.getItem(ACTIVE_SHIFT_KEY);
    return data ? JSON.parse(data) : null;
  }

  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ shift_data: string | null }>(
      "SELECT shift_data FROM active_shift WHERE id = 1"
    );
    if (row?.shift_data) {
      return JSON.parse(row.shift_data);
    }
    return null;
  } catch (error) {
    console.error("Error getting active shift:", error);
    return null;
  }
}

// ── Sync-Markierung ────────────────────────────────────────

/**
 * Markiert eine Shift als synchronisiert.
 * Ersetzt den alten Ansatz: alle Shifts laden -> eine aendern -> alle speichern.
 */
export async function markShiftSynced(shiftId: string): Promise<void> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    const data = await AsyncStorage.getItem(SHIFTS_KEY);
    if (data) {
      const shifts: Shift[] = JSON.parse(data);
      const updated = shifts.map((s) =>
        s.id === shiftId ? { ...s, synced: true } : s
      );
      await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(updated));
    }
    return;
  }

  try {
    const db = await getDatabase();
    await db.runAsync("UPDATE shifts SET synced = 1 WHERE id = ?", [shiftId]);
  } catch (error) {
    console.error("Error marking shift as synced:", error);
  }
}

// ── User Name ──────────────────────────────────────────────

export async function saveUserName(name: string): Promise<void> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    await AsyncStorage.setItem(USER_NAME_KEY, name);
    return;
  }

  try {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('user_name', ?)",
      [name]
    );
  } catch (error) {
    console.error("Error saving user name:", error);
    throw error;
  }
}

export async function getUserName(): Promise<string | null> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    return await AsyncStorage.getItem(USER_NAME_KEY);
  }

  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'user_name'"
    );
    return row?.value ?? null;
  } catch (error) {
    console.error("Error getting user name:", error);
    return null;
  }
}

// ── Settings ───────────────────────────────────────────────

export async function getTrackingMode(): Promise<TrackingMode> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    if (data) {
      const settings = JSON.parse(data);
      return settings.trackingMode || "continuous";
    }
    return "continuous";
  }

  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'tracking_mode'"
    );
    return (row?.value as TrackingMode) ?? "continuous";
  } catch (error) {
    console.error("Error getting tracking mode:", error);
    return "continuous";
  }
}

/**
 * Liest alle App-Settings aus der Datenbank.
 * Ersetzt den direkten AsyncStorage-Zugriff in ProfileScreen.
 */
export async function getSettings(): Promise<Settings> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  }

  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      "SELECT key, value FROM settings WHERE key IN ('auto_center', 'high_accuracy', 'tracking_mode')"
    );

    const result = { ...defaultSettings };
    for (const row of rows) {
      switch (row.key) {
        case "auto_center":
          result.autoCenter = row.value === "true";
          break;
        case "high_accuracy":
          result.highAccuracy = row.value === "true";
          break;
        case "tracking_mode":
          result.trackingMode = row.value as TrackingMode;
          break;
      }
    }
    return result;
  } catch (error) {
    console.error("Error getting settings:", error);
    return defaultSettings;
  }
}

/**
 * Speichert alle App-Settings in die Datenbank.
 * Ersetzt den direkten AsyncStorage-Zugriff in ProfileScreen.
 */
export async function saveSettings(settings: Settings): Promise<void> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return;
  }

  try {
    const db = await getDatabase();
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('auto_center', ?)",
      [String(settings.autoCenter)]
    );
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('high_accuracy', ?)",
      [String(settings.highAccuracy)]
    );
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('tracking_mode', ?)",
      [settings.trackingMode]
    );
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

// ── Clear All Data ─────────────────────────────────────────

/**
 * Loescht alle App-Daten aus der Datenbank.
 * Ersetzt AsyncStorage.clear() in ProfileScreen.
 */
export async function clearAllData(): Promise<void> {
  if (Platform.OS === "web") {
    const AsyncStorage = await getAsyncStorage();
    await AsyncStorage.clear();
    return;
  }

  try {
    const db = await getDatabase();
    await db.execAsync(
      "DELETE FROM shifts; DELETE FROM active_shift; DELETE FROM settings;"
    );
  } catch (error) {
    console.error("Error clearing all data:", error);
    throw error;
  }
}

// ── Utility Functions (UNVERAENDERT) ───────────────────────

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function generateShiftSummary(shift: Shift): ShiftSummary {
  let drivingDistance = 0;
  let walkingDistance = 0;

  for (let i = 1; i < shift.route.length; i++) {
    const prev = shift.route[i - 1];
    const curr = shift.route[i];
    const distance = calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );

    if (curr.mode === "driving") {
      drivingDistance += distance;
    } else {
      walkingDistance += distance;
    }
  }

  return {
    id: shift.id,
    userName: shift.userName || "Unknown",
    date: new Date(shift.startTime).toLocaleDateString(),
    startTime: shift.startTime,
    endTime: shift.endTime || Date.now(),
    duration: (shift.endTime || Date.now()) - shift.startTime,
    drivingDistance: Math.round(drivingDistance),
    walkingDistance: Math.round(walkingDistance),
    fieldCheckCount: shift.events.filter((e) => e.type === "fieldCheck").length,
    irregularityCount: shift.events.filter((e) => e.type === "irregularity")
      .length,
  };
}

export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
