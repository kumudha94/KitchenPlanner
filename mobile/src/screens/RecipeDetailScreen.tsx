import { useEffect, useMemo, useState } from "react";
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import { scaleQuantity } from "../lib/scaling";
import type { Recipe, MealType, RecipeIngredient } from "../lib/types";
import type { RecipesStackParamList } from "../../App";
import { useColors, useShadow, radii, spacing, type, type ThemeColors } from "../theme";

type Props = NativeStackScreenProps<RecipesStackParamList, "RecipeDetail">;

const MEAL_ICON: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny",
  lunch: "restaurant",
  snack: "cafe",
  dinner: "moon",
};

export default function RecipeDetailScreen({ route, navigation }: Props) {
  const { recipeId } = route.params;
  const colors = useColors();
  const shadow = useShadow();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const { data: recipe } = useQuery({
    queryKey: ["recipes", recipeId],
    queryFn: () => apiRequest<Recipe>(`/api/recipes/${recipeId}`),
  });

  const [servings, setServings] = useState<number | null>(null);

  useEffect(() => {
    if (recipe && servings === null) setServings(recipe.servings);
  }, [recipe, servings]);

  useEffect(() => {
    navigation.setOptions({
      title: recipe?.name ?? "Recipe",
      headerRight: () => (
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.navigate("AddEditRecipe", { recipeId })}
        >
          <Text style={styles.editLink}>Edit</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, recipe, recipeId, styles.editLink]);

  const favoriteMutation = useMutation({
    mutationFn: (isFavorite: boolean) =>
      apiRequest<Recipe>(`/api/recipes/${recipeId}`, { method: "PATCH", body: JSON.stringify({ isFavorite }) }),
    onMutate: async (isFavorite: boolean) => {
      queryClient.setQueryData<Recipe | undefined>(["recipes", recipeId], (prev: Recipe | undefined) =>
        prev ? { ...prev, isFavorite } : prev
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
    },
  });

  if (!recipe) return null;

  const mealType: MealType | null = recipe.mealType;
  const tint = mealType ? colors[mealType] : colors.accent;
  const icon = mealType ? MEAL_ICON[mealType] : "restaurant";
  const ratio = servings ? servings / recipe.servings : 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={styles.hero} />
      ) : (
        <View style={[styles.hero, styles.heroFallback, { backgroundColor: tint + "1A" }]}>
          <Ionicons name={icon} size={40} color={tint} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{recipe.name}</Text>
          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => favoriteMutation.mutate(!recipe.isFavorite)}
          >
            <Ionicons
              name={recipe.isFavorite ? "star" : "star-outline"}
              size={24}
              color={recipe.isFavorite ? colors.breakfast : colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          {recipe.prepTimeMinutes ? (
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.metaChipText}>{recipe.prepTimeMinutes} min</Text>
            </View>
          ) : null}
          {recipe.tags.map((tag: string) => (
            <View key={tag} style={styles.metaChip}>
              <Text style={styles.metaChipText}>{tag}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, shadow]}>
          <View style={styles.servingsRow}>
            <Text style={styles.sectionLabel}>SERVINGS</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setServings((s) => Math.max(1, (s ?? recipe.servings) - 1))}
              >
                <Ionicons name="remove" size={16} color={colors.accentDark} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{servings ?? recipe.servings}</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setServings((s) => Math.min(50, (s ?? recipe.servings) + 1))}
              >
                <Ionicons name="add" size={16} color={colors.accentDark} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>INGREDIENTS</Text>
          {recipe.ingredients.length === 0 ? (
            <Text style={styles.emptyText}>No ingredients listed</Text>
          ) : (
            recipe.ingredients.map((ing: RecipeIngredient, i: number) => (
              <View key={i} style={styles.ingredientRow}>
                <View style={styles.dot} />
                <Text style={styles.ingredientName}>{ing.name}</Text>
                <Text style={styles.ingredientQty}>{scaleQuantity(ing.quantity, ratio)}</Text>
              </View>
            ))
          )}
        </View>

        {recipe.notes ? (
          <View style={[styles.card, shadow]}>
            <Text style={styles.sectionLabel}>NOTES</Text>
            <Text style={styles.notesText}>{recipe.notes}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    editLink: { color: colors.accentDark, fontSize: 15, fontWeight: "700" },

    hero: { width: "100%", height: 220 },
    heroFallback: { justifyContent: "center", alignItems: "center" },

    body: { padding: spacing.md },
    titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
    title: { ...type.hero, color: colors.textPrimary, flex: 1 },

    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.sm, marginBottom: spacing.md },
    metaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radii.full,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    metaChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },

    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    sectionLabel: { ...type.label, color: colors.textMuted },

    servingsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    stepperButton: {
      width: 30,
      height: 30,
      borderRadius: radii.full,
      backgroundColor: colors.accentSoft,
      justifyContent: "center",
      alignItems: "center",
    },
    stepperValue: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, minWidth: 20, textAlign: "center" },

    emptyText: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm },
    ingredientRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 8 },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent },
    ingredientName: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: "500" },
    ingredientQty: { fontSize: 14, color: colors.textSecondary, fontWeight: "600" },

    notesText: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 20 },
  });
