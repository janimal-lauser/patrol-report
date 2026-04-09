import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import QuickLogModal from "@/screens/QuickLogModal";
import ShiftSummaryModal from "@/screens/ShiftSummaryModal";
import LoginScreen from "@/screens/LoginScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

export type LogType = "fieldCheck" | "irregularity";

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  QuickLog: { type: LogType };
  ShiftSummary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  // Ladebildschirm waehrend Token-Check
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.backgroundRoot,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="QuickLog"
            component={QuickLogModal}
            options={{
              presentation: "modal",
              headerTitle: "Log Event",
            }}
          />
          <Stack.Screen
            name="ShiftSummary"
            component={ShiftSummaryModal}
            options={{
              presentation: "modal",
              headerTitle: "Shift Summary",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
