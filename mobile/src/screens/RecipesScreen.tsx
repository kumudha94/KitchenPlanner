import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet, RefreshControl, ScrollView } from "react-native";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { Recipe } from "../lib/types";
import type { RecipesStackParamList } from "../../App";
import { useColors, radii, spacing, type ThemeColors } from "../theme";
import RecipeCard from "../components/RecipeCard";

type Props = NativeStackScreenProps<RecipesStackParamList, "RecipesList">;

export default function RecipesScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const {
    data: recipes,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["recipes"],
    queryFn: () => apiRequest<Recipe[]>("/api/recipes"),
  });

  const { data: recentlyUsed } = useQuery({
    queryKey: ["recipes", "recently-used"],
    queryFn: () => apiRequest<Recipe[]>("/api/recipes/recently-used?limit=8"),
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: number; isFavorite: boolean }) =>
      apiRequest<Recipe>(`/api/recipes/${id}`, { method: "PATCH", body: JSON.stringify({ isFavorite }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipes"] }),
  });

  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    (recipes ?? []).forEach((r: Recipe) => r.tags.forEach((t: string) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const filtered = useMemo(() => {
    let list: Recipe[] = recipes ?? [];
    if (favoritesOnly) list = list.filter((r: Recipe) => r.isFavorite);
    if (activeTag) list = list.filter((r: Recipe) => r.tags.includes(activeTag));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r: Recipe) => r.name.toLowerCase().includes(q) || r.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [recipes, search, activeTag, favoritesOnly]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading recipes…</Text>
      </View>
    );
  }

  const showFilters = (recipes?.length ?? 0) > 0;

  return (
    <View style={styles.container}>
      {showFilters ? (
        <>
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.md }}
          >
            <TouchableOpacity
              style={[styles.filterChip, favoritesOnly && styles.filterChipActive]}
              onPress={() => setFavoritesOnly((v) => !v)}
            >
              <Ionicons name="star" size={12} color={favoritesOnly ? colors.white : colors.breakfast} />
              <Text style={[styles.filterChipText, favoritesOnly && styles.filterChipTextActive]}>Favorites</Text>
            </TouchableOpacity>
            {allTags.map((tag) => {
              const active = activeTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveTag(active ? null : tag)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {recentlyUsed && recentlyUsed.length > 0 && !search.trim() && !activeTag && !favoritesOnly ? (
            <View style={styles.recentSection}>
              <Text style={styles.recentLabel}>RECENTLY COOKED</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: spacing.md }}>
                {recentlyUsed.map((r: Recipe) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.recentCard}
                    onPress={() => navigation.navigate("RecipeDetail", { recipeId: r.id })}
                  >
                    {r.imageUrl ? (
                      <Image source={{ uri: r.imageUrl }} style={styles.recentThumb} />
                    ) : (
                      <View style={[styles.recentThumb, styles.recentThumbFallback]}>
                        <Ionicons name="restaurant" size={18} color={colors.accent} />
                      </View>
                    )}
                    <Text style={styles.recentName} numberOfLines={1}>
                      {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </>
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
              {recipes?.length ? "Try a different search or filter" : "Tap the + button to add your first one"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            onPress={() => navigation.navigate("RecipeDetail", { recipeId: item.id })}
            onToggleFavorite={() => favoriteMutation.mutate({ id: item.id, isFavorite: !item.isFavorite })}
          />
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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

  filterRow: { marginTop: spacing.sm, flexGrow: 0 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceAlt,
  },
  filterChipActive: { backgroundColor: colors.accent },
  filterChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  filterChipTextActive: { color: colors.white },

  recentSection: { marginTop: spacing.md },
  recentLabel: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.5, color: colors.textMuted, marginBottom: 8, marginLeft: spacing.md },
  recentCard: { width: 84, alignItems: "center" },
  recentThumb: { width: 64, height: 64, borderRadius: radii.full, marginBottom: 6 },
  recentThumbFallback: { backgroundColor: colors.accentSoft, justifyContent: "center", alignItems: "center" },
  recentName: { fontSize: 11, fontWeight: "600", color: colors.textPrimary, textAlign: "center" },

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
