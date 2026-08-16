import "../global.css";

import { Stack } from "expo-router";
import Head from "expo-router/head";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

import { OnboardingFlow } from "../components/OnboardingFlow";
import { UndoToast } from "../components/UndoToast";
import { colors } from "../constants/theme";
import { StoreProvider, useStore } from "../lib/store";

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

        <FirstRun />
      </View>
    </StoreProvider>
  );
}

/**
 * Первый запуск: онбординг поверх всего приложения.
 *
 * Слоем, а не отдельным маршрутом — так вкладки под ним уже смонтированы и
 * после `Done` показываются сразу, без перехода. Пока база не прочитана,
 * слой держит пустой фон: иначе на долю секунды мелькнул бы интерфейс с
 * нулевым балансом, а следом — онбординг.
 */
function FirstRun() {
  const { ready, onboarded, completeOnboarding } = useStore();

  if (ready && onboarded) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background,
      }}
    >
      {ready ? <OnboardingFlow onDone={completeOnboarding} /> : null}
    </View>
  );
}
