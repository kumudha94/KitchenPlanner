import "react-native-gesture-handler";
import { useCallback, useEffect, useState } from "react";
import { useColorScheme, View, Text } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RecipesScreen from "./src/screens/RecipesScreen";
import AddEditRecipeScreen from "./src/screens/AddEditRecipeScreen";
import PlannerScreen from "./src/screens/PlannerScreen";
import SlotEditorScreen from "./src/screens/SlotEditorScreen";
import type { MealSlot } from "./src/lib/types";
import GroceryScreen from "./src/screens/GroceryScreen";
import PrepLogScreen from "./src/screens/PrepLogScreen";
import { useColors } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

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

export type RecipesStackParamList = {
  RecipesList: undefined;
  AddEditRecipe: { recipeId?: number };
};

const RecipesStack = createNativeStackNavigator<RecipesStackParamList>();

function RecipesStackNavigator() {
  const colors = useColors();
  return (
    <RecipesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
      }}
    >
      <RecipesStack.Screen name="RecipesList" component={RecipesScreen} options={{ title: "Recipes" }} />
      <RecipesStack.Screen name="AddEditRecipe" component={AddEditRecipeScreen} />
    </RecipesStack.Navigator>
  );
}

export type PlannerStackParamList = {
  PlannerWeek: undefined;
  SlotEditor: { date: string; slot: MealSlot; recipeId?: number | null; note?: string | null };
};

const PlannerStack = createNativeStackNavigator<PlannerStackParamList>();

function PlannerStackNavigator() {
  const colors = useColors();
  return (
    <PlannerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
      }}
    >
      <PlannerStack.Screen name="PlannerWeek" component={PlannerScreen} options={{ headerShown: false }} />
      <PlannerStack.Screen
        name="SlotEditor"
        component={SlotEditorScreen}
        options={{ presentation: "modal" }}
      />
    </PlannerStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  const colors = useColors();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "ellipse";
          if (route.name === "Planner") iconName = focused ? "today" : "today-outline";
          else if (route.name === "Recipes") iconName = focused ? "book" : "book-outline";
          else if (route.name === "Grocery") iconName = focused ? "cart" : "cart-outline";
          else if (route.name === "PrepLog") iconName = focused ? "flame" : "flame-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
      })}
    >
      <Tab.Screen name="Planner" component={PlannerStackNavigator} options={{ title: "Planner", headerShown: false }} />
      <Tab.Screen name="Recipes" component={RecipesStackNavigator} options={{ title: "Recipes", headerShown: false }} />
      <Tab.Screen name="Grocery" component={GroceryScreen} options={{ title: "Grocery" }} />
      <Tab.Screen name="PrepLog" component={PrepLogScreen} options={{ title: "Prep Log" }} />
    </Tab.Navigator>
  );
}

// TEMPORARY diagnostic overlay — remove once the icon-rendering issue is
// confirmed fixed on a real device. Reports ground truth from the device
// itself since no emulator/device log access is available in this
// environment: what useFonts() returned, what a direct Font.loadAsync()
// call does (with its actual error, if any), and what Font.isLoaded()
// reports for the exact key @expo/vector-icons checks internally.
function FontDebugBadge({
  fontsLoaded,
  fontError,
}: {
  fontsLoaded: boolean;
  fontError: Error | null | undefined;
}) {
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualDone, setManualDone] = useState(false);
  const [isLoadedResult, setIsLoadedResult] = useState<boolean | null>(null);

  useEffect(() => {
    Font.loadAsync({
      ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
    })
      .then(() => setManualDone(true))
      .catch((e: Error) => setManualError(e?.message || String(e)))
      .finally(() => setIsLoadedResult(Font.isLoaded("ionicons")));
  }, []);

  return (
    <View
      style={{
        position: "absolute",
        top: 40,
        left: 8,
        right: 8,
        backgroundColor: "#000000dd",
        padding: 10,
        borderRadius: 8,
        zIndex: 9999,
      }}
      pointerEvents="none"
    >
      <Text style={{ color: "#fff", fontSize: 11, fontFamily: undefined }}>
        useFonts: loaded={String(fontsLoaded)} error={fontError ? fontError.message : "none"}
        {"\n"}
        manual loadAsync: done={String(manualDone)} error={manualError ?? "none"}
        {"\n"}
        Font.isLoaded('ionicons')={String(isLoadedResult)}
      </Text>
    </View>
  );
}

export default function App() {
  const colors = useColors();
  const scheme = useColorScheme();
  // @expo/vector-icons registers Ionicons under the lowercase family name
  // "ionicons" (see createIconSet(glyphMap, "ionicons", font) in its source),
  // and Font.isLoaded() checks that exact lowercase key. Loading it
  // explicitly under that key here (Ionicons.font is already shaped this
  // way internally, but being explicit removes any doubt).
  const [fontsLoaded, fontError] = useFonts({
    ionicons: require("@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const navBase = scheme === "dark" ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...navBase,
    colors: {
      ...navBase.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer theme={navigationTheme}>
            <TabNavigator />
          </NavigationContainer>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </QueryClientProvider>
      <FontDebugBadge fontsLoaded={fontsLoaded} fontError={fontError} />
    </GestureHandlerRootView>
  );
}
