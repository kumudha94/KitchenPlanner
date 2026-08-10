import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { addDays, addWeeks, format, isSameDay, isToday, startOfWeek } from "date-fns";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { MealPlanEntry, MealSlot, MealType, Recipe } from "../lib/types";
import type { PlannerStackParamList } from "../../App";
import { useColors, useShadow, radii, spacing, type, type ThemeColors } from "../theme";

type Props = NativeStackScreenProps<PlannerStackParamList, "PlannerWeek">;

const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
const TAP_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function PlannerScreen({ navigation }: Props) {
  const colors = useColors();
  const shadow = useShadow();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const SLOT_META: Record<MealType, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
    breakfast: { icon: "sunny", label: "Breakfast", color: colors.breakfast },
    lunch: { icon: "restaurant", label: "Lunch", color: colors.lunch },
    snack: { icon: "cafe", label: "Snack", color: colors.snack },
    dinner: { icon: "moon", label: "Dinner", color: colors.dinner },
  };

  const [selectedDay, setSelectedDay] = useState(new Date());

  const weekStart = useMemo(() => startOfWeek(selectedDay, { weekStartsOn: 1 }), [selectedDay]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const startDate = format(weekDays[0], "yyyy-MM-dd");
  const endDate = format(weekDays[6], "yyyy-MM-dd");
  const selectedDateStr = format(selectedDay, "yyyy-MM-dd");
  const onToday = isSameDay(selectedDay, new Date());

  const { data: entries, isLoading: entriesLoading } = useQuery({
    queryKey: ["meal-plan", startDate, endDate],
    queryFn: () => apiRequest<MealPlanEntry[]>(`/api/meal-plan?start=${startDate}&end=${endDate}`),
  });

  const { data: recipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiRequest<Recipe[]>("/api/recipes"),
  });

  function entryFor(slot: MealSlot) {
    return entries?.find((e: MealPlanEntry) => e.date === selectedDateStr && e.slot === slot);
  }

  function recipeFor(entry?: MealPlanEntry) {
    if (!entry?.recipeId) return undefined;
    return recipes?.find((r: Recipe) => r.id === entry.recipeId);
  }

  function dayHasMeals(day: Date) {
    const d = format(day, "yyyy-MM-dd");
    return entries?.some((e: MealPlanEntry) => e.date === d && (e.recipeNameSnapshot || e.note));
  }

  function goToToday() {
    setSelectedDay(new Date());
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing.md }]}
    >
      <View style={styles.topRow}>
        <Text style={styles.monthLabel}>{format(weekStart, "MMMM yyyy")}</Text>
        <View style={styles.topRowActions}>
          {!onToday && (
            <TouchableOpacity style={styles.todayPill} hitSlop={TAP_SLOP} onPress={goToToday}>
              <Text style={styles.todayPillText}>Today</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.weekArrow} hitSlop={TAP_SLOP} onPress={() => setSelectedDay((d) => addWeeks(d, -1))}>
            <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.weekArrow} hitSlop={TAP_SLOP} onPress={() => setSelectedDay((d) => addWeeks(d, 1))}>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dayStrip}>
        {weekDays.map((day) => {
          const selected = isSameDay(day, selectedDay);
          const today = isToday(day);
          const hasMeals = dayHasMeals(day);
          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[styles.dayChip, selected && styles.dayChipSelected]}
              activeOpacity={0.7}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayChipWeekday, selected && styles.dayChipTextSelected]}>
                {format(day, "EEEEE")}
              </Text>
              <Text style={[styles.dayChipDate, selected && styles.dayChipTextSelected, today && !selected && styles.dayChipToday]}>
                {format(day, "d")}
              </Text>
              <View style={[styles.dayDot, hasMeals && { backgroundColor: selected ? colors.white : colors.accent }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.heroRow}>
        <Text style={styles.heroTitle}>{onToday ? "Today" : format(selectedDay, "EEEE")}</Text>
        <Text style={styles.heroSubtitle}>{format(selectedDay, "MMMM d, yyyy")}</Text>
      </View>

      {entriesLoading ? (
        <Text style={styles.loadingText}>Loading…</Text>
      ) : (
        <View style={styles.slots}>
          {SLOTS.map((slot) => {
            const entry = entryFor(slot);
            const recipe = recipeFor(entry);
            const meta = SLOT_META[slot];
            const filled = !!(entry?.recipeNameSnapshot || entry?.note);

            return (
              <TouchableOpacity
                key={slot}
                activeOpacity={0.75}
                style={[
                  styles.slotCard,
                  filled ? shadow : { backgroundColor: meta.color + "14", borderStyle: "dashed", borderWidth: 1.5, borderColor: meta.color + "55" },
                ]}
                onPress={() =>
                  navigation.navigate("SlotEditor", {
                    date: selectedDateStr,
                    slot,
                    recipeId: entry?.recipeId,
                    note: entry?.note,
                  })
                }
              >
                <View style={styles.slotLabelRow}>
                  <Ionicons name={meta.icon} size={14} color={meta.color} />
                  <Text style={[styles.slotLabel, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
                </View>

                {filled ? (
                  <View style={styles.filledRow}>
                    {recipe?.imageUrl ? (
                      <Image source={{ uri: recipe.imageUrl }} style={styles.mealThumb} />
                    ) : (
                      <View style={[styles.mealThumb, styles.mealThumbFallback, { backgroundColor: meta.color + "22" }]}>
                        <Ionicons name={meta.icon} size={18} color={meta.color} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealName} numberOfLines={1}>
                        {entry?.recipeNameSnapshot || entry?.note}
                      </Text>
                      <View style={styles.mealMetaRow}>
                        {recipe?.prepTimeMinutes ? (
                          <View style={styles.metaChip}>
                            <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                            <Text style={styles.metaChipText}>{recipe.prepTimeMinutes} min</Text>
                          </View>
                        ) : null}
                        {recipe?.tags.slice(0, 2).map((tag: string) => (
                          <View key={tag} style={styles.metaChip}>
                            <Text style={styles.metaChipText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </View>
                ) : (
                  <View style={styles.emptyRow}>
                    <View style={[styles.addCircle, { backgroundColor: meta.color }]}>
                      <Ionicons name="add" size={16} color={colors.white} />
                    </View>
                    <Text style={[styles.emptyText, { color: meta.color }]}>Add {meta.label.toLowerCase()}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: spacing.md, paddingBottom: 40 },
    loadingText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xl },

    topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
    monthLabel: { ...type.title, color: colors.textPrimary },
    topRowActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    todayPill: {
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.full,
      marginRight: 2,
    },
    todayPillText: { fontSize: 12, fontWeight: "700", color: colors.accentDark },
    weekArrow: {
      width: 30,
      height: 30,
      borderRadius: radii.full,
      backgroundColor: colors.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
    },

    dayStrip: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
    dayChip: {
      width: 42,
      paddingVertical: 8,
      borderRadius: radii.md,
      alignItems: "center",
      gap: 4,
    },
    dayChipSelected: { backgroundColor: colors.accent },
    dayChipWeekday: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
    dayChipDate: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    dayChipToday: { color: colors.accent },
    dayChipTextSelected: { color: colors.white },
    dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" },

    heroRow: { marginBottom: spacing.md },
    heroTitle: { ...type.hero, color: colors.textPrimary },
    heroSubtitle: { ...type.subtitle, color: colors.textSecondary, marginTop: 2 },

    slots: { gap: spacing.sm },
    slotCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      padding: spacing.sm,
    },
    slotLabelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8, marginLeft: 2 },
    slotLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

    filledRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    mealThumb: { width: 44, height: 44, borderRadius: radii.sm },
    mealThumbFallback: { justifyContent: "center", alignItems: "center" },
    mealName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    mealMetaRow: { flexDirection: "row", gap: 6, marginTop: 3, flexWrap: "wrap" },
    metaChip: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.surfaceAlt, borderRadius: radii.full, paddingHorizontal: 7, paddingVertical: 2 },
    metaChipText: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },

    emptyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
    addCircle: { width: 26, height: 26, borderRadius: radii.full, justifyContent: "center", alignItems: "center" },
    emptyText: { fontSize: 14, fontWeight: "700" },
  });
