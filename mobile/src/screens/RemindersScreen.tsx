import { useEffect, useMemo, useState } from "react";
import { View, Text, Switch, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import { apiRequest } from "../lib/api";
import { requestNotificationPermission, scheduleCustomReminder, cancelCustomReminder } from "../lib/notifications";
import { useColors, radii, spacing, type, type ThemeColors } from "../theme";
import type { Reminder, InsertReminder } from "../lib/types";

function formatTime(hour: number, minute: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

const MINUTE_STEP = 5;

export default function RemindersScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => apiRequest<Reminder[]>("/api/reminders"),
  });

  // Reminders don't survive a reinstall any more than the meal-plan one
  // does — re-arm every enabled one whenever the list loads.
  useEffect(() => {
    reminders?.forEach((r: Reminder) => {
      if (r.enabled) scheduleCustomReminder(r);
    });
  }, [reminders]);

  const createMutation = useMutation({
    mutationFn: (data: InsertReminder) => apiRequest<Reminder>("/api/reminders", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: async (reminder) => {
      await scheduleCustomReminder(reminder);
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      setIsAdding(false);
    },
    onError: (error: Error) => Alert.alert("Could not add reminder", error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiRequest<Reminder>(`/api/reminders/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    onSuccess: (reminder) => {
      if (reminder.enabled) scheduleCustomReminder(reminder);
      else cancelCustomReminder(reminder.id);
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error: Error) => Alert.alert("Could not update reminder", error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/api/reminders/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      cancelCustomReminder(id);
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
    onError: (error: Error) => Alert.alert("Could not remove reminder", error.message),
  });

  async function handleCreate(data: InsertReminder) {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert("Permission needed", "Enable notifications for KitchenPlanner in your phone's settings to add reminders.");
      return;
    }
    createMutation.mutate(data);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reminders ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={(reminders?.length ?? 0) > 0 ? styles.listContent : styles.listContentEmpty}
        ListHeaderComponent={
          <View>
            <Text style={styles.subtitle}>Anything you want a nudge for — take a pill, water the plants, anything.</Text>
            {isAdding ? (
              <AddReminderForm
                colors={colors}
                styles={styles}
                onCancel={() => setIsAdding(false)}
                onSave={handleCreate}
                isSaving={createMutation.isPending}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="alarm-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No reminders yet</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add one</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.reminderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderTitle}>{item.title}</Text>
              <Text style={styles.reminderTime}>{formatTime(item.hour, item.minute)}</Text>
            </View>
            <Switch
              value={item.enabled}
              onValueChange={(enabled) => toggleMutation.mutate({ id: item.id, enabled })}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
            <TouchableOpacity onPress={() => deleteMutation.mutate(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      />

      {!isAdding ? (
        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setIsAdding(true)}>
          <Ionicons name="add" size={28} color={colors.white} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function AddReminderForm({
  colors,
  styles,
  onCancel,
  onSave,
  isSaving,
}: {
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  onCancel: () => void;
  onSave: (data: InsertReminder) => void;
  isSaving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [hour12, setHour12] = useState(6);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  function adjustHour(delta: number) {
    setHour12((h) => ((h - 1 + delta + 12) % 12) + 1);
  }

  function adjustMinute(delta: number) {
    setMinute((m) => (m + delta * MINUTE_STEP + 60) % 60);
  }

  function handleSave() {
    if (!title.trim()) {
      Alert.alert("Add a title for this reminder");
      return;
    }
    let hour24 = hour12 % 12;
    if (period === "PM") hour24 += 12;
    onSave({ title: title.trim(), hour: hour24, minute, enabled: true });
  }

  return (
    <View style={styles.addForm}>
      <TextInput
        style={styles.addFormInput}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Take pill, water the plants…"
        placeholderTextColor={colors.textMuted}
        autoFocus
      />

      <View style={styles.timePicker}>
        <View style={styles.timeStepper}>
          <TouchableOpacity style={styles.stepperButton} onPress={() => adjustHour(-1)}>
            <Ionicons name="remove" size={16} color={colors.accentDark} />
          </TouchableOpacity>
          <Text style={styles.timeStepperValue}>{hour12}</Text>
          <TouchableOpacity style={styles.stepperButton} onPress={() => adjustHour(1)}>
            <Ionicons name="add" size={16} color={colors.accentDark} />
          </TouchableOpacity>
        </View>
        <Text style={styles.timeColon}>:</Text>
        <View style={styles.timeStepper}>
          <TouchableOpacity style={styles.stepperButton} onPress={() => adjustMinute(-1)}>
            <Ionicons name="remove" size={16} color={colors.accentDark} />
          </TouchableOpacity>
          <Text style={styles.timeStepperValue}>{String(minute).padStart(2, "0")}</Text>
          <TouchableOpacity style={styles.stepperButton} onPress={() => adjustMinute(1)}>
            <Ionicons name="add" size={16} color={colors.accentDark} />
          </TouchableOpacity>
        </View>
        <View style={styles.periodToggle}>
          {(["AM", "PM"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodOption, period === p && styles.periodOptionActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodOptionText, period === p && styles.periodOptionTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.addFormActions}>
        <TouchableOpacity style={styles.addFormCancel} onPress={onCancel}>
          <Text style={styles.addFormCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addFormSave} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.addFormSaveText}>{isSaving ? "Saving…" : "Save reminder"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    subtitle: { fontSize: 13, color: colors.textSecondary, padding: spacing.md, paddingBottom: spacing.sm },

    listContent: { paddingHorizontal: spacing.md, paddingBottom: 96 },
    listContentEmpty: { flexGrow: 1, paddingHorizontal: spacing.md },
    emptyState: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.sm, paddingTop: spacing.xl },
    emptyText: { ...type.title, color: colors.textPrimary },
    emptySubtext: { fontSize: 13, color: colors.textSecondary, textAlign: "center" },

    reminderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reminderTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    reminderTime: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

    addForm: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: spacing.sm,
    },
    addFormInput: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.textPrimary,
    },
    timePicker: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    timeStepper: { flexDirection: "row", alignItems: "center", gap: 6 },
    stepperButton: {
      width: 30,
      height: 30,
      borderRadius: radii.full,
      backgroundColor: colors.accentSoft,
      justifyContent: "center",
      alignItems: "center",
    },
    timeStepperValue: { fontSize: 17, fontWeight: "700", color: colors.textPrimary, minWidth: 24, textAlign: "center" },
    timeColon: { fontSize: 17, fontWeight: "700", color: colors.textMuted },
    periodToggle: { flexDirection: "row", marginLeft: 8, borderRadius: radii.sm, overflow: "hidden", borderWidth: 1, borderColor: colors.border },
    periodOption: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface },
    periodOptionActive: { backgroundColor: colors.accent },
    periodOptionText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    periodOptionTextActive: { color: colors.white },
    addFormActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
    addFormCancel: { flex: 1, alignItems: "center", paddingVertical: 10 },
    addFormCancelText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
    addFormSave: { flex: 2, alignItems: "center", paddingVertical: 10, borderRadius: radii.sm, backgroundColor: colors.accent },
    addFormSaveText: { fontSize: 13, fontWeight: "700", color: colors.white },

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
