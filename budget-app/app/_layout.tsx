import "../global.css";

import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

import { UndoToast } from "../components/UndoToast";
import { StoreProvider } from "../lib/store";

/**
 * Экраны, которые в макете лежат поверх всего и закрываются крестиком.
 * Шапку им рисует `ModalScreen` — он же держит единый паттерн закрытия.
 */
const MODAL = { presentation: "modal" } as const;

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
      <View style={{ flex: 1 }}>
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
          <Stack.Screen name="assign" options={MODAL} />
          <Stack.Screen name="spending" options={MODAL} />
          <Stack.Screen name="wrapped-up" options={MODAL} />
          <Stack.Screen name="category/[id]" options={MODAL} />
          <Stack.Screen name="category-form" options={MODAL} />
          <Stack.Screen name="archived-categories" options={MODAL} />
          <Stack.Screen name="transaction/[id]" options={MODAL} />
        </Stack>

        {/* Поверх стека: удаление закрывает сразу два экрана, и тост должен
            пережить их обоих. */}
        <UndoToast />
      </View>
    </StoreProvider>
  );
}
