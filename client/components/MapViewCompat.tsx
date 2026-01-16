import React from "react";
import { View, StyleSheet, Platform, Text } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";

interface MapViewCompatProps {
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  userInterfaceStyle?: "light" | "dark";
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  pitchEnabled?: boolean;
  rotateEnabled?: boolean;
  children?: React.ReactNode;
  ref?: any;
}

interface PolylineProps {
  coordinates: { latitude: number; longitude: number }[];
  strokeColor?: string;
  strokeWidth?: number;
  lineDashPattern?: number[];
}

interface MarkerProps {
  coordinate: { latitude: number; longitude: number };
  pinColor?: string;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

const isExpoGo = Constants.appOwnership === "expo";

const FallbackMap = React.forwardRef<View, MapViewCompatProps>(
  ({ style, children, initialRegion }, ref) => {
    const { theme, isDark } = useTheme();

    return (
      <View
        ref={ref}
        style={[
          styles.fallback,
          {
            backgroundColor: isDark ? "#1a1a2e" : "#e8f4f8",
          },
          style,
        ]}
      >
        <View style={styles.content}>
          <Feather name="map" size={48} color={theme.neutral} style={{ marginBottom: Spacing.md }} />
          <Text style={[styles.title, { color: theme.text }]}>
            Map View
          </Text>
          <Text style={[styles.subtitle, { color: theme.neutral }]}>
            {Platform.OS === "web" 
              ? "Maps are available in the mobile app"
              : "Native maps require a development build"}
          </Text>
          {initialRegion ? (
            <View style={[styles.coordsBox, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}>
              <Feather name="map-pin" size={14} color={theme.primary} />
              <Text style={[styles.coords, { color: theme.text }]}>
                {initialRegion.latitude.toFixed(4)}, {initialRegion.longitude.toFixed(4)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    );
  }
);

FallbackMap.displayName = "FallbackMap";

const FallbackPolyline: React.FC<PolylineProps> = () => null;
const FallbackMarker: React.FC<MarkerProps> = () => null;

const useFallback = Platform.OS === "web" || isExpoGo;

let RealMapView: React.ComponentType<any> | null = null;
let RealPolyline: React.ComponentType<PolylineProps> | null = null;
let RealMarker: React.ComponentType<MarkerProps> | null = null;

if (!useFallback) {
  try {
    const Maps = require("react-native-maps");
    RealMapView = Maps.default;
    RealPolyline = Maps.Polyline;
    RealMarker = Maps.Marker;
  } catch (e) {
    console.log("react-native-maps not available");
  }
}

export const MapView = RealMapView || FallbackMap;
export const Polyline = RealPolyline || FallbackPolyline;
export const Marker = RealMarker || FallbackMarker;

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },
  content: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 250,
  },
  coordsBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  coords: {
    fontSize: 13,
    fontFamily: Platform.select({
      ios: "ui-monospace",
      default: "monospace",
    }),
  },
});
