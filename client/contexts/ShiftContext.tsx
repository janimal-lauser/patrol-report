import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { Shift, ShiftEvent, PatrolMode, LocationPoint } from "@/types/shift";
import {
  saveActiveShift,
  getActiveShift,
  saveShift,
  generateId,
} from "@/lib/storage";

interface ShiftContextType {
  activeShift: Shift | null;
  currentMode: PatrolMode;
  isTracking: boolean;
  currentLocation: LocationPoint | null;
  locationPermission: boolean;
  startShift: () => Promise<void>;
  endShift: () => Promise<Shift | undefined>;
  setMode: (mode: PatrolMode) => void;
  addEvent: (event: Omit<ShiftEvent, "id" | "timestamp" | "latitude" | "longitude">) => Promise<void>;
  requestLocationPermission: () => Promise<boolean>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [currentMode, setCurrentMode] = useState<PatrolMode>("driving");
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    loadActiveShift();
    checkLocationPermission();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const loadActiveShift = async () => {
    const shift = await getActiveShift();
    if (shift && shift.isActive) {
      setActiveShift(shift);
      setIsTracking(true);
      if (shift.route.length > 0) {
        setCurrentMode(shift.route[shift.route.length - 1].mode);
      }
      startLocationTracking();
    }
  };

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setLocationPermission(status === "granted");
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === "granted";
    setLocationPermission(granted);
    return granted;
  };

  const startLocationTracking = async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
    }

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (location) => {
        const point: LocationPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          mode: currentMode,
          accuracy: location.coords.accuracy || undefined,
        };
        setCurrentLocation(point);

        setActiveShift((prev) => {
          if (prev && prev.isActive) {
            const updated = {
              ...prev,
              route: [...prev.route, { ...point, mode: currentMode }],
            };
            saveActiveShift(updated);
            return updated;
          }
          return prev;
        });
      }
    );
  };

  const startShift = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const initialPoint: LocationPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: location.timestamp,
      mode: currentMode,
      accuracy: location.coords.accuracy || undefined,
    };

    const newShift: Shift = {
      id: generateId(),
      startTime: Date.now(),
      route: [initialPoint],
      events: [],
      isActive: true,
    };

    setActiveShift(newShift);
    setCurrentLocation(initialPoint);
    setIsTracking(true);
    await saveActiveShift(newShift);
    await startLocationTracking();

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const endShift = async () => {
    if (!activeShift) return;

    const completedShift: Shift = {
      ...activeShift,
      endTime: Date.now(),
      isActive: false,
    };

    await saveShift(completedShift);
    await saveActiveShift(null);

    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    setActiveShift(null);
    setIsTracking(false);
    setCurrentLocation(null);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    return completedShift;
  };

  const setMode = useCallback((mode: PatrolMode) => {
    setCurrentMode(mode);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const addEvent = async (
    eventData: Omit<ShiftEvent, "id" | "timestamp" | "latitude" | "longitude">
  ) => {
    if (!activeShift || !currentLocation) return;

    const event: ShiftEvent = {
      ...eventData,
      id: generateId(),
      timestamp: Date.now(),
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
    };

    const updatedShift: Shift = {
      ...activeShift,
      events: [...activeShift.events, event],
    };

    setActiveShift(updatedShift);
    await saveActiveShift(updatedShift);

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <ShiftContext.Provider
      value={{
        activeShift,
        currentMode,
        isTracking,
        currentLocation,
        locationPermission,
        startShift,
        endShift,
        setMode,
        addEvent,
        requestLocationPermission,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error("useShift must be used within a ShiftProvider");
  }
  return context;
}
