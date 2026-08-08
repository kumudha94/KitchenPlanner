import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../lib/api";
import type { Recipe } from "../lib/types";
import type { RecipesStackParamList } from "../../App";

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
        <Text>Loading recipes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={recipes ?? []}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No recipes yet — add your first one</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("AddEditRecipe", { recipeId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              {item.mealType ? <Text style={styles.rowSubtitle}>{item.mealType}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("AddEditRecipe", {})}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyText: { fontSize: 15, color: "#888", textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowSubtitle: { fontSize: 13, color: "#888", marginTop: 2, textTransform: "capitalize" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2E7D32",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
});
