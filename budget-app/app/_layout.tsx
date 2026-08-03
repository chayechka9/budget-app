import "../global.css";

import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";

import { navigationScreenOptions } from "../components/TabBar";

export default function RootLayout() {
  return (
    <>
      {/* Заголовок вкладки браузера. На нативе Head — no-op. */}
      <Head>
        <title>Budget App</title>
      </Head>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: navigationScreenOptions.headerStyle,
          headerTitleStyle: navigationScreenOptions.headerTitleStyle,
          headerTintColor: navigationScreenOptions.headerTintColor,
          headerShadowVisible: false,
        }}
      >
        {/* title нужен даже при скрытом хедере: iOS берёт его как подпись
            кнопки «назад» на push-экранах, иначе там оказывается «(tabs)». */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Home" }} />
        <Stack.Screen name="transactions" options={{ title: "All transactions" }} />
        <Stack.Screen
          name="add-transaction"
          options={{
            // Bottom sheet: экран под ним остаётся видимым и затемняется.
            // Шапку рисует сам шит — своя полоска-индикатор и крестик.
            presentation: "transparentModal",
            animation: "fade",
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
