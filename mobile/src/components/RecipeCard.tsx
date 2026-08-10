import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Recipe, MealType } from "../lib/types";
import { colors, radii, spacing, shadow } from "../theme";

const MEAL_ICON: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny",
  lunch: "restaurant",
  snack: "cafe",
  dinner: "moon",
};

const MEAL_COLOR: Record<MealType, string> = {
  breakfast: colors.breakfast,
  lunch: colors.lunch,
  snack: colors.snack,
  dinner: colors.dinner,
};

type Props = {
  recipe: Recipe;
  onPress: () => void;
  selected?: boolean;
  elevated?: boolean;
};

export default function RecipeCard({ recipe, onPress, selected, elevated = true }: Props) {
  const tint = recipe.mealType ? MEAL_COLOR[recipe.mealType] : colors.accent;
  const icon = recipe.mealType ? MEAL_ICON[recipe.mealType] : "restaurant";

  return (
    <TouchableOpacity
      style={[styles.card, elevated && shadow, selected && styles.cardSelected]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      {recipe.imageUrl ? (
        <Image source={{ uri: recipe.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: tint + "22" }]}>
          <Ionicons name={icon} size={22} color={tint} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {recipe.name}
        </Text>
        <View style={styles.metaRow}>
          {recipe.prepTimeMinutes ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.metaText}>{recipe.prepTimeMinutes} min</Text>
            </View>
          ) : null}
          {recipe.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      {selected ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  thumb: { width: 48, height: 48, borderRadius: radii.sm, marginRight: spacing.sm },
  thumbFallback: { justifyContent: "center", alignItems: "center" },
  info: { flex: 1, marginRight: spacing.xs },
  name: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 12, color: colors.textSecondary, fontWeight: "500" },
  tag: { backgroundColor: colors.surfaceAlt, borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
});
