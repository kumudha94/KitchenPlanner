import { View, Text, StyleSheet } from "react-native";

export default function PrepLogScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Prep log coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 16, color: "#666" },
});
