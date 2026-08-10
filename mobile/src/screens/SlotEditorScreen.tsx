import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { MealPlanEntry, Recipe } from "../lib/types";
import type { PlannerStackParamList } from "../../App";

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
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Pick a recipe</Text>
      <FlatList
        data={recipes ?? []}
        keyExtractor={(item) => String(item.id)}
        style={{ maxHeight: 260 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.recipeRow, selectedRecipeId === item.id && styles.recipeRowActive]}
            onPress={() => setSelectedRecipeId(selectedRecipeId === item.id ? null : item.id)}
          >
            <Text style={styles.recipeRowText}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No recipes yet — add one in the Recipes tab</Text>}
      />

      <Text style={styles.label}>Or just a note</Text>
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="e.g. Leftovers" />

      <TouchableOpacity style={styles.saveButton} onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        <Text style={styles.saveButtonText}>{saveMutation.isPending ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.clearButton} onPress={() => clearMutation.mutate()}>
        <Text style={styles.clearButtonText}>Clear this slot</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginTop: 12, marginBottom: 8 },
  emptyText: { fontSize: 13, color: "#999" },
  recipeRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 6, backgroundColor: "#f7f7f7" },
  recipeRowActive: { backgroundColor: "#c8e6c9" },
  recipeRowText: { fontSize: 15 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  saveButton: { backgroundColor: "#2E7D32", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  clearButton: { alignItems: "center", marginTop: 16 },
  clearButtonText: { color: "#c00", fontSize: 14 },
});
