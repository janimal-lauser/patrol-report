import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function LoginScreen() {
  const { theme } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Bitte E-Mail und Passwort eingeben");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || "Login fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.logoSection}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Feather name="shield" size={48} color="#fff" />
          </View>
          <ThemedText type="h2" style={{ marginTop: Spacing.lg }}>
            PatrolReport
          </ThemedText>
          <ThemedText
            type="body"
            style={{ color: theme.neutral, marginTop: Spacing.xs }}
          >
            Sicherheitsdienst-Dokumentation
          </ThemedText>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="E-Mail"
            placeholderTextColor={theme.neutral}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            editable={!isSubmitting}
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Passwort"
            placeholderTextColor={theme.neutral}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
            editable={!isSubmitting}
            onSubmitEditing={handleLogin}
          />

          {error && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: theme.error + "15" },
              ]}
            >
              <Feather name="alert-circle" size={16} color={theme.error} />
              <ThemedText
                type="body"
                style={{ color: theme.error, flex: 1 }}
              >
                {error}
              </ThemedText>
            </View>
          )}

          <Button onPress={handleLogin} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              "Einloggen"
            )}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
});
