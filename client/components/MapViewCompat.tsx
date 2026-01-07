import React from "react";
import { View, StyleSheet, Platform, Text } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

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
}

const WebMapFallback = React.forwardRef<View, MapViewCompatProps>(
  ({ style, children, initialRegion }, ref) => {
    const { theme, isDark } = useTheme();

    return (
      <View
        ref={ref}
        style={[
          styles.webFallback,
          {
            backgroundColor: isDark ? "#1a1a2e" : "#e8f4f8",
          },
          style,
        ]}
      >
        <View style={styles.webContent}>
          <Text style={[styles.webText, { color: theme.text }]}>
            Map View
          </Text>
          <Text style={[styles.webSubtext, { color: theme.neutral }]}>
            Run in Expo Go to see the full map
          </Text>
          {initialRegion ? (
            <Text style={[styles.webCoords, { color: theme.neutral }]}>
              {initialRegion.latitude.toFixed(4)}, {initialRegion.longitude.toFixed(4)}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
    );
  }
);

WebMapFallback.displayName = "WebMapFallback";

const WebPolyline = (_props: PolylineProps) => null;
const WebMarker = (_props: MarkerProps) => null;

let MapViewComponent: React.ComponentType<any>;
let PolylineComponent: React.ComponentType<PolylineProps>;
let MarkerComponent: React.ComponentType<MarkerProps>;

if (Platform.OS === "web") {
  MapViewComponent = WebMapFallback;
  PolylineComponent = WebPolyline;
  MarkerComponent = WebMarker;
} else {
  const Maps = require("react-native-maps");
  MapViewComponent = Maps.default;
  PolylineComponent = Maps.Polyline;
  MarkerComponent = Maps.Marker;
}

export const MapView = MapViewComponent;
export const Polyline = PolylineComponent;
export const Marker = MarkerComponent;

const styles = StyleSheet.create({
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
  },
  webContent: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  webText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  webSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  webCoords: {
    fontSize: 12,
    marginTop: Spacing.md,
    fontFamily: Platform.select({
      ios: "ui-monospace",
      default: "monospace",
    }),
  },
});
