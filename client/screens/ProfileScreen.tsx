import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";
import { getSettings, saveSettings, clearAllData, type Settings, type TrackingMode } from "@/lib/storage";
import { deleteAllPhotos } from "@/lib/photoStorage";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

const defaultSettings: Settings = {
  autoCenter: true,
  highAccuracy: true,
  trackingMode: "continuous",
};

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();

  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await getSettings();
      setSettings(saved);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will delete all your shift history and settings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllData();
              await deleteAllPhotos();
              setSettings(defaultSettings);
              Alert.alert("Success", "All data has been cleared.");
            } catch (error) {
              Alert.alert("Error", "Failed to clear data.");
            }
          },
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "Patrol Tracker",
      "Version 1.0.0\n\nA simple mobile app for solo night patrol services. Track your location, log field checks and irregularities, and generate shift reports.\n\nBuilt with Expo and React Native."
    );
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Feather name="shield" size={48} color="#fff" />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.md }}>
            {user?.name || "Patrol Officer"}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.neutral }}>
            {user?.email || ""}
          </ThemedText>
          {user?.role === "admin" && (
            <ThemedText type="caption" style={{ color: theme.primary, marginTop: Spacing.xs }}>
              Administrator
            </ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            GPS TRACKING MODE
          </ThemedText>
          <Card elevation={1} style={styles.settingsCard}>
            <View style={styles.trackingModeContainer}>
              <Pressable
                style={[
                  styles.trackingModeOption,
                  { backgroundColor: settings.trackingMode === "continuous" ? theme.primary : theme.surface },
                ]}
                onPress={() => updateSetting("trackingMode", "continuous" as TrackingMode)}
              >
                <Feather
                  name="radio"
                  size={24}
                  color={settings.trackingMode === "continuous" ? "#fff" : theme.text}
                />
                <ThemedText
                  type="body"
                  style={{ color: settings.trackingMode === "continuous" ? "#fff" : theme.text, fontWeight: "600" }}
                >
                  Continuous
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: settings.trackingMode === "continuous" ? "rgba(255,255,255,0.8)" : theme.neutral, textAlign: "center" }}
                >
                  Full route tracking
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.trackingModeOption,
                  { backgroundColor: settings.trackingMode === "event-only" ? theme.primary : theme.surface },
                ]}
                onPress={() => updateSetting("trackingMode", "event-only" as TrackingMode)}
              >
                <Feather
                  name="map-pin"
                  size={24}
                  color={settings.trackingMode === "event-only" ? "#fff" : theme.text}
                />
                <ThemedText
                  type="body"
                  style={{ color: settings.trackingMode === "event-only" ? "#fff" : theme.text, fontWeight: "600" }}
                >
                  Event-Only
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ color: settings.trackingMode === "event-only" ? "rgba(255,255,255,0.8)" : theme.neutral, textAlign: "center" }}
                >
                  Privacy-compliant
                </ThemedText>
              </Pressable>
            </View>
            <View style={[styles.trackingModeInfo, { borderTopColor: theme.border }]}>
              <Feather name="info" size={16} color={theme.neutral} />
              <ThemedText type="caption" style={{ color: theme.neutral, flex: 1 }}>
                {settings.trackingMode === "continuous"
                  ? "Records your location every few seconds for full route visualization."
                  : "Only records location when you log field checks or irregularities. German labor law compliant."}
              </ThemedText>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            MAP SETTINGS
          </ThemedText>
          <Card elevation={1} style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="crosshair" size={20} color={theme.text} />
                <ThemedText type="body">Auto-center map</ThemedText>
              </View>
              <Switch
                value={settings.autoCenter}
                onValueChange={(value) => updateSetting("autoCenter", value)}
                trackColor={{ false: theme.neutral, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Feather name="target" size={20} color={theme.text} />
                <ThemedText type="body">High accuracy GPS</ThemedText>
              </View>
              <Switch
                value={settings.highAccuracy}
                onValueChange={(value) => updateSetting("highAccuracy", value)}
                trackColor={{ false: theme.neutral, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            REPORTS
          </ThemedText>
          <Card elevation={1} style={styles.settingsCard}>
            <Pressable style={styles.menuItem}>
              <Feather name="file-text" size={20} color={theme.text} />
              <ThemedText type="body" style={{ flex: 1 }}>
                PDF Quality
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.neutral }}>
                High
              </ThemedText>
              <Feather name="chevron-right" size={20} color={theme.neutral} />
            </Pressable>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Pressable style={styles.menuItem}>
              <Feather name="upload-cloud" size={20} color={theme.text} />
              <ThemedText type="body" style={{ flex: 1 }}>
                Portal Auto-upload
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.neutral }}>
                Off
              </ThemedText>
              <Feather name="chevron-right" size={20} color={theme.neutral} />
            </Pressable>
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            ACCOUNT
          </ThemedText>
          <Card elevation={1} style={styles.settingsCard}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                Alert.alert(
                  "Abmelden",
                  "Moechtest du dich wirklich abmelden?",
                  [
                    { text: "Abbrechen", style: "cancel" },
                    {
                      text: "Abmelden",
                      style: "destructive",
                      onPress: logout,
                    },
                  ]
                );
              }}
            >
              <Feather name="log-out" size={20} color={theme.error} />
              <ThemedText type="body" style={{ color: theme.error }}>
                Abmelden
              </ThemedText>
            </Pressable>
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            DATA
          </ThemedText>
          <Card elevation={1} style={styles.settingsCard}>
            <Pressable style={styles.menuItem} onPress={handleClearData}>
              <Feather name="trash-2" size={20} color={theme.error} />
              <ThemedText type="body" style={{ color: theme.error }}>
                Clear All Data
              </ThemedText>
            </Pressable>
          </Card>
        </View>

        <View style={styles.section}>
          <ThemedText type="caption" style={styles.sectionTitle}>
            ABOUT
          </ThemedText>
          <Card elevation={1} style={styles.settingsCard}>
            <Pressable style={styles.menuItem} onPress={handleAbout}>
              <Feather name="info" size={20} color={theme.text} />
              <ThemedText type="body" style={{ flex: 1 }}>
                About Patrol Tracker
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.neutral }}>
                v1.0.0
              </ThemedText>
              <Feather name="chevron-right" size={20} color={theme.neutral} />
            </Pressable>
          </Card>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {},
  sectionTitle: {
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    opacity: 0.7,
  },
  settingsCard: {
    padding: 0,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 20 + Spacing.md,
  },
  trackingModeContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  trackingModeOption: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  trackingModeInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});
