import { useRouter } from "expo-router";

/**
 * Закрытие экрана, которое срабатывает всегда.
 *
 * `router.back()` молча ничего не делает, когда возвращаться некуда — а так
 * бывает не только в отладке: по deep link (`budgetapp://category/c-rent`,
 * `budgetapp://add-transaction`) экран открывается первым в стеке. Тогда
 * крестик и кнопка «назад» переставали работать, и выйти было нельзя.
 * В этом случае уходим на Home.
 */
export function useCloseScreen(): () => void {
  const router = useRouter();

  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };
}

/**
 * Закрыть шит правки вместе с экраном деталей под ним.
 *
 * После удаления возвращаться на детали нечего: там осталась бы запись,
 * которой уже нет. Уходим на два экрана назад — к списку, из которого
 * транзакцию открыли.
 */
export function useCloseTransactionFlow(): () => void {
  const router = useRouter();
  const close = useCloseScreen();

  return () => {
    if (router.canDismiss()) {
      router.dismiss(2);
    } else {
      close();
    }
  };
}
