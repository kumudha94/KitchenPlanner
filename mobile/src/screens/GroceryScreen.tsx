import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiRequest } from "../lib/api";
import type { GroceryItem } from "../lib/types";
import { useColors, radii, spacing, type, type ThemeColors } from "../theme";

export default function GroceryScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["grocery"],
    queryFn: () => apiRequest<GroceryItem[]>("/api/grocery"),
  });

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  const addMutation = useMutation({
    mutationFn: () =>
      apiRequest<GroceryItem>("/api/grocery", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), quantity: quantity.trim() || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery"] });
      setName("");
      setQuantity("");
    },
    onError: (error: Error) => Alert.alert("Could not add item", error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, checked }: { id: number; checked: boolean }) =>
      apiRequest<GroceryItem>(`/api/grocery/${id}`, { method: "PATCH", body: JSON.stringify({ checked }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grocery"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/api/grocery/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grocery"] }),
  });

  const clearCheckedMutation = useMutation({
    mutationFn: () => apiRequest<{ cleared: number }>("/api/grocery/checked", { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["grocery"] }),
  });

  const fromPlanMutation = useMutation({
    mutationFn: () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const start = format(weekStart, "yyyy-MM-dd");
      const end = format(addDays(weekStart, 6), "yyyy-MM-dd");
      return apiRequest<GroceryItem[]>(`/api/grocery/from-plan?start=${start}&end=${end}`, { method: "POST" });
    },
    onSuccess: (added) => {
      queryClient.invalidateQueries({ queryKey: ["grocery"] });
      if (added.length === 0) {
        Alert.alert("Nothing new", "Everything from this week's plan is already on your list.");
      }
    },
    onError: (error: Error) => Alert.alert("Could not generate list", error.message),
  });

  const hasChecked = items?.some((i: GroceryItem) => i.checked);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.planButton}
        activeOpacity={0.85}
        onPress={() => fromPlanMutation.mutate()}
        disabled={fromPlanMutation.isPending}
      >
        <Ionicons name="sparkles" size={16} color={colors.white} />
        <Text style={styles.planButtonText}>
          {fromPlanMutation.isPending ? "Adding…" : "Add ingredients from this week's plan"}
        </Text>
      </TouchableOpacity>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          value={name}
          onChangeText={setName}
          placeholder="Add an item…"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => name.trim() && addMutation.mutate()}
          returnKeyType="done"
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Qty"
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => name.trim() && addMutation.mutate()}
          disabled={!name.trim() || addMutation.isPending}
        >
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading…</Text>
      ) : (
        <FlatList
          data={items ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={items?.length ? styles.listContent : styles.listContentEmpty}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cart-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>Your list is empty</Text>
              <Text style={styles.emptySubtext}>Add items above, or pull them in from this week's plan</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <TouchableOpacity
                style={[styles.checkbox, item.checked && styles.checkboxChecked]}
                onPress={() => toggleMutation.mutate({ id: item.id, checked: !item.checked })}
              >
                {item.checked ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>{item.name}</Text>
                {item.quantity ? <Text style={styles.itemQuantity}>{item.quantity}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => deleteMutation.mutate(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
          ListFooterComponent={
            hasChecked ? (
              <TouchableOpacity style={styles.clearButton} onPress={() => clearCheckedMutation.mutate()}>
                <Text style={styles.clearButtonText}>Clear checked items</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
    loadingText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xl },

    planButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.accent,
      borderRadius: radii.sm,
      paddingVertical: 12,
      marginBottom: spacing.md,
    },
    planButtonText: { color: colors.white, fontWeight: "700", fontSize: 14 },

    addRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
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
    addButton: {
      width: 42,
      borderRadius: radii.sm,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
    },

    listContent: { paddingBottom: 40 },
    listContentEmpty: { flexGrow: 1 },
    emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.sm, paddingTop: spacing.xl },
    emptyText: { ...type.title, color: colors.textPrimary },
    emptySubtext: { fontSize: 13, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.lg },

    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 12,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: radii.full,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
    itemName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    itemNameChecked: { textDecorationLine: "line-through", color: colors.textMuted },
    itemQuantity: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

    clearButton: { alignItems: "center", paddingVertical: spacing.sm, marginTop: spacing.xs },
    clearButtonText: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  });
