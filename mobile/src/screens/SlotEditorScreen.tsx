import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { MealPlanEntry, Recipe } from "../lib/types";
import type { PlannerStackParamList } from "../../App";
import { colors, radii, spacing } from "../theme";

type Props = NativeStackScreenProps<PlannerStackParamList, "SlotEditor">;

export default function SlotEditorScreen({ route, navigation }: Props) {
  const { date, slot, recipeId: initialRecipeId, note: initialNote } = route.params;
  const queryClient = useQueryClient();

  const { data: recipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiRequest<Recipe[]>("/api/recipes"),
  });

  const [note, setNote] = useState(initialNote || "");
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(initialRecipeId ?? null);

  useEffect(() => {
    navigation.setOptions({ title: `${slot[0].toUpperCase()}${slot.slice(1)} · ${date}` });
  }, []);

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest<MealPlanEntry>(`/api/meal-plan/${date}/${slot}`, {
        method: "PUT",
        body: JSON.stringify({ recipeId: selectedRecipeId, note: note.trim() || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
      navigation.goBack();
    },
    onError: (error: Error) => Alert.alert("Could not save", error.message),
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest<void>(`/api/meal-plan/${date}/${slot}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
      navigation.goBack();
    },
    onError: (error: Error) => Alert.alert("Could not clear slot", error.message),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pick a recipe</Text>
      <FlatList
        data={recipes ?? []}
        keyExtractor={(item) => String(item.id)}
        style={{ maxHeight: 260 }}
        renderItem={({ item }) => {
          const active = selectedRecipeId === item.id;
          return (
            <TouchableOpacity
              style={[styles.recipeRow, active && styles.recipeRowActive]}
              activeOpacity={0.7}
              onPress={() => setSelectedRecipeId(active ? null : item.id)}
            >
              <Text style={[styles.recipeRowText, active && styles.recipeRowTextActive]}>{item.name}</Text>
              {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No recipes yet — add one in the Recipes tab</Text>}
      />

      <Text style={styles.label}>Or just a note</Text>
      <TextInput
        style={styles.input}
        value={note}
        onChangeText={setNote}
        placeholder="e.g. Leftovers"
        placeholderTextColor={colors.textMuted}
      />

      <TouchableOpacity style={styles.saveButton} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        <Text style={styles.saveButtonText}>{saveMutation.isPending ? "Saving…" : "Save"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.clearButton}
        onPress={() => clearMutation.mutate()}
        disabled={clearMutation.isPending || saveMutation.isPending}
      >
        <Text style={styles.clearButtonText}>
          {clearMutation.isPending ? "Clearing…" : "Clear this slot"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  label: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textMuted },
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    marginBottom: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recipeRowActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  recipeRowText: { fontSize: 15, color: colors.textPrimary },
  recipeRowTextActive: { fontWeight: "600", color: colors.primaryDark },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveButtonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  clearButton: { alignItems: "center", marginTop: spacing.md },
  clearButtonText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
});
