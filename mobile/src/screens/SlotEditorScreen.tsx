import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, ScrollView, StyleSheet, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { MealPlanEntry, MealType, Recipe } from "../lib/types";
import type { PlannerStackParamList } from "../../App";
import { useColors, radii, spacing, type, type ThemeColors } from "../theme";
import RecipeCard from "../components/RecipeCard";

type Props = NativeStackScreenProps<PlannerStackParamList, "SlotEditor">;

const CATEGORIES: { key: MealType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "snack", label: "Snack" },
  { key: "dinner", label: "Dinner" },
];

export default function SlotEditorScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { date, slot } = route.params;
  const queryClient = useQueryClient();

  const { data: entries } = useQuery({
    queryKey: ["meal-plan", date, date],
    queryFn: () => apiRequest<MealPlanEntry[]>(`/api/meal-plan?start=${date}&end=${date}`),
  });

  const { data: recipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiRequest<Recipe[]>("/api/recipes"),
  });

  const { data: recentlyUsed } = useQuery({
    queryKey: ["recipes", "recently-used"],
    queryFn: () => apiRequest<Recipe[]>("/api/recipes/recently-used?limit=8"),
  });

  const currentItems = useMemo(
    () => (entries ?? []).filter((e: MealPlanEntry) => e.date === date && e.slot === slot),
    [entries, date, slot]
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MealType | "all">(slot);
  const [noteMode, setNoteMode] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    navigation.setOptions({ title: `${slot[0].toUpperCase()}${slot.slice(1)} · ${date}` });
  }, []);

  const addMutation = useMutation({
    mutationFn: (body: { recipeId?: number | null; note?: string | null }) =>
      apiRequest<MealPlanEntry>(`/api/meal-plan/${date}/${slot}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
      setNote("");
      setNoteMode(false);
    },
    onError: (error: Error) => Alert.alert("Could not add", error.message),
  });

  const removeItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/api/meal-plan/item/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meal-plan"] }),
    onError: (error: Error) => Alert.alert("Could not remove item", error.message),
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest<void>(`/api/meal-plan/${date}/${slot}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
      navigation.goBack();
    },
    onError: (error: Error) => Alert.alert("Could not clear slot", error.message),
  });

  const quickPicks = useMemo(() => {
    const favorites = (recipes ?? []).filter((r: Recipe) => r.isFavorite);
    const favoriteIds = new Set(favorites.map((r: Recipe) => r.id));
    const recent = (recentlyUsed ?? []).filter((r: Recipe) => !favoriteIds.has(r.id));
    return [...favorites, ...recent].slice(0, 8);
  }, [recipes, recentlyUsed]);

  const filteredRecipes = useMemo(() => {
    let list = recipes ?? [];
    if (category !== "all") list = list.filter((r: Recipe) => r.mealType === category);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r: Recipe) => r.name.toLowerCase().includes(q) || r.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [recipes, category, search]);

  if (noteMode) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Quick note for this slot</Text>
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Leftovers, eating out…"
          placeholderTextColor={colors.textMuted}
          multiline
          autoFocus
        />
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => addMutation.mutate({ note: note.trim() || null })}
          disabled={addMutation.isPending || !note.trim()}
        >
          <Text style={styles.saveButtonText}>{addMutation.isPending ? "Saving…" : "Save note"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkButton} onPress={() => setNoteMode(false)}>
          <Text style={styles.linkButtonText}>Pick a recipe instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {currentItems.length > 0 ? (
        <View style={styles.currentItems}>
          <Text style={styles.label}>Already in this slot</Text>
          {currentItems.map((item) => (
            <View key={item.id} style={styles.currentItemRow}>
              <Text style={styles.currentItemText} numberOfLines={1}>
                {item.recipeNameSnapshot || item.note}
              </Text>
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => removeItemMutation.mutate(item.id)}
                disabled={removeItemMutation.isPending}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      {quickPicks.length > 0 && !search.trim() ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickRow}
          contentContainerStyle={{ gap: 10 }}
        >
          {quickPicks.map((r) => (
            <TouchableOpacity key={r.id} style={styles.quickCard} onPress={() => addMutation.mutate({ recipeId: r.id })}>
              {r.imageUrl ? (
                <Image source={{ uri: r.imageUrl }} style={styles.quickThumb} />
              ) : (
                <View style={[styles.quickThumb, styles.quickThumbFallback]}>
                  <Ionicons name="restaurant" size={16} color={colors.accent} />
                </View>
              )}
              {r.isFavorite ? (
                <View style={styles.quickStar}>
                  <Ionicons name="star" size={10} color={colors.white} />
                </View>
              ) : null}
              <Text style={styles.quickName} numberOfLines={1}>
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.searchRow}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search recipes…"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.categoryRow}>
        {CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredRecipes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: spacing.lg }}
        renderItem={({ item }) => (
          <RecipeCard recipe={item} elevated={false} onPress={() => addMutation.mutate({ recipeId: item.id })} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {recipes?.length ? "No recipes match" : "No recipes yet — add one in the Recipes tab"}
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.linkButton} onPress={() => setNoteMode(true)}>
          <Ionicons name="create-outline" size={15} color={colors.accentDark} />
          <Text style={styles.linkButtonText}>Add a quick note instead</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => clearMutation.mutate()}
          disabled={clearMutation.isPending || currentItems.length === 0}
        >
          <Text style={styles.clearButtonText}>{clearMutation.isPending ? "Clearing…" : "Clear this slot"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  label: { ...type.label, color: colors.textSecondary, marginBottom: spacing.sm },

  currentItems: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  currentItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  currentItemText: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.textPrimary },

  quickRow: { marginBottom: spacing.md, flexGrow: 0 },
  quickCard: { width: 68, alignItems: "center" },
  quickThumb: { width: 52, height: 52, borderRadius: radii.full },
  quickThumbFallback: { backgroundColor: colors.accentSoft, justifyContent: "center", alignItems: "center" },
  quickStar: {
    position: "absolute",
    top: -2,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: radii.full,
    backgroundColor: colors.breakfast,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  quickName: { fontSize: 11, fontWeight: "600", color: colors.textPrimary, textAlign: "center", marginTop: 4 },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },

  categoryRow: { flexDirection: "row", gap: 8, marginTop: spacing.sm, flexWrap: "wrap" },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceAlt,
  },
  categoryChipActive: { backgroundColor: colors.accent },
  categoryChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  categoryChipTextActive: { color: colors.white },

  emptyState: { alignItems: "center", paddingTop: spacing.xl, gap: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: "center" },

  footer: { paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  linkButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  linkButtonText: { color: colors.accentDark, fontSize: 14, fontWeight: "600" },

  noteInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveButtonText: { color: colors.white, fontWeight: "700", fontSize: 15 },

  clearButton: { alignItems: "center", paddingVertical: 8 },
  clearButtonText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  });
