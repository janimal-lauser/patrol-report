import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ActiveShiftScreen from "@/screens/ActiveShiftScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ActiveShiftStackParamList = {
  ActiveShift: undefined;
};

const Stack = createNativeStackNavigator<ActiveShiftStackParamList>();

export default function ActiveShiftStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ActiveShift"
        component={ActiveShiftScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
