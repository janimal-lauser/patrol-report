import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import QuickLogModal from "@/screens/QuickLogModal";
import ShiftSummaryModal from "@/screens/ShiftSummaryModal";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type LogType = "fieldCheck" | "irregularity";

export type RootStackParamList = {
  Main: undefined;
  QuickLog: { type: LogType };
  ShiftSummary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
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
    </Stack.Navigator>
  );
}
