import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { MapView, Polyline, Marker } from "@/components/MapViewCompat";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import {
  getShiftById,
  deleteShift,
  formatDuration,
  formatTime,
  formatDate,
  formatDistance,
  generateShiftSummary,
} from "@/lib/storage";
import { Spacing, BorderRadius, RouteColors } from "@/constants/theme";
import { Shift, ShiftSummary } from "@/types/shift";
import { HistoryStackParamList } from "@/navigation/HistoryStackNavigator";

type RouteType = RouteProp<HistoryStackParamList, "ShiftDetail">;

export default function ShiftDetailScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteType>();
  const navigation = useNavigation();

  const [shift, setShift] = useState<Shift | null>(null);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);

  useEffect(() => {
    loadShift();
  }, [route.params.shiftId]);

  const loadShift = async () => {
    const data = await getShiftById(route.params.shiftId);
    if (data) {
      setShift(data);
      setSummary(generateShiftSummary(data));
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Shift",
      "Are you sure you want to delete this shift? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteShift(route.params.shiftId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleGeneratePDF = () => {
    Alert.alert(
      "Coming Soon",
      "PDF report generation will be available in the next update."
    );
  };

  if (!shift || !summary) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const mapRegion =
    shift.route.length > 0
      ? {
          latitude: shift.route[0].latitude,
          longitude: shift.route[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
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
          <View style={styles.metadataHeader}>
            <Feather name="calendar" size={24} color={theme.primary} />
            <ThemedText type="h3">{formatDate(summary.startTime)}</ThemedText>
          </View>
          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <ThemedText type="caption">Start</ThemedText>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {formatTime(summary.startTime)}
              </ThemedText>
            </View>
            <Feather name="arrow-right" size={20} color={theme.neutral} />
            <View style={styles.timeItem}>
              <ThemedText type="caption">End</ThemedText>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {formatTime(summary.endTime)}
              </ThemedText>
            </View>
            <View style={styles.timeItem}>
              <ThemedText type="caption">Duration</ThemedText>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {formatDuration(summary.duration)}
              </ThemedText>
            </View>
          </View>
        </Card>

        <View style={styles.statsGrid}>
          <Card elevation={1} style={styles.statCard}>
            <Feather name="truck" size={24} color={theme.warning} />
            <ThemedText type="h3">{formatDistance(summary.drivingDistance)}</ThemedText>
            <ThemedText type="caption">Driving</ThemedText>
          </Card>
          <Card elevation={1} style={styles.statCard}>
            <Feather name="user" size={24} color={theme.primary} />
            <ThemedText type="h3">{formatDistance(summary.walkingDistance)}</ThemedText>
            <ThemedText type="caption">On Foot</ThemedText>
          </Card>
          <Card elevation={1} style={styles.statCard}>
            <Feather name="check-circle" size={24} color={theme.success} />
            <ThemedText type="h3">{summary.fieldCheckCount}</ThemedText>
            <ThemedText type="caption">Field Checks</ThemedText>
          </Card>
          <Card elevation={1} style={styles.statCard}>
            <Feather name="alert-triangle" size={24} color={theme.error} />
            <ThemedText type="h3">{summary.irregularityCount}</ThemedText>
            <ThemedText type="caption">Irregularities</ThemedText>
          </Card>
        </View>

        {mapRegion ? (
          <View style={styles.mapSection}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              Route Map
            </ThemedText>
            <MapView
              style={styles.mapPreview}
                            initialRegion={mapRegion}
              userInterfaceStyle={isDark ? "dark" : "light"}
            >
              <Polyline
                coordinates={shift.route.map((p) => ({
                  latitude: p.latitude,
                  longitude: p.longitude,
                }))}
                strokeColor={RouteColors.segment1}
                strokeWidth={3}
              />
              {shift.events.map((event) => (
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
          </View>
        ) : null}

        {shift.events.length > 0 ? (
          <View style={styles.eventsSection}>
            <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
              Event Log ({shift.events.length})
            </ThemedText>
            {shift.events.map((event) => (
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
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {event.type === "fieldCheck" ? "Field Check" : "Irregularity"}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.neutral }}>
                      {formatTime(event.timestamp)}
                    </ThemedText>
                  </View>
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
          <Button
            onPress={handleDelete}
            style={{ backgroundColor: theme.error }}
          >
            Delete Shift
          </Button>
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
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  metadataCard: {},
  metadataHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeItem: {
    alignItems: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  statCard: {
    width: "47%",
    alignItems: "center",
    gap: Spacing.xs,
  },
  mapSection: {},
  mapPreview: {
    height: 250,
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
    gap: Spacing.md,
  },
  eventTypeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
});
