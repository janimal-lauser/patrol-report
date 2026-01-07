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
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

const SETTINGS_KEY = "@patrol_tracker_settings";

interface Settings {
  autoCenter: boolean;
  highAccuracy: boolean;
}

const defaultSettings: Settings = {
  autoCenter: true,
  highAccuracy: true,
};

export default function ProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();

  const [settings, setSettings] = useState<Settings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      if (data) {
        setSettings(JSON.parse(data));
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const updateSetting = async (key: keyof Settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
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
              await AsyncStorage.clear();
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
            Patrol Officer
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.neutral }}>
            Night Security
          </ThemedText>
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
});
