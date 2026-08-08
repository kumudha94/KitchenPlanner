import "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import RecipesScreen from "./src/screens/RecipesScreen";
import PlannerScreen from "./src/screens/PlannerScreen";
import GroceryScreen from "./src/screens/GroceryScreen";
import PrepLogScreen from "./src/screens/PrepLogScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
});

export type TabParamList = {
  Planner: undefined;
  Recipes: undefined;
  Grocery: undefined;
  PrepLog: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "ellipse";
          if (route.name === "Planner") iconName = focused ? "calendar" : "calendar-outline";
          else if (route.name === "Recipes") iconName = focused ? "book" : "book-outline";
          else if (route.name === "Grocery") iconName = focused ? "cart" : "cart-outline";
          else if (route.name === "PrepLog") iconName = focused ? "journal" : "journal-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#2E7D32",
        headerStyle: { backgroundColor: "#2E7D32" },
        headerTintColor: "#fff",
      })}
    >
      <Tab.Screen name="Planner" component={PlannerScreen} options={{ title: "Planner" }} />
      <Tab.Screen name="Recipes" component={RecipesScreen} options={{ title: "Recipes" }} />
      <Tab.Screen name="Grocery" component={GroceryScreen} options={{ title: "Grocery" }} />
      <Tab.Screen name="PrepLog" component={PrepLogScreen} options={{ title: "Prep Log" }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer>
            <TabNavigator />
          </NavigationContainer>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
