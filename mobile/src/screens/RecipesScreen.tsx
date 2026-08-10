import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { Recipe } from "../lib/types";
import type { RecipesStackParamList } from "../../App";
import { colors, radii, spacing, shadow } from "../theme";

type Props = NativeStackScreenProps<RecipesStackParamList, "RecipesList">;

export default function RecipesScreen({ navigation }: Props) {
  const {
    data: recipes,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiRequest<Recipe[]>("/api/recipes"),
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading recipes…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={recipes ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={recipes?.length ? styles.listContent : styles.listContentEmpty}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="book-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>No recipes yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first one</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("AddEditRecipe", { recipeId: item.id })}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="restaurant-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              {item.mealType ? <Text style={styles.rowSubtitle}>{item.mealType}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate("AddEditRecipe", {})}
      >
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  loadingText: { fontSize: 15, color: colors.textSecondary },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.textPrimary, marginTop: spacing.md },
  emptySubtext: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs, textAlign: "center" },
  listContent: { padding: spacing.md, paddingBottom: 96 },
  listContentEmpty: { flexGrow: 1, padding: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadow,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  rowSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2, textTransform: "capitalize" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
