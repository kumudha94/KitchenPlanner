import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { InsertRecipe, Recipe, RecipeIngredient, MealType } from "../lib/types";
import type { RecipesStackParamList } from "../../App";
import { useColors, radii, spacing, type ThemeColors } from "../theme";

type Props = NativeStackScreenProps<RecipesStackParamList, "AddEditRecipe">;

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "snack", "dinner"];

export default function AddEditRecipeScreen({ route, navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  const [prepTime, setPrepTime] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setMealType(existing.mealType ?? undefined);
      setIngredients(existing.ingredients.length ? existing.ingredients : [{ name: "", quantity: "" }]);
      setNotes(existing.notes ?? "");
      setPrepTime(existing.prepTimeMinutes ? String(existing.prepTimeMinutes) : "");
      setTags(existing.tags ?? []);
      setImageUrl(existing.imageUrl ?? "");
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
      queryClient.invalidateQueries({ queryKey: ["meal-plan"] });
      navigation.goBack();
    },
    onError: (error: Error) => Alert.alert("Could not delete recipe", error.message),
  });

  function handleSave() {
    if (!name.trim()) {
      Alert.alert("Recipe name is required");
      return;
    }
    const cleanIngredients = ingredients.filter((i) => i.name.trim().length > 0 && i.quantity.trim().length > 0);
    const parsedPrepTime = prepTime.trim() ? parseInt(prepTime.trim(), 10) : null;
    saveMutation.mutate({
      name: name.trim(),
      mealType: mealType ?? null,
      ingredients: cleanIngredients,
      notes: notes.trim() || null,
      prepTimeMinutes: parsedPrepTime && parsedPrepTime > 0 ? parsedPrepTime : null,
      tags,
      imageUrl: imageUrl.trim() || null,
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

  function addTag() {
    const t = tagDraft.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagDraft("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Poha"
        placeholderTextColor={colors.textMuted}
      />

      <Text style={styles.label}>Meal type</Text>
      <View style={styles.chipRow}>
        {MEAL_TYPES.map((mt) => (
          <TouchableOpacity
            key={mt}
            style={[styles.chip, mealType === mt && styles.chipActive]}
            onPress={() => setMealType(mealType === mt ? undefined : mt)}
          >
            <Text style={[styles.chipText, mealType === mt && styles.chipTextActive]}>{mt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Prep time</Text>
          <View style={styles.inputWithSuffix}>
            <TextInput
              style={styles.inputInner}
              value={prepTime}
              onChangeText={(v) => setPrepTime(v.replace(/[^0-9]/g, ""))}
              placeholder="15"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
            <Text style={styles.suffix}>min</Text>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Tags</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={tagDraft}
          onChangeText={setTagDraft}
          placeholder="e.g. Quick, Vegetarian, Kids"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={addTag}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.tagAddButton} onPress={addTag}>
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
      {tags.length > 0 && (
        <View style={styles.chipRow}>
          {tags.map((t) => (
            <TouchableOpacity key={t} style={styles.tagChip} onPress={() => removeTag(t)}>
              <Text style={styles.tagChipText}>{t}</Text>
              <Ionicons name="close" size={13} color={colors.accentDark} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Image URL (optional)</Text>
      <TextInput
        style={styles.input}
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="https://…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="url"
      />
      {imageUrl.trim() ? <Image source={{ uri: imageUrl.trim() }} style={styles.imagePreview} /> : null}

      <Text style={styles.label}>Ingredients</Text>
      {ingredients.map((ing, index) => (
        <View key={index} style={styles.ingredientRow}>
          <TextInput
            style={[styles.input, { flex: 2, marginRight: 8 }]}
            value={ing.name}
            onChangeText={(v) => updateIngredient(index, "name", v)}
            placeholder="Ingredient"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            value={ing.quantity}
            onChangeText={(v) => updateIngredient(index, "quantity", v)}
            placeholder="Qty"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity onPress={() => removeIngredientRow(index)}>
            <Ionicons name="close-circle" size={22} color={colors.danger} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={addIngredientRow} style={styles.addRow}>
        <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
        <Text style={styles.addRowText}>Add ingredient</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional notes"
        placeholderTextColor={colors.textMuted}
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  label: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginTop: spacing.md, marginBottom: 6 },
  row: { flexDirection: "row", gap: spacing.sm },
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
  inputWithSuffix: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
  },
  inputInner: { flex: 1, paddingVertical: 10, fontSize: 15, color: colors.textPrimary },
  suffix: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.textSecondary, textTransform: "capitalize" },
  chipTextActive: { color: colors.white, fontWeight: "600" },
  tagInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  tagAddButton: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  tagChipText: { fontSize: 13, color: colors.accentDark, fontWeight: "600" },
  imagePreview: { width: "100%", height: 140, borderRadius: radii.md, marginTop: spacing.sm, backgroundColor: colors.surfaceAlt },
  ingredientRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  addRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  addRowText: { color: colors.accent, marginLeft: 6, fontSize: 14, fontWeight: "600" },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  saveButtonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  deleteButton: { alignItems: "center", marginTop: spacing.md, marginBottom: spacing.xl },
  deleteButtonText: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  });
