import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from "react-native";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { Recipe } from "../lib/types";
import type { RecipesStackParamList } from "../../App";
import { colors, radii, spacing } from "../theme";
import RecipeCard from "../components/RecipeCard";

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

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes ?? [];
    const q = search.trim().toLowerCase();
    return (recipes ?? []).filter(
      (r: Recipe) => r.name.toLowerCase().includes(q) || r.tags.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [recipes, search]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading recipes…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {recipes?.length ? (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search your recipes…"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={filtered.length ? styles.listContent : styles.listContentEmpty}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="book-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>{recipes?.length ? "No matches" : "No recipes yet"}</Text>
            <Text style={styles.emptySubtext}>
              {recipes?.length ? "Try a different search" : "Tap the + button to add your first one"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RecipeCard recipe={item} onPress={() => navigation.navigate("AddEditRecipe", { recipeId: item.id })} />
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
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  listContent: { padding: spacing.md, paddingBottom: 96 },
  listContentEmpty: { flexGrow: 1, padding: spacing.md },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: colors.accentDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
