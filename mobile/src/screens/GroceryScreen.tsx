import { View, Text, StyleSheet } from "react-native";

export default function GroceryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Grocery lists coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontSize: 16, color: "#666" },
});
