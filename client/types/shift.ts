export type PatrolMode = "driving" | "onFoot";

export type EventType = "fieldCheck" | "irregularity";

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  mode: PatrolMode;
  accuracy?: number;
}

export interface ShiftEvent {
  id: string;
  type: EventType;
  timestamp: number;
  latitude: number;
  longitude: number;
  note?: string;
  photoUri?: string;
}

export interface Shift {
  id: string;
  userName: string;
  startTime: number;
  endTime?: number;
  route: LocationPoint[];
  events: ShiftEvent[];
  isActive: boolean;
  trackingMode?: "continuous" | "event-only";
  synced?: boolean;
}

export interface ShiftSummary {
  id: string;
  userName: string;
  date: string;
  startTime: number;
  endTime: number;
  duration: number;
  drivingDistance: number;
  walkingDistance: number;
  fieldCheckCount: number;
  irregularityCount: number;
}
