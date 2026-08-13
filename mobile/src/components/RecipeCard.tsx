import { useMemo } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Recipe, MealType } from "../lib/types";
import { useColors, useShadow, radii, spacing, type ThemeColors } from "../theme";

const MEAL_ICON: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny",
  lunch: "restaurant",
  snack: "cafe",
  dinner: "moon",
};

type Props = {
  recipe: Recipe;
  onPress: () => void;
  selected?: boolean;
  elevated?: boolean;
  onToggleFavorite?: () => void;
};

export default function RecipeCard({ recipe, onPress, selected, elevated = true, onToggleFavorite }: Props) {
  const colors = useColors();
  const shadow = useShadow();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const mealColor: Record<MealType, string> = {
    breakfast: colors.breakfast,
    lunch: colors.lunch,
    snack: colors.snack,
    dinner: colors.dinner,
  };
  const tint = recipe.mealType ? mealColor[recipe.mealType] : colors.accent;
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

      {onToggleFavorite ? (
        <TouchableOpacity onPress={onToggleFavorite} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 4 }}>
          <Ionicons
            name={recipe.isFavorite ? "star" : "star-outline"}
            size={20}
            color={recipe.isFavorite ? colors.breakfast : colors.textMuted}
          />
        </TouchableOpacity>
      ) : null}

      {selected ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
