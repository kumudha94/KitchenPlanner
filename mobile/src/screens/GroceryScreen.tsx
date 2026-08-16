import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, SectionList, StyleSheet, Alert, Modal, Share, ScrollView } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiRequest } from "../lib/api";
import type { GroceryItem, PantryItem, FromPlanResult, GroceryCategory, MoveToPantryInput } from "../lib/types";
import { GROCERY_CATEGORIES } from "../lib/types";
import { useColors, radii, spacing, type, type ThemeColors } from "../theme";

const COPIED_GREEN = "#22C55E";

const CATEGORY_ICON: Record<GroceryCategory, keyof typeof Ionicons.glyphMap> = {
  Produce: "leaf-outline",
  "Dairy & Eggs": "egg-outline",
  "Meat & Seafood": "fish-outline",
  Bakery: "cafe-outline",
  Frozen: "snow-outline",
  Pantry: "archive-outline",
  Other: "ellipsis-horizontal-outline",
};

export default function GroceryScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [view, setView] = useState<"shopping" | "pantry">("shopping");

  return (
    <View style={styles.container}>
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segment, view === "shopping" && styles.segmentActive]}
          onPress={() => setView("shopping")}
        >
          <Ionicons name="cart-outline" size={15} color={view === "shopping" ? colors.white : colors.textSecondary} />
          <Text style={[styles.segmentText, view === "shopping" && styles.segmentTextActive]}>Shopping</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, view === "pantry" && styles.segmentActive]}
          onPress={() => setView("pantry")}
        >
          <Ionicons name="archive-outline" size={15} color={view === "pantry" ? colors.white : colors.textSecondary} />
          <Text style={[styles.segmentText, view === "pantry" && styles.segmentTextActive]}>Pantry</Text>
        </TouchableOpacity>
      </View>

      {view === "shopping" ? (
        <ShoppingView colors={colors} styles={styles} queryClient={queryClient} />
      ) : (
        <PantryView colors={colors} styles={styles} queryClient={queryClient} />
      )}
    </View>
  );
}

type SharedProps = {
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  queryClient: ReturnType<typeof useQueryClient>;
};

function ShoppingView({ colors, styles, queryClient }: SharedProps) {
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

  const [pantryModalItem, setPantryModalItem] = useState<GroceryItem | null>(null);
  const [moveQty, setMoveQty] = useState("");
  const [moveCost, setMoveCost] = useState("");
  const [moveExpiry, setMoveExpiry] = useState("");

  function closePantryModal() {
    setPantryModalItem(null);
    setMoveQty("");
    setMoveCost("");
    setMoveExpiry("");
  }

  const moveToPantryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MoveToPantryInput }) =>
      apiRequest<PantryItem>(`/api/grocery/${id}/move-to-pantry`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery"] });
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      closePantryModal();
    },
    onError: (error: Error) => Alert.alert("Could not move to pantry", error.message),
  });

  function handleCheckboxPress(item: GroceryItem) {
    if (item.checked) {
      toggleMutation.mutate({ id: item.id, checked: false });
      return;
    }
    setMoveQty(item.quantity ?? "");
    setPantryModalItem(item);
  }

  function handleSkip() {
    if (!pantryModalItem) return;
    toggleMutation.mutate({ id: pantryModalItem.id, checked: true });
    closePantryModal();
  }

  function handleSaveToPantry() {
    if (!pantryModalItem) return;
    if (moveExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(moveExpiry)) {
      Alert.alert("Invalid date", "Expiry date must be in YYYY-MM-DD format");
      return;
    }
    const cost = moveCost.trim() ? Number(moveCost) : null;
    if (moveCost.trim() && (cost === null || Number.isNaN(cost))) {
      Alert.alert("Invalid cost", "Cost must be a number");
      return;
    }
    moveToPantryMutation.mutate({
      id: pantryModalItem.id,
      data: {
        quantity: moveQty.trim() || null,
        cost,
        expiryDate: moveExpiry.trim() || null,
      },
    });
  }

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
      return apiRequest<FromPlanResult>(`/api/grocery/from-plan?start=${start}&end=${end}`, { method: "POST" });
    },
    onSuccess: ({ added, skippedInPantry }) => {
      queryClient.invalidateQueries({ queryKey: ["grocery"] });
      if (added.length === 0 && skippedInPantry === 0) {
        Alert.alert("Nothing new", "Everything from this week's plan is already on your list.");
      } else if (added.length === 0 && skippedInPantry > 0) {
        Alert.alert("All set", `You already have everything you need — ${skippedInPantry} item${skippedInPantry === 1 ? "" : "s"} were already in your pantry.`);
      } else if (skippedInPantry > 0) {
        Alert.alert("List updated", `Added ${added.length} item${added.length === 1 ? "" : "s"}. Skipped ${skippedInPantry} already in your pantry.`);
      }
    },
    onError: (error: Error) => Alert.alert("Could not generate list", error.message),
  });

  function handleAdd() {
    if (!name.trim()) {
      Alert.alert("Add at least an item name to add a grocery item");
      return;
    }
    addMutation.mutate();
  }

  const unchecked = useMemo(() => (items ?? []).filter((i: GroceryItem) => !i.checked), [items]);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedShareIds, setSelectedShareIds] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);

  function closeShareModal() {
    setShareModalVisible(false);
    setCopied(false);
  }

  function openShareModal() {
    if (unchecked.length === 0) {
      Alert.alert("Nothing to share", "Your list has no items left to buy.");
      return;
    }
    setSelectedShareIds(new Set(unchecked.map((i: GroceryItem) => i.id)));
    setCopied(false);
    setShareModalVisible(true);
  }

  function toggleShareSelected(id: number) {
    setCopied(false);
    setSelectedShareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildShareText(): string {
    const selected = unchecked.filter((i: GroceryItem) => selectedShareIds.has(i.id));
    const lines = selected.map((i: GroceryItem) => `- ${i.name}${i.quantity ? ` (${i.quantity})` : ""}`);
    return `🛒 Grocery List\n${lines.join("\n")}`;
  }

  async function handleShare() {
    if (selectedShareIds.size === 0) {
      Alert.alert("Nothing selected", "Select at least one item to share.");
      return;
    }
    await Share.share({ message: buildShareText() });
  }

  async function handleCopy() {
    if (selectedShareIds.size === 0) {
      Alert.alert("Nothing selected", "Select at least one item to copy.");
      return;
    }
    await Clipboard.setStringAsync(buildShareText());
    setCopied(true);
  }

  const sections = useMemo(() => {
    const checked = (items ?? []).filter((i: GroceryItem) => i.checked);
    const bySections: { title: string; data: GroceryItem[] }[] = GROCERY_CATEGORIES.map((category) => ({
      title: category as string,
      data: unchecked.filter((i: GroceryItem) => i.category === category),
    })).filter((s) => s.data.length > 0);
    if (checked.length > 0) bySections.push({ title: "Checked", data: checked });
    return bySections;
  }, [items]);

  return (
    <>
      <View style={styles.planRow}>
        <TouchableOpacity
          style={[styles.planButton, { flex: 1 }]}
          activeOpacity={0.85}
          onPress={() => fromPlanMutation.mutate()}
          disabled={fromPlanMutation.isPending}
        >
          <Ionicons name="sparkles" size={16} color={colors.white} />
          <Text style={styles.planButtonText}>
            {fromPlanMutation.isPending ? "Working it out…" : "Smart list from this week's plan"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareIconButton} onPress={openShareModal}>
          <Ionicons name="share-social-outline" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          value={name}
          onChangeText={setName}
          placeholder="Add an item…"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Qty"
          placeholderTextColor={colors.textMuted}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd} disabled={addMutation.isPending}>
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading…</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={sections.length ? styles.listContent : styles.listContentEmpty}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cart-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>Your list is empty</Text>
              <Text style={styles.emptySubtext}>Add items above, or pull them in from this week's plan</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              {section.title !== "Checked" ? (
                <Ionicons name={CATEGORY_ICON[section.title as GroceryCategory]} size={13} color={colors.textMuted} />
              ) : null}
              <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
              {section.title === "Checked" ? (
                <TouchableOpacity onPress={() => clearCheckedMutation.mutate()}>
                  <Text style={styles.clearInlineText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.itemRow}>
              <TouchableOpacity
                style={[styles.checkbox, item.checked && styles.checkboxChecked]}
                onPress={() => handleCheckboxPress(item)}
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
        />
      )}

      <Modal visible={!!pantryModalItem} transparent animationType="fade" onRequestClose={closePantryModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add to Pantry</Text>
            <Text style={styles.modalSubtitle}>{pantryModalItem?.name}</Text>

            <Text style={styles.modalLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={moveQty}
              onChangeText={setMoveQty}
              placeholder="e.g. 2kg"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.modalLabel}>Cost</Text>
            <TextInput
              style={styles.input}
              value={moveCost}
              onChangeText={setMoveCost}
              placeholder="e.g. 4.50"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
            <Text style={styles.modalLabel}>Expiry date</Text>
            <TextInput
              style={styles.input}
              value={moveExpiry}
              onChangeText={setMoveExpiry}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSkipButton} onPress={handleSkip}>
                <Text style={styles.modalSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveToPantry}
                disabled={moveToPantryMutation.isPending}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={shareModalVisible} transparent animationType="fade" onRequestClose={closeShareModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Share list</Text>
            <Text style={styles.modalSubtitle}>Choose what to include</Text>

            <ScrollView style={styles.shareList}>
              {unchecked.map((item: GroceryItem) => {
                const isSelected = selectedShareIds.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.shareItemRow}
                    onPress={() => toggleShareSelected(item.id)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                      {isSelected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                    </View>
                    <Text style={styles.itemName}>
                      {item.name}
                      {item.quantity ? ` (${item.quantity})` : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSkipButton} onPress={handleCopy}>
                <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={16} color={copied ? COPIED_GREEN : colors.textSecondary} />
                <Text style={[styles.modalSkipText, copied && { color: COPIED_GREEN }]}>{copied ? "Copied" : "Copy"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={16} color={colors.white} />
                <Text style={styles.modalSaveText}>Share</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.modalCloseText} onPress={closeShareModal}>
              <Text style={styles.detailsToggleText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

function PantryView({ colors, styles, queryClient }: SharedProps) {
  const { data: items, isLoading } = useQuery({
    queryKey: ["pantry"],
    queryFn: () => apiRequest<PantryItem[]>("/api/pantry"),
  });

  const [name, setName] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [detailQty, setDetailQty] = useState("");
  const [detailCost, setDetailCost] = useState("");
  const [detailExpiry, setDetailExpiry] = useState("");

  const addMutation = useMutation({
    mutationFn: () => {
      const cost = detailCost.trim() ? Number(detailCost) : null;
      return apiRequest<PantryItem>("/api/pantry", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          quantity: detailQty.trim() || null,
          cost,
          expiryDate: detailExpiry.trim() || null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry"] });
      setName("");
      setDetailQty("");
      setDetailCost("");
      setDetailExpiry("");
      setShowDetails(false);
    },
    onError: (error: Error) => Alert.alert("Could not add item", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/api/pantry/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pantry"] }),
  });

  function handleAdd() {
    if (!name.trim()) {
      Alert.alert("Add at least an item name to add it to your pantry");
      return;
    }
    if (detailExpiry.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(detailExpiry.trim())) {
      Alert.alert("Invalid date", "Expiry date must be in YYYY-MM-DD format");
      return;
    }
    if (detailCost.trim() && Number.isNaN(Number(detailCost))) {
      Alert.alert("Invalid cost", "Cost must be a number");
      return;
    }
    addMutation.mutate();
  }

  const sections = useMemo(() => {
    return GROCERY_CATEGORIES.map((category) => ({
      title: category,
      data: (items ?? []).filter((i: PantryItem) => i.category === category),
    })).filter((s) => s.data.length > 0);
  }, [items]);

  return (
    <>
      <Text style={styles.pantryHint}>What you already have at home — Grocery will skip these when building a list from your plan.</Text>
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Paneer, Rice, Ginger…"
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd} disabled={addMutation.isPending}>
          <Ionicons name="add" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.detailsToggle} onPress={() => setShowDetails((v) => !v)}>
        <Ionicons name={showDetails ? "chevron-up" : "chevron-down"} size={13} color={colors.textSecondary} />
        <Text style={styles.detailsToggleText}>{showDetails ? "Hide details" : "Add quantity, cost, expiry…"}</Text>
      </TouchableOpacity>

      {showDetails ? (
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={detailQty}
            onChangeText={setDetailQty}
            placeholder="Qty"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={detailCost}
            onChangeText={setDetailCost}
            placeholder="Cost"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={detailExpiry}
            onChangeText={setDetailExpiry}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      ) : null}

      {isLoading ? (
        <Text style={styles.loadingText}>Loading…</Text>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={sections.length ? styles.listContent : styles.listContentEmpty}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="archive-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>Pantry is empty</Text>
              <Text style={styles.emptySubtext}>Add what you've already got so Grocery knows what to skip</Text>
            </View>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Ionicons name={CATEGORY_ICON[section.title as GroceryCategory]} size={13} color={colors.textMuted} />
              <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const detailParts = [
              item.quantity,
              item.cost != null ? `$${Number(item.cost).toFixed(2)}` : null,
              item.expiryDate ? `exp ${item.expiryDate}` : null,
            ].filter(Boolean);
            return (
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {detailParts.length > 0 ? <Text style={styles.itemQuantity}>{detailParts.join(" · ")}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => deleteMutation.mutate(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
    loadingText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xl },

    segmentRow: { flexDirection: "row", backgroundColor: colors.surfaceAlt, borderRadius: radii.sm, padding: 4, marginBottom: spacing.md, gap: 4 },
    segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: radii.sm - 2 },
    segmentActive: { backgroundColor: colors.accent },
    segmentText: { fontSize: 13, fontWeight: "700", color: colors.textSecondary },
    segmentTextActive: { color: colors.white },

    pantryHint: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.md, lineHeight: 18 },

    planButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.accent,
      borderRadius: radii.sm,
      paddingVertical: 12,
    },
    planButtonText: { color: colors.white, fontWeight: "700", fontSize: 14 },
    planRow: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
    shareIconButton: {
      width: 42,
      borderRadius: radii.sm,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
    },

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

    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm, marginBottom: 6 },
    sectionHeaderText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, color: colors.textMuted, flex: 1 },
    clearInlineText: { fontSize: 12, fontWeight: "700", color: colors.danger },

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

    detailsToggle: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.sm },
    detailsToggleText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },

    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: spacing.lg },
    modalCard: { backgroundColor: colors.surface, borderRadius: radii.sm, padding: spacing.lg, gap: 4 },
    modalTitle: { ...type.title, color: colors.textPrimary },
    modalSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.sm },
    modalLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, marginTop: spacing.sm, marginBottom: 4 },
    modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
    modalSkipButton: {
      flex: 1,
      flexDirection: "row",
      gap: 6,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    modalSkipText: { fontSize: 14, fontWeight: "700", color: colors.textSecondary },
    modalSaveButton: {
      flex: 1,
      flexDirection: "row",
      gap: 6,
      borderRadius: radii.sm,
      backgroundColor: colors.accent,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    modalSaveText: { fontSize: 14, fontWeight: "700", color: colors.white },
    modalCloseText: { alignItems: "center", marginTop: spacing.sm },

    shareList: { maxHeight: 320, marginTop: spacing.sm },
    shareItemRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 8 },
  });
