import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiRequest } from "../lib/api";
import type { MealPlanEntry, MealSlot, MealType, PrepTask, Recipe } from "../lib/types";
import { useColors, radii, spacing, type, type ThemeColors } from "../theme";

const SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
const SLOT_ICON: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny",
  lunch: "restaurant",
  snack: "cafe",
  dinner: "moon",
};

export default function PrepLogScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const tomorrow = useMemo(() => addDays(new Date(), 1), []);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  const { data: entries } = useQuery({
    queryKey: ["meal-plan", tomorrowStr, tomorrowStr],
    queryFn: () => apiRequest<MealPlanEntry[]>(`/api/meal-plan?start=${tomorrowStr}&end=${tomorrowStr}`),
  });

  const { data: recipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiRequest<Recipe[]>("/api/recipes"),
  });

  const plannedMeals = SLOTS.map((slot) => {
    const entry = entries?.find((e: MealPlanEntry) => e.slot === slot);
    if (!entry || (!entry.recipeNameSnapshot && !entry.note)) return null;
    const recipe = entry.recipeId ? recipes?.find((r: Recipe) => r.id === entry.recipeId) : undefined;
    return { slot, label: entry.recipeNameSnapshot || entry.note!, prepTime: recipe?.prepTimeMinutes };
  }).filter((m): m is NonNullable<typeof m> => m !== null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["prep-log", tomorrowStr],
    queryFn: () => apiRequest<PrepTask[]>(`/api/prep-log?date=${tomorrowStr}`),
  });

  const [description, setDescription] = useState("");

  const addMutation = useMutation({
    mutationFn: () =>
      apiRequest<PrepTask>("/api/prep-log", {
        method: "POST",
        body: JSON.stringify({ description: description.trim(), forDate: tomorrowStr }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prep-log", tomorrowStr] });
      setDescription("");
    },
    onError: (error: Error) => Alert.alert("Could not add task", error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, checked }: { id: number; checked: boolean }) =>
      apiRequest<PrepTask>(`/api/prep-log/${id}`, { method: "PATCH", body: JSON.stringify({ checked }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prep-log", tomorrowStr] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/api/prep-log/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prep-log", tomorrowStr] }),
  });

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
      data={tasks ?? []}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View>
          <Text style={styles.heroTitle}>Tomorrow</Text>
          <Text style={styles.heroSubtitle}>{format(tomorrow, "EEEE, MMMM d")}</Text>

          {plannedMeals.length > 0 ? (
            <View style={styles.mealsRow}>
              {plannedMeals.map((m) => (
                <View key={m.slot} style={styles.mealChip}>
                  <Ionicons name={SLOT_ICON[m.slot]} size={13} color={colors.accent} />
                  <Text style={styles.mealChipText} numberOfLines={1}>
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noMealsBox}>
              <Text style={styles.noMealsText}>Nothing planned for tomorrow yet — add meals in the Planner</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>PREP TASKS</Text>
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Marinate chicken, soak rice…"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={() => description.trim() && addMutation.mutate()}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => description.trim() && addMutation.mutate()}
              disabled={!description.trim() || addMutation.isPending}
            >
              <Ionicons name="add" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
          {isLoading ? <Text style={styles.loadingText}>Loading…</Text> : null}
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="flame-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>No prep tasks yet</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={styles.itemRow}>
          <TouchableOpacity
            style={[styles.checkbox, item.checked && styles.checkboxChecked]}
            onPress={() => toggleMutation.mutate({ id: item.id, checked: !item.checked })}
          >
            {item.checked ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
          </TouchableOpacity>
          <Text style={[styles.itemText, item.checked && styles.itemTextChecked]}>{item.description}</Text>
          <TouchableOpacity onPress={() => deleteMutation.mutate(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingText: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm },

    heroTitle: { ...type.hero, color: colors.textPrimary },
    heroSubtitle: { ...type.subtitle, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.md },

    mealsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.lg },
    mealChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: colors.surface,
      borderRadius: radii.full,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      maxWidth: 160,
    },
    mealChipText: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
    noMealsBox: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: radii.sm,
      padding: spacing.sm,
      marginBottom: spacing.lg,
    },
    noMealsText: { fontSize: 13, color: colors.textSecondary },

    sectionLabel: { ...type.label, color: colors.textMuted, marginBottom: spacing.sm },
    addRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
    input: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.textPrimary,
    },
    addButton: {
      width: 42,
      borderRadius: radii.sm,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
    },

    emptyState: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
    emptyText: { fontSize: 14, color: colors.textSecondary },

    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 12,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: radii.full,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
    itemText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    itemTextChecked: { textDecorationLine: "line-through", color: colors.textMuted },
  });
