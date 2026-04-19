import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { savePhotoToSandbox } from "@/lib/photoStorage";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useShift } from "@/contexts/ShiftContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { formatTime } from "@/lib/storage";
import { RootStackParamList, LogType } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "QuickLog">;
type RouteType = RouteProp<RootStackParamList, "QuickLog">;

export default function QuickLogModal() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { currentLocation, addEvent } = useShift();

  const logType: LogType = route.params?.type || "fieldCheck";
  const isIrregularity = logType === "irregularity";

  const [note, setNote] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: isIrregularity ? "Irregularity" : "Field Check",
      headerLeft: () => (
        <Pressable onPress={() => navigation.goBack()}>
          <ThemedText style={{ color: theme.primary }}>Cancel</ThemedText>
        </Pressable>
      ),
    });
  }, [navigation, isIrregularity, theme]);

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission",
        "Please enable camera access to take photos."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo Library Permission",
        "Please enable photo library access to select photos."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (isIrregularity && !note.trim()) {
      Alert.alert("Note Required", "Please add a description for this irregularity.");
      return;
    }

    setSaving(true);
    try {
      // Foto aus temporaerem Cache in permanente Sandbox kopieren (DSGVO-konform)
      let permanentPhotoUri: string | undefined;
      if (photoUri) {
        permanentPhotoUri = await savePhotoToSandbox(photoUri);
      }

      await addEvent({
        type: logType,
        note: note.trim() || undefined,
        photoUri: permanentPhotoUri,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to save log entry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <View style={[styles.infoCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.infoRow}>
            <Feather name="clock" size={18} color={theme.neutral} />
            <ThemedText type="body">{formatTime(Date.now())}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={18} color={theme.neutral} />
            <ThemedText type="small" style={{ color: theme.neutral }}>
              {currentLocation
                ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`
                : "Getting location..."}
            </ThemedText>
          </View>
          {currentLocation?.accuracy ? (
            <View style={styles.infoRow}>
              <Feather name="target" size={18} color={theme.neutral} />
              <ThemedText type="small" style={{ color: theme.neutral }}>
                Accuracy: {currentLocation.accuracy.toFixed(0)}m
              </ThemedText>
            </View>
          ) : null}
        </View>

        <ThemedText type="body" style={styles.label}>
          Photo (optional)
        </ThemedText>
        <View style={styles.photoSection}>
          {photoUri ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <Pressable
                style={[styles.removePhotoButton, { backgroundColor: theme.error }]}
                onPress={() => setPhotoUri(null)}
              >
                <Feather name="x" size={16} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.photoButtons}>
              <Pressable
                style={[styles.photoButton, { backgroundColor: theme.backgroundDefault }]}
                onPress={handleTakePhoto}
              >
                <Feather name="camera" size={24} color={theme.primary} />
                <ThemedText type="small">Take Photo</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.photoButton, { backgroundColor: theme.backgroundDefault }]}
                onPress={handlePickPhoto}
              >
                <Feather name="image" size={24} color={theme.primary} />
                <ThemedText type="small">Choose Photo</ThemedText>
              </Pressable>
            </View>
          )}
        </View>

        <ThemedText type="body" style={styles.label}>
          Note {isIrregularity ? "(required)" : "(optional)"}
        </ThemedText>
        <TextInput
          style={[
            styles.textInput,
            {
              backgroundColor: theme.backgroundDefault,
              color: theme.text,
              borderColor: isIrregularity && !note.trim() ? theme.error : theme.border,
            },
          ]}
          placeholder={
            isIrregularity
              ? "Describe the irregularity..."
              : "Add a note (e.g., Gate OK, Entrance checked)"
          }
          placeholderTextColor={theme.neutral}
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={200}
          textAlignVertical="top"
        />
        <ThemedText type="caption" style={{ color: theme.neutral, textAlign: "right" }}>
          {note.length}/200
        </ThemedText>

        <View style={styles.buttonContainer}>
          <Button onPress={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Log"}
          </Button>
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
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  infoCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  label: {
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  photoSection: {
    marginBottom: Spacing.md,
  },
  photoButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  photoButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  photoPreviewContainer: {
    position: "relative",
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.md,
    resizeMode: "cover",
  },
  removePhotoButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    minHeight: 100,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    fontSize: 16,
    borderWidth: 1,
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
});
