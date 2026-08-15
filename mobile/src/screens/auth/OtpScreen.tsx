import { useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { requestOtp, verifyOtp } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useColors, radii, spacing, type, type ThemeColors } from "../../theme";
import type { RootStackParamList } from "../../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Otp">;

export default function OtpScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { login } = useAuth();
  const [code, setCode] = useState("");

  const verifyMutation = useMutation({
    mutationFn: () => verifyOtp(email, code.trim()),
    onSuccess: async (result) => {
      await login(result.accessToken, result.refreshToken, result.user);
      navigation.navigate("Tabs");
    },
    onError: (error: Error) => Alert.alert("Could not verify code", error.message),
  });

  const resendMutation = useMutation({
    mutationFn: () => requestOtp(email),
    onSuccess: () => Alert.alert("Code sent", `A new code was sent to ${email}`),
    onError: (error: Error) => Alert.alert("Could not resend code", error.message),
  });

  function handleSubmit() {
    if (code.trim().length !== 6) {
      Alert.alert("Enter the 6-digit code we sent you");
      return;
    }
    verifyMutation.mutate();
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code we sent to {email}</Text>

      <TextInput
        style={styles.input}
        value={code}
        onChangeText={(v) => setCode(v.replace(/[^0-9]/g, "").slice(0, 6))}
        placeholder="000000"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={6}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
        autoFocus
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={verifyMutation.isPending}>
        <Text style={styles.buttonText}>{verifyMutation.isPending ? "Verifying…" : "Verify"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={() => resendMutation.mutate()} disabled={resendMutation.isPending}>
        <Text style={styles.linkButtonText}>{resendMutation.isPending ? "Sending…" : "Resend code"}</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: "center" },
    title: { ...type.hero, color: colors.textPrimary, textAlign: "center" },
    subtitle: { ...type.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.xl },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.sm,
      paddingHorizontal: 14,
      paddingVertical: 16,
      fontSize: 24,
      letterSpacing: 8,
      textAlign: "center",
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    button: { backgroundColor: colors.accent, borderRadius: radii.sm, paddingVertical: 14, alignItems: "center" },
    buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
    linkButton: { alignItems: "center", paddingVertical: spacing.md },
    linkButtonText: { color: colors.accentDark, fontSize: 14, fontWeight: "600" },
  });
