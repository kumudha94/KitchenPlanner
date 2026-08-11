import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiRequest } from "../../lib/api";
import { useColors, radii, spacing, type, type ThemeColors } from "../../theme";
import type { AuthStackParamList } from "../../../App";

type Props = NativeStackScreenProps<AuthStackParamList, "EmailEntry">;

export default function EmailEntryScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState("");

  const sendOtpMutation = useMutation({
    mutationFn: () => apiRequest<{ sent: boolean }>("/api/auth/request-otp", { method: "POST", body: JSON.stringify({ email: email.trim() }) }),
    onSuccess: () => navigation.navigate("Otp", { email: email.trim() }),
    onError: (error: Error) => Alert.alert("Could not send code", error.message),
  });

  function handleSubmit() {
    if (!email.trim()) {
      Alert.alert("Enter your email address to continue");
      return;
    }
    sendOtpMutation.mutate();
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="restaurant" size={32} color={colors.accent} />
        </View>
        <Text style={styles.title}>KitchenPlanner</Text>
        <Text style={styles.subtitle}>Enter your email — we'll send you a code to sign in.</Text>
      </View>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={sendOtpMutation.isPending}>
        <Text style={styles.buttonText}>{sendOtpMutation.isPending ? "Sending…" : "Send code"}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: "center" },
    hero: { alignItems: "center", marginBottom: spacing.xl },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: radii.full,
      backgroundColor: colors.accentSoft,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    title: { ...type.hero, color: colors.textPrimary },
    subtitle: { ...type.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs, paddingHorizontal: spacing.md },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: radii.sm,
      paddingVertical: 14,
      alignItems: "center",
    },
    buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  });
