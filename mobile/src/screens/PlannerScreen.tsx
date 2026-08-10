import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { addWeeks, format, startOfWeek, addDays } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { MealPlanEntry, MealSlot } from "../lib/types";
import type { PlannerStackParamList } from "../../App";

type Props = NativeStackScreenProps<PlannerStackParamList, "PlannerWeek">;

const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];

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
    return entries?.find((e) => e.date === date && e.slot === slot);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text>Loading plan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.weekHeader}>
        <TouchableOpacity onPress={() => setWeekOffset((w) => w - 1)}>
          <Ionicons name="chevron-back" size={22} color="#2E7D32" />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {format(days[0], "MMM d")} - {format(days[6], "MMM d")}
        </Text>
        <TouchableOpacity onPress={() => setWeekOffset((w) => w + 1)}>
          <Ionicons name="chevron-forward" size={22} color="#2E7D32" />
        </TouchableOpacity>
      </View>
      <ScrollView>
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          return (
            <View key={dateStr} style={styles.dayBlock}>
              <Text style={styles.dayLabel}>{format(day, "EEEE, MMM d")}</Text>
              {SLOTS.map((slot) => {
                const entry = entryFor(dateStr, slot);
                const displayText = entry?.recipeNameSnapshot || entry?.note || "+ Add";
                return (
                  <TouchableOpacity
                    key={slot}
                    style={styles.slotRow}
                    onPress={() => navigation.navigate("SlotEditor", { date: dateStr, slot })}
                  >
                    <Text style={styles.slotName}>{slot}</Text>
                    <Text style={entry ? styles.slotValue : styles.slotEmpty}>{displayText}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  weekLabel: { fontSize: 15, fontWeight: "600" },
  dayBlock: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 8, borderBottomColor: "#f5f5f5" },
  dayLabel: { fontSize: 14, fontWeight: "700", marginBottom: 8, color: "#333" },
  slotRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  slotName: { fontSize: 13, color: "#888", textTransform: "capitalize", width: 90 },
  slotValue: { fontSize: 14, color: "#222", flex: 1, textAlign: "right" },
  slotEmpty: { fontSize: 14, color: "#aaa", flex: 1, textAlign: "right" },
});
