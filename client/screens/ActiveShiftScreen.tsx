import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MapView, Polyline, Marker } from "@/components/MapViewCompat";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useShift } from "@/contexts/ShiftContext";
import { Spacing, BorderRadius, RouteColors, Shadows } from "@/constants/theme";
import { formatDuration, formatTime, generateShiftSummary, saveShift } from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { PatrolMode } from "@/types/shift";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RouteFilter = "all" | "driving" | "onFoot";

export default function ActiveShiftScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();
  const mapRef = useRef<any>(null);

  const {
    activeShift,
    currentMode,
    isTracking,
    currentLocation,
    locationPermission,
    userName,
    startShift,
    endShift,
    setMode,
    requestLocationPermission,
  } = useShift();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [routeFilter, setRouteFilter] = useState<RouteFilter>("all");
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const startButtonScale = useSharedValue(1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && activeShift) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - activeShift.startTime);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, activeShift]);

  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        300
      );
    }
  }, [currentLocation]);

  const filteredRoute = useMemo(() => {
    if (!activeShift) return [];
    if (routeFilter === "all") return activeShift.route;
    return activeShift.route.filter((p) => p.mode === routeFilter);
  }, [activeShift, routeFilter]);

  const routeSegments = useMemo(() => {
    if (!activeShift || activeShift.route.length < 2) return [];

    const segments: {
      coordinates: { latitude: number; longitude: number }[];
      color: string;
      mode: PatrolMode;
    }[] = [];

    const segmentDuration = 30 * 60 * 1000;
    const colors = Object.values(RouteColors);
    const startTime = activeShift.startTime;

    let currentSegment: { latitude: number; longitude: number }[] = [];
    let currentMode: PatrolMode = activeShift.route[0].mode;
    let currentColorIndex = 0;

    for (let i = 0; i < activeShift.route.length; i++) {
      const point = activeShift.route[i];
      const elapsed = point.timestamp - startTime;
      const newColorIndex = Math.floor(elapsed / segmentDuration) % colors.length;

      if (routeFilter !== "all" && point.mode !== routeFilter) continue;

      if (newColorIndex !== currentColorIndex || point.mode !== currentMode) {
        if (currentSegment.length > 1) {
          segments.push({
            coordinates: [...currentSegment],
            color: colors[currentColorIndex],
            mode: currentMode,
          });
        }
        currentSegment = currentSegment.length > 0 ? [currentSegment[currentSegment.length - 1]] : [];
        currentColorIndex = newColorIndex;
        currentMode = point.mode;
      }

      currentSegment.push({
        latitude: point.latitude,
        longitude: point.longitude,
      });
    }

    if (currentSegment.length > 1) {
      segments.push({
        coordinates: currentSegment,
        color: colors[currentColorIndex],
        mode: currentMode,
      });
    }

    return segments;
  }, [activeShift, routeFilter]);

  useEffect(() => {
    if (userName) {
      setNameInput(userName);
    }
  }, [userName]);

  const handleStartShift = async () => {
    setShowNameModal(true);
  };

  const handleConfirmStart = async () => {
    const name = nameInput.trim();
    if (!name) {
      Alert.alert("Name Required", "Please enter your name to start the shift.");
      return;
    }

    if (!locationPermission) {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          "Location Required",
          "Please enable location permissions to start tracking your patrol."
        );
        return;
      }
    }

    setShowNameModal(false);
    await startShift(name);
  };

  const handleEndShift = async () => {
    Alert.alert("End Shift", "Are you sure you want to end this shift?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Shift",
        style: "destructive",
        onPress: async () => {
          if (activeShift) {
            const completedShift = {
              ...activeShift,
              endTime: Date.now(),
              isActive: false,
            };
            await saveShift(completedShift);
          }
          await endShift();
          navigation.navigate("ShiftSummary");
        },
      },
    ]);
  };

  const handleFieldCheck = () => {
    navigation.navigate("QuickLog", { type: "fieldCheck" });
  };

  const handleIrregularity = () => {
    navigation.navigate("QuickLog", { type: "irregularity" });
  };

  const startButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: startButtonScale.value }],
  }));

  const handleStartPressIn = () => {
    startButtonScale.value = withSpring(0.95);
  };

  const handleStartPressOut = () => {
    startButtonScale.value = withSpring(1);
  };

  const initialRegion = currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
                initialRegion={initialRegion}
        showsUserLocation={isTracking}
        showsMyLocationButton={false}
        userInterfaceStyle={isDark ? "dark" : "light"}
      >
        {routeSegments.map((segment, index) => (
          <Polyline
            key={`segment-${index}`}
            coordinates={segment.coordinates}
            strokeColor={segment.color}
            strokeWidth={segment.mode === "driving" ? 4 : 2}
            lineDashPattern={segment.mode === "onFoot" ? [10, 5] : undefined}
          />
        ))}

        {activeShift?.events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude,
            }}
            pinColor={event.type === "fieldCheck" ? "#10B981" : "#EF4444"}
            title={event.type === "fieldCheck" ? "Field Check" : "Irregularity"}
            description={event.note || formatTime(event.timestamp)}
          />
        ))}
      </MapView>

      <View style={[styles.statusCard, { top: insets.top + Spacing.lg }]}>
        <View
          style={[
            styles.statusCardInner,
            { backgroundColor: isDark ? "rgba(30,41,59,0.95)" : "rgba(255,255,255,0.95)" },
          ]}
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isTracking ? theme.success : theme.neutral },
              ]}
            >
              <ThemedText style={[styles.statusText, { color: "#fff" }]}>
                {isTracking ? "Active" : "Inactive"}
              </ThemedText>
            </View>
            {isTracking ? (
              <View
                style={[
                  styles.modeBadge,
                  { backgroundColor: theme.warning },
                ]}
              >
                <Feather
                  name={currentMode === "driving" ? "truck" : "user"}
                  size={14}
                  color="#fff"
                />
                <ThemedText style={[styles.modeText, { color: "#fff" }]}>
                  {currentMode === "driving" ? "Driving" : "On Foot"}
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText type="h2" style={styles.timer}>
            {formatDuration(elapsedTime)}
          </ThemedText>
        </View>
      </View>

      {isTracking ? (
        <View style={[styles.filterRow, { top: insets.top + 120 }]}>
          <View
            style={[
              styles.filterContainer,
              { backgroundColor: isDark ? "rgba(30,41,59,0.9)" : "rgba(255,255,255,0.9)" },
            ]}
          >
            {(["all", "driving", "onFoot"] as RouteFilter[]).map((filter) => (
              <Pressable
                key={filter}
                style={[
                  styles.filterButton,
                  routeFilter === filter && {
                    backgroundColor: theme.primary,
                  },
                ]}
                onPress={() => setRouteFilter(filter)}
              >
                <ThemedText
                  style={[
                    styles.filterText,
                    {
                      color: routeFilter === filter ? "#fff" : theme.text,
                    },
                  ]}
                >
                  {filter === "all" ? "All" : filter === "driving" ? "Driving" : "On Foot"}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={[styles.bottomControls, { bottom: tabBarHeight + Spacing.lg }]}>
        {isTracking ? (
          <>
            <View
              style={[
                styles.modeToggleContainer,
                { backgroundColor: isDark ? "rgba(30,41,59,0.95)" : "rgba(255,255,255,0.95)" },
              ]}
            >
              <Pressable
                style={[
                  styles.modeToggleButton,
                  currentMode === "driving" && {
                    backgroundColor: theme.primary,
                  },
                ]}
                onPress={() => setMode("driving")}
              >
                <Feather
                  name="truck"
                  size={20}
                  color={currentMode === "driving" ? "#fff" : theme.text}
                />
                <ThemedText
                  style={[
                    styles.modeToggleText,
                    { color: currentMode === "driving" ? "#fff" : theme.text },
                  ]}
                >
                  Driving
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modeToggleButton,
                  currentMode === "onFoot" && {
                    backgroundColor: theme.primary,
                  },
                ]}
                onPress={() => setMode("onFoot")}
              >
                <Feather
                  name="user"
                  size={20}
                  color={currentMode === "onFoot" ? "#fff" : theme.text}
                />
                <ThemedText
                  style={[
                    styles.modeToggleText,
                    { color: currentMode === "onFoot" ? "#fff" : theme.text },
                  ]}
                >
                  On Foot
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.quickActionsRow}>
              <Pressable
                style={[styles.quickActionButton, { backgroundColor: theme.success }]}
                onPress={handleFieldCheck}
              >
                <Feather name="check-circle" size={24} color="#fff" />
                <ThemedText style={styles.quickActionText}>Field Check</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.quickActionButton, { backgroundColor: theme.error }]}
                onPress={handleIrregularity}
              >
                <Feather name="alert-triangle" size={24} color="#fff" />
                <ThemedText style={styles.quickActionText}>Irregularity</ThemedText>
              </Pressable>
            </View>

            <Pressable
              style={[styles.endShiftButton, { backgroundColor: theme.error }]}
              onPress={handleEndShift}
            >
              <Feather name="stop-circle" size={24} color="#fff" />
              <ThemedText style={styles.endShiftText}>END SHIFT</ThemedText>
            </Pressable>
          </>
        ) : (
          <AnimatedPressable
            style={[
              styles.startShiftButton,
              { backgroundColor: theme.primary },
              startButtonAnimatedStyle,
            ]}
            onPress={handleStartShift}
            onPressIn={handleStartPressIn}
            onPressOut={handleStartPressOut}
          >
            <Feather name="play-circle" size={32} color="#fff" />
            <ThemedText style={styles.startShiftText}>START SHIFT</ThemedText>
          </AnimatedPressable>
        )}
      </View>

      {isTracking && activeShift ? (
        <View style={[styles.legend, { top: insets.top + 170 }]}>
          <View
            style={[
              styles.legendInner,
              { backgroundColor: isDark ? "rgba(30,41,59,0.9)" : "rgba(255,255,255,0.9)" },
            ]}
          >
            <ThemedText type="caption" style={{ marginBottom: 4 }}>
              Time Segments
            </ThemedText>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: RouteColors.segment1 }]} />
              <ThemedText type="caption">0-30m</ThemedText>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: RouteColors.segment2 }]} />
              <ThemedText type="caption">30-60m</ThemedText>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: RouteColors.segment3 }]} />
              <ThemedText type="caption">60-90m</ThemedText>
            </View>
          </View>
        </View>
      ) : null}

      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <ThemedText type="h3" style={{ marginBottom: Spacing.md }}>
              Enter Your Name
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.neutral, marginBottom: Spacing.lg }}>
              Your name will be attached to this shift for identification.
            </ThemedText>
            <TextInput
              style={[
                styles.nameInput,
                {
                  backgroundColor: theme.backgroundDefault,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              placeholder="Enter your name"
              placeholderTextColor={theme.neutral}
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus
              autoCapitalize="words"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.neutral }]}
                onPress={() => setShowNameModal(false)}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                onPress={handleConfirmStart}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Start Shift</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  statusCard: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: "center",
  },
  statusCardInner: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    ...Shadows.small,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  modeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  timer: {
    marginTop: Spacing.sm,
    fontVariant: ["tabular-nums"],
  },
  filterRow: {
    position: "absolute",
    left: Spacing.lg,
  },
  filterContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: 2,
    ...Shadows.small,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
  },
  legend: {
    position: "absolute",
    left: Spacing.lg,
  },
  legendInner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    ...Shadows.small,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bottomControls: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
  },
  modeToggleContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  modeToggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.small,
  },
  quickActionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  endShiftButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.small,
  },
  endShiftText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  startShiftButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
    ...Shadows.medium,
  },
  startShiftText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
});
