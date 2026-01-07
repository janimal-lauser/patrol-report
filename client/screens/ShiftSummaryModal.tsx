import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { MapView, Polyline, Marker } from "@/components/MapViewCompat";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import {
  getShifts,
  formatDuration,
  formatTime,
  formatDate,
  formatDistance,
  generateShiftSummary,
} from "@/lib/storage";
import { Spacing, BorderRadius, RouteColors } from "@/constants/theme";
import { Shift, ShiftSummary } from "@/types/shift";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ShiftSummaryModal() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const [lastShift, setLastShift] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);

  useEffect(() => {
    loadLastShift();
  }, []);

  const loadLastShift = async () => {
    const shifts = await getShifts();
    if (shifts.length > 0) {
      const shift = shifts[0];
      setLastShift(shift);
      setSummary(generateShiftSummary(shift));
    }
  };

  const handleGeneratePDF = () => {
    Alert.alert(
      "Coming Soon",
      "PDF report generation will be available in the next update."
    );
  };

  const handleUploadPortal = () => {
    Alert.alert(
      "Coming Soon",
      "Portal upload will be available in the next update."
    );
  };

  const handleDone = () => {
    navigation.goBack();
  };

  if (!lastShift || !summary) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedText type="h4">No shift data available</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const mapRegion =
    lastShift.route.length > 0
      ? {
          latitude: lastShift.route[0].latitude,
          longitude: lastShift.route[0].longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card elevation={1} style={styles.metadataCard}>
          <View style={styles.metadataRow}>
            <View style={styles.metadataItem}>
              <Feather name="calendar" size={20} color={theme.primary} />
              <ThemedText type="caption">Date</ThemedText>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {formatDate(summary.startTime)}
              </ThemedText>
            </View>
            <View style={styles.metadataItem}>
              <Feather name="clock" size={20} color={theme.primary} />
              <ThemedText type="caption">Duration</ThemedText>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {formatDuration(summary.duration)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.metadataRow}>
            <View style={styles.metadataItem}>
              <Feather name="play" size={20} color={theme.success} />
              <ThemedText type="caption">Start</ThemedText>
              <ThemedText type="body">{formatTime(summary.startTime)}</ThemedText>
            </View>
            <View style={styles.metadataItem}>
              <Feather name="square" size={20} color={theme.error} />
              <ThemedText type="caption">End</ThemedText>
              <ThemedText type="body">{formatTime(summary.endTime)}</ThemedText>
            </View>
          </View>
        </Card>

        <Card elevation={1} style={styles.statsCard}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            Distance Traveled
          </ThemedText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="truck" size={24} color={theme.warning} />
              <ThemedText type="h3">{formatDistance(summary.drivingDistance)}</ThemedText>
              <ThemedText type="caption">Driving</ThemedText>
            </View>
            <View style={styles.statItem}>
              <Feather name="user" size={24} color={theme.primary} />
              <ThemedText type="h3">{formatDistance(summary.walkingDistance)}</ThemedText>
              <ThemedText type="caption">On Foot</ThemedText>
            </View>
          </View>
        </Card>

        <Card elevation={1} style={styles.statsCard}>
          <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
            Events Logged
          </ThemedText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.eventBadge, { backgroundColor: theme.success }]}>
                <Feather name="check-circle" size={20} color="#fff" />
              </View>
              <ThemedText type="h3">{summary.fieldCheckCount}</ThemedText>
              <ThemedText type="caption">Field Checks</ThemedText>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.eventBadge, { backgroundColor: theme.error }]}>
                <Feather name="alert-triangle" size={20} color="#fff" />
              </View>
              <ThemedText type="h3">{summary.irregularityCount}</ThemedText>
              <ThemedText type="caption">Irregularities</ThemedText>
            </View>
          </View>
        </Card>

        {mapRegion ? (
          <View style={styles.mapContainer}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              Route Map
            </ThemedText>
            <MapView
              style={styles.mapPreview}
                            initialRegion={mapRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
              userInterfaceStyle={isDark ? "dark" : "light"}
            >
              <Polyline
                coordinates={lastShift.route.map((p) => ({
                  latitude: p.latitude,
                  longitude: p.longitude,
                }))}
                strokeColor={RouteColors.segment1}
                strokeWidth={3}
              />
              {lastShift.events.map((event) => (
                <Marker
                  key={event.id}
                  coordinate={{
                    latitude: event.latitude,
                    longitude: event.longitude,
                  }}
                  pinColor={event.type === "fieldCheck" ? "#10B981" : "#EF4444"}
                />
              ))}
            </MapView>
          </View>
        ) : null}

        {lastShift.events.length > 0 ? (
          <View style={styles.eventsSection}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              Event Log
            </ThemedText>
            {lastShift.events.map((event) => (
              <Card key={event.id} elevation={1} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View
                    style={[
                      styles.eventTypeBadge,
                      {
                        backgroundColor:
                          event.type === "fieldCheck" ? theme.success : theme.error,
                      },
                    ]}
                  >
                    <Feather
                      name={event.type === "fieldCheck" ? "check-circle" : "alert-triangle"}
                      size={14}
                      color="#fff"
                    />
                  </View>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {event.type === "fieldCheck" ? "Field Check" : "Irregularity"}
                  </ThemedText>
                  <ThemedText type="caption" style={{ marginLeft: "auto" }}>
                    {formatTime(event.timestamp)}
                  </ThemedText>
                </View>
                {event.note ? (
                  <ThemedText type="body" style={{ marginTop: Spacing.sm }}>
                    {event.note}
                  </ThemedText>
                ) : null}
                {event.photoUri ? (
                  <Image
                    source={{ uri: event.photoUri }}
                    style={styles.eventPhoto}
                  />
                ) : null}
              </Card>
            ))}
          </View>
        ) : null}

        <View style={styles.actionButtons}>
          <Button onPress={handleGeneratePDF}>Generate PDF Report</Button>
          <Pressable
            style={[styles.secondaryButton, { borderColor: theme.primary }]}
            onPress={handleUploadPortal}
          >
            <Feather name="upload-cloud" size={20} color={theme.primary} />
            <ThemedText style={{ color: theme.primary, fontWeight: "600" }}>
              Upload to Portal
            </ThemedText>
          </Pressable>
          <Pressable style={styles.doneButton} onPress={handleDone}>
            <ThemedText style={{ color: theme.neutral }}>Done</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metadataCard: {
    gap: Spacing.lg,
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  metadataItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  statsCard: {},
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  eventBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  mapContainer: {},
  mapPreview: {
    height: 200,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  eventsSection: {},
  eventCard: {
    marginBottom: Spacing.md,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  eventTypeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  eventPhoto: {
    width: "100%",
    height: 150,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    resizeMode: "cover",
  },
  actionButtons: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  doneButton: {
    alignItems: "center",
    padding: Spacing.md,
  },
});
