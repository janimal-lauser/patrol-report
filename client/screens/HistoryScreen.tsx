import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { getShifts, formatDuration, formatDate, formatDistance, generateShiftSummary } from "@/lib/storage";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Shift, ShiftSummary } from "@/types/shift";
import { HistoryStackParamList } from "@/navigation/HistoryStackNavigator";

type NavigationProp = NativeStackNavigationProp<HistoryStackParamList>;

export default function HistoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NavigationProp>();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [summaries, setSummaries] = useState<Map<string, ShiftSummary>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadShifts();
    }, [])
  );

  const loadShifts = async () => {
    const data = await getShifts();
    const completedShifts = data.filter((s) => !s.isActive);
    setShifts(completedShifts);

    const summaryMap = new Map<string, ShiftSummary>();
    completedShifts.forEach((shift) => {
      summaryMap.set(shift.id, generateShiftSummary(shift));
    });
    setSummaries(summaryMap);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadShifts();
    setRefreshing(false);
  };

  const handleShiftPress = (shiftId: string) => {
    navigation.navigate("ShiftDetail", { shiftId });
  };

  const renderShiftItem = ({ item }: { item: Shift }) => {
    const summary = summaries.get(item.id);
    if (!summary) return null;

    return (
      <Card
        elevation={1}
        style={styles.shiftCard}
        onPress={() => handleShiftPress(item.id)}
      >
        <View style={styles.cardHeader}>
          <ThemedText type="h4">{formatDate(summary.startTime)}</ThemedText>
          <Feather name="chevron-right" size={20} color={theme.neutral} />
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Feather name="clock" size={16} color={theme.primary} />
            <ThemedText type="body">{formatDuration(summary.duration)}</ThemedText>
          </View>
          <View style={styles.statItem}>
            <Feather name="navigation" size={16} color={theme.warning} />
            <ThemedText type="body">
              {formatDistance(summary.drivingDistance + summary.walkingDistance)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.eventBadges}>
          <View style={[styles.eventBadge, { backgroundColor: theme.success + "20" }]}>
            <Feather name="check-circle" size={14} color={theme.success} />
            <ThemedText style={{ color: theme.success, fontWeight: "600" }}>
              {summary.fieldCheckCount}
            </ThemedText>
          </View>
          <View style={[styles.eventBadge, { backgroundColor: theme.error + "20" }]}>
            <Feather name="alert-triangle" size={14} color={theme.error} />
            <ThemedText style={{ color: theme.error, fontWeight: "600" }}>
              {summary.irregularityCount}
            </ThemedText>
          </View>
        </View>
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="clock" size={64} color={theme.neutral} />
      <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
        No shifts recorded
      </ThemedText>
      <ThemedText type="body" style={{ color: theme.neutral, textAlign: "center" }}>
        Start your first patrol shift to see your history here.
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={shifts}
        keyExtractor={(item) => item.id}
        renderItem={renderShiftItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          shifts.length === 0 && styles.emptyList,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyList: {
    flex: 1,
  },
  shiftCard: {
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardStats: {
    flexDirection: "row",
    gap: Spacing.xl,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  eventBadges: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  eventBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
});
