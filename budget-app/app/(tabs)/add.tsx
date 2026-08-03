import { Redirect } from "expo-router";

/**
 * За кнопкой [+] нет постоянного экрана — она открывает модалку
 * app/add-transaction.tsx. Файл существует только потому, что Tabs.Screen
 * требует реальный маршрут; кастомный tabBarButton сюда не навигирует.
 * Редирект — страховка на случай прямого перехода по URL в вебе.
 */
export default function AddTabPlaceholder() {
  return <Redirect href="/" />;
}
