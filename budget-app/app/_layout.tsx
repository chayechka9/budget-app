import "../global.css";

import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";

import { StoreProvider } from "../lib/store";

export default function RootLayout() {
  return (
    <StoreProvider>
      {/* Заголовок вкладки браузера. На нативе Head — no-op. */}
      <Head>
        <title>Budget App</title>
      </Head>
      <StatusBar style="dark" />
      {/* Текстовых хедеров в макете нет ни на одном экране: контент начинается
          сразу, а «назад» на push-экране рисуется круглой кнопкой внутри него. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transactions" />
        <Stack.Screen
          name="add-transaction"
          options={{
            // Bottom sheet: экран под ним остаётся видимым и затемняется.
            // Шапку рисует сам шит — своя полоска-индикатор и крестик.
            presentation: "transparentModal",
            animation: "fade",
          }}
        />
      </Stack>
    </StoreProvider>
  );
}
