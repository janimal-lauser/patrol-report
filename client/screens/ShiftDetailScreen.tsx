import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { MapView, Polyline, Marker } from "@/components/MapViewCompat";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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

  const handleGeneratePDF = async () => {
    if (!shift || !summary) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const eventsHtml = shift.events.map((event) => `
        <div class="event ${event.type}">
          <div class="event-header">
            <span class="event-type">${event.type === "fieldCheck" ? "Field Check" : "Irregularity"}</span>
            <span class="event-time">${formatTime(event.timestamp)}</span>
          </div>
          ${event.note ? `<p class="event-note">${event.note}</p>` : ""}
          <p class="event-location">Location: ${event.latitude.toFixed(5)}, ${event.longitude.toFixed(5)}</p>
        </div>
      `).join("");

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Patrol Report - ${formatDate(summary.startTime)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1e293b; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
            .header h1 { font-size: 24px; color: #3b82f6; margin-bottom: 5px; }
            .header p { color: #64748b; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 16px; font-weight: 600; color: #3b82f6; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
            .info-grid { display: flex; flex-wrap: wrap; gap: 15px; }
            .info-item { flex: 1; min-width: 120px; background: #f8fafc; padding: 12px; border-radius: 8px; }
            .info-item .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
            .info-item .value { font-size: 16px; font-weight: 600; margin-top: 4px; }
            .stats-grid { display: flex; gap: 15px; flex-wrap: wrap; }
            .stat { flex: 1; min-width: 100px; background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; }
            .stat .value { font-size: 20px; font-weight: 700; color: #3b82f6; }
            .stat .label { font-size: 11px; color: #64748b; margin-top: 4px; }
            .event { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #10b981; }
            .event.irregularity { border-left-color: #ef4444; }
            .event-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .event-type { font-weight: 600; }
            .event-time { color: #64748b; font-size: 13px; }
            .event-note { margin: 8px 0; }
            .event-location { font-size: 12px; color: #94a3b8; }
            .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Patrol Tracker Report</h1>
            <p>Shift Report for ${summary.userName}</p>
          </div>
          
          <div class="section">
            <div class="section-title">Shift Details</div>
            <div class="info-grid">
              <div class="info-item">
                <div class="label">Date</div>
                <div class="value">${formatDate(summary.startTime)}</div>
              </div>
              <div class="info-item">
                <div class="label">Start Time</div>
                <div class="value">${formatTime(summary.startTime)}</div>
              </div>
              <div class="info-item">
                <div class="label">End Time</div>
                <div class="value">${formatTime(summary.endTime)}</div>
              </div>
              <div class="info-item">
                <div class="label">Duration</div>
                <div class="value">${formatDuration(summary.duration)}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Statistics</div>
            <div class="stats-grid">
              <div class="stat">
                <div class="value">${formatDistance(summary.drivingDistance)}</div>
                <div class="label">Driving Distance</div>
              </div>
              <div class="stat">
                <div class="value">${formatDistance(summary.walkingDistance)}</div>
                <div class="label">Walking Distance</div>
              </div>
              <div class="stat">
                <div class="value">${summary.fieldCheckCount}</div>
                <div class="label">Field Checks</div>
              </div>
              <div class="stat">
                <div class="value">${summary.irregularityCount}</div>
                <div class="label">Irregularities</div>
              </div>
            </div>
          </div>
          
          ${shift.events.length > 0 ? `
          <div class="section">
            <div class="section-title">Event Log (${shift.events.length})</div>
            ${eventsHtml}
          </div>
          ` : ""}
          
          <div class="footer">
            Generated by Patrol Tracker on ${new Date().toLocaleString()}
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === "web") {
        Alert.alert("Success", "PDF generated successfully.");
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Patrol Report - ${formatDate(summary.startTime)}`,
          });
        } else {
          Alert.alert("Success", `PDF saved to: ${uri}`);
        }
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Error", "Failed to generate PDF report. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
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
          <Button onPress={handleGeneratePDF} disabled={isGeneratingPDF}>
            {isGeneratingPDF ? "Generating PDF..." : "Generate PDF Report"}
          </Button>
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
