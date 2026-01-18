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
  getUserName,
  saveUserName,
  getTrackingMode,
  TrackingMode,
} from "@/lib/storage";

interface ShiftContextType {
  activeShift: Shift | null;
  currentMode: PatrolMode;
  isTracking: boolean;
  currentLocation: LocationPoint | null;
  locationPermission: boolean;
  userName: string | null;
  setUserName: (name: string) => Promise<void>;
  startShift: (userName: string) => Promise<void>;
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
  const [userName, setUserNameState] = useState<string | null>(null);
  const [trackingMode, setTrackingMode] = useState<TrackingMode>("continuous");
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const currentModeRef = useRef<PatrolMode>(currentMode);

  useEffect(() => {
    loadActiveShift();
    checkLocationPermission();
    loadUserName();
    loadTrackingMode();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  // Keep ref in sync with state so location tracking uses latest mode
  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  const loadTrackingMode = async () => {
    const mode = await getTrackingMode();
    setTrackingMode(mode);
  };

  const loadUserName = async () => {
    const name = await getUserName();
    setUserNameState(name);
  };

  const handleSetUserName = async (name: string) => {
    await saveUserName(name);
    setUserNameState(name);
  };

  const loadActiveShift = async () => {
    const shift = await getActiveShift();
    if (shift && shift.isActive) {
      setActiveShift(shift);
      setIsTracking(true);
      if (shift.route.length > 0) {
        setCurrentMode(shift.route[shift.route.length - 1].mode);
        setCurrentLocation(shift.route[shift.route.length - 1]);
      }
      if (shift.trackingMode === "continuous" || !shift.trackingMode) {
        startLocationTracking();
      }
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
        const mode = currentModeRef.current;
        const point: LocationPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          mode: mode,
          accuracy: location.coords.accuracy || undefined,
        };
        setCurrentLocation(point);

        setActiveShift((prev) => {
          if (prev && prev.isActive) {
            const updated = {
              ...prev,
              route: [...prev.route, { ...point, mode: mode }],
            };
            saveActiveShift(updated);
            return updated;
          }
          return prev;
        });
      }
    );
  };

  const startShift = async (name: string) => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    await handleSetUserName(name);
    
    const currentTrackingMode = await getTrackingMode();
    setTrackingMode(currentTrackingMode);

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
      userName: name,
      startTime: Date.now(),
      route: [initialPoint],
      events: [],
      isActive: true,
      trackingMode: currentTrackingMode,
    };

    setActiveShift(newShift);
    setCurrentLocation(initialPoint);
    setIsTracking(true);
    await saveActiveShift(newShift);
    
    if (currentTrackingMode === "continuous") {
      await startLocationTracking();
    }

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
    if (!activeShift) return;

    let eventLocation = currentLocation;
    
    if (!eventLocation || trackingMode === "event-only") {
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        const point: LocationPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: location.timestamp,
          mode: currentMode,
          accuracy: location.coords.accuracy || undefined,
        };
        
        eventLocation = point;
        setCurrentLocation(point);
        
        if (trackingMode === "event-only") {
          const updatedRoute = [...activeShift.route, point];
          setActiveShift(prev => prev ? { ...prev, route: updatedRoute } : prev);
        }
      } catch (error) {
        console.error("Error getting location for event:", error);
        return;
      }
    }

    const event: ShiftEvent = {
      ...eventData,
      id: generateId(),
      timestamp: Date.now(),
      latitude: eventLocation.latitude,
      longitude: eventLocation.longitude,
    };

    const updatedShift: Shift = {
      ...activeShift,
      events: [...activeShift.events, event],
      route: trackingMode === "event-only" && eventLocation 
        ? [...activeShift.route, eventLocation]
        : activeShift.route,
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
        userName,
        setUserName: handleSetUserName,
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
