import AsyncStorage from "@react-native-async-storage/async-storage";
import { Shift, ShiftSummary } from "@/types/shift";

const SHIFTS_KEY = "@patrol_tracker_shifts";
const ACTIVE_SHIFT_KEY = "@patrol_tracker_active_shift";
const USER_NAME_KEY = "@patrol_tracker_user_name";

export async function saveUserName(name: string): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_NAME_KEY, name);
  } catch (error) {
    console.error("Error saving user name:", error);
    throw error;
  }
}

export async function getUserName(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(USER_NAME_KEY);
  } catch (error) {
    console.error("Error getting user name:", error);
    return null;
  }
}

export async function saveShift(shift: Shift): Promise<void> {
  try {
    const shifts = await getShifts();
    const existingIndex = shifts.findIndex((s) => s.id === shift.id);
    if (existingIndex >= 0) {
      shifts[existingIndex] = shift;
    } else {
      shifts.unshift(shift);
    }
    await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
  } catch (error) {
    console.error("Error saving shift:", error);
    throw error;
  }
}

export async function getShifts(): Promise<Shift[]> {
  try {
    const data = await AsyncStorage.getItem(SHIFTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting shifts:", error);
    return [];
  }
}

export async function getShiftById(id: string): Promise<Shift | null> {
  try {
    const shifts = await getShifts();
    return shifts.find((s) => s.id === id) || null;
  } catch (error) {
    console.error("Error getting shift:", error);
    return null;
  }
}

export async function deleteShift(id: string): Promise<void> {
  try {
    const shifts = await getShifts();
    const filtered = shifts.filter((s) => s.id !== id);
    await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting shift:", error);
    throw error;
  }
}

export async function saveActiveShift(shift: Shift | null): Promise<void> {
  try {
    if (shift) {
      await AsyncStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(shift));
    } else {
      await AsyncStorage.removeItem(ACTIVE_SHIFT_KEY);
    }
  } catch (error) {
    console.error("Error saving active shift:", error);
    throw error;
  }
}

export async function getActiveShift(): Promise<Shift | null> {
  try {
    const data = await AsyncStorage.getItem(ACTIVE_SHIFT_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error getting active shift:", error);
    return null;
  }
}

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
