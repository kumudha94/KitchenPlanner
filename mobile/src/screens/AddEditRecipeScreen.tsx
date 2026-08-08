import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { InsertRecipe, Recipe, RecipeIngredient, MealType } from "../lib/types";
import type { RecipesStackParamList } from "../../App";

type Props = NativeStackScreenProps<RecipesStackParamList, "AddEditRecipe">;

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export default function AddEditRecipeScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const isEdit = recipeId !== undefined;
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ["recipes", recipeId],
    queryFn: () => apiRequest<Recipe>(`/api/recipes/${recipeId}`),
    enabled: isEdit,
  });

  const [name, setName] = useState("");
  const [mealType, setMealType] = useState<MealType | undefined>(undefined);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([{ name: "", quantity: "" }]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setMealType(existing.mealType ?? undefined);
      setIngredients(existing.ingredients.length ? existing.ingredients : [{ name: "", quantity: "" }]);
      setNotes(existing.notes ?? "");
    }
  }, [existing]);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? "Edit Recipe" : "Add Recipe" });
  }, [isEdit]);

  const saveMutation = useMutation({
    mutationFn: (data: InsertRecipe) =>
      isEdit
        ? apiRequest<Recipe>(`/api/recipes/${recipeId}`, { method: "PATCH", body: JSON.stringify(data) })
        : apiRequest<Recipe>("/api/recipes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      navigation.goBack();
    },
    onError: (error: Error) => Alert.alert("Could not save recipe", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest<void>(`/api/recipes/${recipeId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      navigation.goBack();
    },
    onError: (error: Error) => Alert.alert("Could not delete recipe", error.message),
  });

  function handleSave() {
    if (!name.trim()) {
      Alert.alert("Recipe name is required");
      return;
    }
    const cleanIngredients = ingredients.filter((i) => i.name.trim().length > 0);
    saveMutation.mutate({
      name: name.trim(),
      mealType,
      ingredients: cleanIngredients,
      notes: notes.trim() || undefined,
    });
  }

  function updateIngredient(index: number, field: "name" | "quantity", value: string) {
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing)));
  }

  function addIngredientRow() {
    setIngredients((prev) => [...prev, { name: "", quantity: "" }]);
  }

  function removeIngredientRow(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Poha" />

      <Text style={styles.label}>Meal type</Text>
      <View style={styles.chipRow}>
        {MEAL_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, mealType === type && styles.chipActive]}
            onPress={() => setMealType(mealType === type ? undefined : type)}
          >
            <Text style={[styles.chipText, mealType === type && styles.chipTextActive]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Ingredients</Text>
      {ingredients.map((ing, index) => (
        <View key={index} style={styles.ingredientRow}>
          <TextInput
            style={[styles.input, { flex: 2, marginRight: 8 }]}
            value={ing.name}
            onChangeText={(v) => updateIngredient(index, "name", v)}
            placeholder="Ingredient"
          />
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={ing.quantity}
            onChangeText={(v) => updateIngredient(index, "quantity", v)}
            placeholder="Qty"
          />
          <TouchableOpacity onPress={() => removeIngredientRow(index)}>
            <Ionicons name="close-circle" size={22} color="#c00" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={addIngredientRow} style={styles.addRow}>
        <Ionicons name="add-circle-outline" size={20} color="#2E7D32" />
        <Text style={styles.addRowText}>Add ingredient</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes"
        multiline
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saveMutation.isPending}>
        <Text style={styles.saveButtonText}>{saveMutation.isPending ? "Saving..." : "Save Recipe"}</Text>
      </TouchableOpacity>

      {isEdit && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() =>
            Alert.alert("Delete recipe?", "This cannot be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate() },
            ])
          }
        >
          <Text style={styles.deleteButtonText}>Delete Recipe</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginTop: 16, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#ddd" },
  chipActive: { backgroundColor: "#2E7D32", borderColor: "#2E7D32" },
  chipText: { fontSize: 13, color: "#555", textTransform: "capitalize" },
  chipTextActive: { color: "#fff" },
  ingredientRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  addRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  addRowText: { color: "#2E7D32", marginLeft: 6, fontSize: 14 },
  saveButton: { backgroundColor: "#2E7D32", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  deleteButton: { alignItems: "center", marginTop: 16, marginBottom: 32 },
  deleteButtonText: { color: "#c00", fontSize: 14 },
});
