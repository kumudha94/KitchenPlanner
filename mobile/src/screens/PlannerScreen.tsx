import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { addWeeks, format, startOfWeek, addDays, isToday } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { MealPlanEntry, MealSlot } from "../lib/types";
import type { PlannerStackParamList } from "../../App";
import { colors, radii, spacing, shadow } from "../theme";

type Props = NativeStackScreenProps<PlannerStackParamList, "PlannerWeek">;

const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

const SLOT_ICONS: Record<MealSlot, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  snack: "cafe-outline",
  dinner: "moon-outline",
};

export default function PlannerScreen({ navigation }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(
    () => addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset),
    [weekOffset]
  );
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const startDate = format(days[0], "yyyy-MM-dd");
  const endDate = format(days[6], "yyyy-MM-dd");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["meal-plan", startDate, endDate],
    queryFn: () => apiRequest<MealPlanEntry[]>(`/api/meal-plan?start=${startDate}&end=${endDate}`),
  });

  function entryFor(date: string, slot: MealSlot) {
    return entries?.find((e: MealPlanEntry) => e.date === date && e.slot === slot);
  }

  return (
    <View style={styles.container}>
      <View style={styles.weekHeader}>
        <TouchableOpacity style={styles.weekArrow} onPress={() => setWeekOffset((w) => w - 1)}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {format(days[0], "MMM d")} – {format(days[6], "MMM d")}
        </Text>
        <TouchableOpacity style={styles.weekArrow} onPress={() => setWeekOffset((w) => w + 1)}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading plan…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const today = isToday(day);
            return (
              <View key={dateStr} style={styles.dayCard}>
                <View style={styles.dayHeaderRow}>
                  <Text style={styles.dayLabel}>{format(day, "EEEE, MMM d")}</Text>
                  {today ? (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayBadgeText}>Today</Text>
                    </View>
                  ) : null}
                </View>
                {SLOTS.map((slot) => {
                  const entry = entryFor(dateStr, slot);
                  const displayText = entry?.recipeNameSnapshot || entry?.note || "Add";
                  return (
                    <TouchableOpacity
                      key={slot}
                      style={styles.slotRow}
                      activeOpacity={0.6}
                      onPress={() =>
                        navigation.navigate("SlotEditor", {
                          date: dateStr,
                          slot,
                          recipeId: entry?.recipeId,
                          note: entry?.note,
                        })
                      }
                    >
                      <View style={styles.slotIcon}>
                        <Ionicons name={SLOT_ICONS[slot]} size={16} color={colors.primary} />
                      </View>
                      <Text style={styles.slotName}>{slot}</Text>
                      <Text
                        style={entry ? styles.slotValue : styles.slotEmpty}
                        numberOfLines={1}
                      >
                        {displayText}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 15, color: colors.textSecondary },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  weekArrow: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  weekLabel: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  scrollContent: { padding: spacing.md, paddingBottom: 32 },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow,
  },
  dayHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  dayLabel: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  todayBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  todayBadgeText: { fontSize: 11, fontWeight: "700", color: colors.primaryDark },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  slotIcon: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  slotName: { fontSize: 13, color: colors.textSecondary, textTransform: "capitalize", width: 72 },
  slotValue: { fontSize: 14, color: colors.textPrimary, flex: 1, textAlign: "right", marginRight: 6, fontWeight: "500" },
  slotEmpty: { fontSize: 14, color: colors.textMuted, flex: 1, textAlign: "right", marginRight: 6 },
});
